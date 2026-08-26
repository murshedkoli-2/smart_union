# AI Studio: AI-Generated Certificate Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a secretary/entrepreneur configure a Google AI Studio (Gemini) API key once, then generate a certificate template's body text + dynamic fields from just a title, template type and language.

**Architecture:** A pure, unit-tested Gemini wrapper (`src/lib/ai/gemini-template.ts`) sits behind one new authenticated API route (`POST /api/ai/generate-template`). Config lives on the existing `SystemSettings` document (masked on every read) with a new admin page as the config "center". The certificate-template create modal gains a template-type field, a Generate button, and a dynamic-fields editor — all client state, saved only on the existing explicit Save action. Along the way, three pre-existing dead spots that stub `dynamic_fields` to `[]` get wired for real, since generation is worthless if the read/write paths throw the result away.

**Tech Stack:** Next.js App Router (existing), Mongoose (existing), `@google/generative-ai` (new dependency, official Google AI Studio SDK), Zod (existing, for request validation), Vitest (existing).

**Spec:** `docs/superpowers/specs/2026-08-26-ai-studio-template-generation-design.md`

## Global Constraints

- No field-level encryption for the API key — store plaintext in `SystemSettings`, mask in every response (spec: Non-goals).
- A masked value read back from the API must never overwrite the real stored key (spec: Data model).
- Generation never auto-saves — it only fills client form state; Save is a separate, existing action (spec: Goals).
- No behavior change for anyone who never touches AI Studio: template create/edit works exactly as before if `ai_studio.enabled` is false (spec: Goals).
- AI/network failures return a normal JSON error response (502), never an unhandled 500 (spec: Error handling summary).
- Editing an existing template keeps today's plain edit form — no AI regeneration wired into edit, only create (spec: Admin UI).

---

### Task 1: Mask/unmask helper for the API key

**Files:**
- Create: `src/lib/utils/mask-secret.ts`
- Test: `tests/unit/mask-secret.test.ts`

**Interfaces:**
- Produces: `maskSecret(value: string): string`, `isMaskedSecret(value: string): boolean` — used by Task 3 (system-settings service) to mask on read and detect a resubmitted mask on write.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mask-secret.test.ts
import { describe, it, expect } from 'vitest'
import { maskSecret, isMaskedSecret } from '@/lib/utils/mask-secret'

describe('maskSecret', () => {
  it('shows only the last 4 characters', () => {
    expect(maskSecret('AIzaSyABCDEFGHIJKLMNOP1234')).toBe('••••1234')
  })

  it('fully masks a short value', () => {
    expect(maskSecret('abc')).toBe('••••')
  })

  it('returns empty string for empty input', () => {
    expect(maskSecret('')).toBe('')
  })
})

describe('isMaskedSecret', () => {
  it('recognizes a masked value', () => {
    expect(isMaskedSecret('••••1234')).toBe(true)
    expect(isMaskedSecret('••••')).toBe(true)
  })

  it('does not treat a real key as masked', () => {
    expect(isMaskedSecret('AIzaSyABCDEFGHIJKLMNOP1234')).toBe(false)
    expect(isMaskedSecret('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mask-secret.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/mask-secret'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/utils/mask-secret.ts
/**
 * Masks a secret for display, e.g. an admin-configured API key.
 *
 * Never derive the real value from the masked one — this is one-way. The
 * caller must keep the real value server-side and only use the mask to
 * detect "the admin didn't change this field" on write.
 */
const MASK_PREFIX = '••••'

export function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return MASK_PREFIX
  return MASK_PREFIX + value.slice(-4)
}

export function isMaskedSecret(value: string): boolean {
  return value.startsWith(MASK_PREFIX)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mask-secret.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/mask-secret.ts tests/unit/mask-secret.test.ts
git commit -m "feat: add mask-secret helper for AI Studio API key display"
```

---

### Task 2: `BadGatewayError` for upstream AI failures

**Files:**
- Modify: `src/lib/utils/errors.ts`

**Interfaces:**
- Produces: `BadGatewayError` class (extends `AppError`, statusCode 502) — used by Task 6's API route to surface Gemini failures.

- [ ] **Step 1: Add the class**

Add after `TooManyRequestsError` in `src/lib/utils/errors.ts`:

```typescript
export class BadGatewayError extends AppError {
  constructor(message = 'Upstream service failed') {
    super(message, 502)
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/errors.ts
git commit -m "feat: add BadGatewayError for upstream service failures"
```

---

### Task 3: Wire `ai_studio` config into SystemSettings (masked read, safe write)

**Files:**
- Modify: `src/models/SystemSettings.ts`
- Modify: `src/services/system-settings.service.ts`
- Test: `tests/unit/system-settings-ai-config.test.ts`

**Interfaces:**
- Consumes: `maskSecret`, `isMaskedSecret` from Task 1.
- Produces: `getAiStudioConfig(): Promise<{ gemini_api_key: string, enabled: boolean }>` (raw, unmasked — server-side only, used by Task 7's route). `getSystemSettings()` and `updateSystemSettings()` gain an `ai_studio` field on their return shape, masked on the `gemini_api_key` sub-field.

- [ ] **Step 1: Add the field to the model**

In `src/models/SystemSettings.ts`, add to `ISystemSettings`:

```typescript
export interface IAiStudioConfig {
  gemini_api_key: string
  enabled: boolean
}
```

Add `ai_studio: IAiStudioConfig` to the `ISystemSettings` interface (after `members`), and to the schema:

```typescript
const AiStudioConfigSchema = new Schema<IAiStudioConfig>(
  {
    gemini_api_key: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
  },
  { _id: false },
)
```

Add `ai_studio: { type: AiStudioConfigSchema, default: () => ({ gemini_api_key: '', enabled: false }) }` to `SystemSettingsSchema`'s field list (after `members`).

- [ ] **Step 2: Write the failing test for the pure merge logic**

The merge logic (task Step 4 below) is extracted as a standalone pure function so it's testable without a DB:

```typescript
// tests/unit/system-settings-ai-config.test.ts
import { describe, it, expect } from 'vitest'
import { resolveAiStudioUpdate } from '@/services/system-settings.service'

describe('resolveAiStudioUpdate', () => {
  const current = { gemini_api_key: 'AIzaSyREALKEY1234', enabled: true }

  it('keeps the current key when the field is omitted', () => {
    expect(resolveAiStudioUpdate(current, undefined)).toEqual(current)
  })

  it('keeps the current key when a masked value is resubmitted', () => {
    const result = resolveAiStudioUpdate(current, { gemini_api_key: '••••1234', enabled: false })
    expect(result).toEqual({ gemini_api_key: 'AIzaSyREALKEY1234', enabled: false })
  })

  it('accepts a real new key', () => {
    const result = resolveAiStudioUpdate(current, { gemini_api_key: 'AIzaSyNEWKEY5678', enabled: true })
    expect(result).toEqual({ gemini_api_key: 'AIzaSyNEWKEY5678', enabled: true })
  })

  it('clears the key when explicitly set to empty string', () => {
    const result = resolveAiStudioUpdate(current, { gemini_api_key: '', enabled: true })
    expect(result).toEqual({ gemini_api_key: '', enabled: true })
  })

  it('defaults enabled to the current value when omitted', () => {
    const result = resolveAiStudioUpdate(current, { gemini_api_key: 'AIzaSyNEWKEY5678' })
    expect(result).toEqual({ gemini_api_key: 'AIzaSyNEWKEY5678', enabled: true })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/system-settings-ai-config.test.ts`
Expected: FAIL — `resolveAiStudioUpdate is not exported`

- [ ] **Step 4: Implement in the service**

In `src/services/system-settings.service.ts`, add the import and the exported pure function, plus wire it into the existing functions:

```typescript
import { maskSecret, isMaskedSecret } from '@/lib/utils/mask-secret'

interface AiStudioConfig {
  gemini_api_key: string
  enabled: boolean
}

/**
 * Pure merge rule for the AI Studio config sub-document: an omitted field
 * keeps its current value, a resubmitted mask is ignored (the admin didn't
 * change it), anything else — including an explicit empty string, which
 * clears the key — replaces it.
 */
export function resolveAiStudioUpdate(
  current: AiStudioConfig,
  incoming: Partial<AiStudioConfig> | undefined,
): AiStudioConfig {
  if (!incoming) return current

  let gemini_api_key = current.gemini_api_key
  if (incoming.gemini_api_key !== undefined && !isMaskedSecret(incoming.gemini_api_key)) {
    gemini_api_key = incoming.gemini_api_key
  }

  const enabled = incoming.enabled !== undefined ? Boolean(incoming.enabled) : current.enabled

  return { gemini_api_key, enabled }
}

const DEFAULT_AI_STUDIO: AiStudioConfig = { gemini_api_key: '', enabled: false }

/** Raw, unmasked config for server-to-server use only — never expose via a route. */
export async function getAiStudioConfig(): Promise<AiStudioConfig> {
  const settings = await SystemSettings.findOne({ key: 'default' }).lean()
  return (settings as unknown as { ai_studio?: AiStudioConfig })?.ai_studio ?? DEFAULT_AI_STUDIO
}
```

In `getSystemSettings()`, add `ai_studio` to both returned shapes (the "found" branch and the "not found" default branch), masking the key:

```typescript
    const aiStudio = (legacySettings.ai_studio as AiStudioConfig | undefined) ?? DEFAULT_AI_STUDIO
    return {
      ...settings,
      // ...existing fields...
      ai_studio: { gemini_api_key: maskSecret(aiStudio.gemini_api_key), enabled: aiStudio.enabled },
    }
```

and in the "not found" default object:

```typescript
    ai_studio: { gemini_api_key: '', enabled: false },
```

In `updateSystemSettings()`, resolve the incoming `ai_studio` against the previous document before building `payload`:

```typescript
  const previous = await SystemSettings.findOne({ key: 'default' }).lean()
  const previousAiStudio = (previous as unknown as { ai_studio?: AiStudioConfig })?.ai_studio ?? DEFAULT_AI_STUDIO
  const nextAiStudio = resolveAiStudioUpdate(
    previousAiStudio,
    body.ai_studio as Partial<AiStudioConfig> | undefined,
  )
```

(Note: `previous` is already fetched later in the existing function for the audit log — move that one existing `findOne` call up to before `payload` is built, and reuse it, rather than querying twice.)

Add `ai_studio: nextAiStudio` to `payload`. The return value from `settings.toObject()` still carries the raw key — mask it before returning from `updateSystemSettings` the same way `getSystemSettings` does, so the PATCH response is also safe to send to the client:

```typescript
  const settingsObj = settings.toObject() as unknown as Record<string, unknown>
  const savedAiStudio = settingsObj.ai_studio as AiStudioConfig
  settingsObj.ai_studio = { gemini_api_key: maskSecret(savedAiStudio.gemini_api_key), enabled: savedAiStudio.enabled }

  return settingsObj
```

(Use this masked `settingsObj` as the function's return value instead of the raw `settings.toObject()`; the audit log write above it still logs the raw `settings.toObject()` for `changes.after`, since audit logs are an internal record, not an API response.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/system-settings-ai-config.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Full regression check**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run --reporter=dot`
Expected: no type errors, no lint errors, all non-DB tests pass (DB integration suites skip if mongod unavailable, same as before this change)

- [ ] **Step 7: Commit**

```bash
git add src/models/SystemSettings.ts src/services/system-settings.service.ts tests/unit/system-settings-ai-config.test.ts
git commit -m "feat: add masked ai_studio config to SystemSettings"
```

---

### Task 4: Fix `dynamic_fields` wiring in certificate templates (create/read/update)

**Files:**
- Modify: `src/lib/utils/validators.ts`
- Modify: `src/services/certificate.service.ts`

**Interfaces:**
- Produces: `DynamicFieldSchema`, `DynamicFieldsSchema` (Zod, exported from `validators.ts`) — used by `createTemplate`/`updateTemplate` here, and by the admin UI's TypeScript types in Task 9.

- [ ] **Step 1: Add the Zod schema**

In `src/lib/utils/validators.ts`, add near `CreateCitizenSchema`:

```typescript
export const DynamicFieldSchema = z.object({
  field_key: z.string().trim().min(1).regex(/^[a-z][a-z0-9_]*$/, 'field_key must be a lowercase snake_case identifier'),
  field_label: z.string().trim().min(1),
  field_type: z.enum(['text', 'date', 'number', 'select']),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  default_value: z.string().optional(),
})

export const DynamicFieldsSchema = z.array(DynamicFieldSchema).default([])
```

- [ ] **Step 2: Fix `listTemplates` and `getTemplateById` to stop discarding real data**

In `src/services/certificate.service.ts`, `listTemplates` (around line 442-446): remove the hardcoded override so the spread's real value survives —

```typescript
    templates: templates.map((template) => ({
      ...template,
      body_template: normalizeCertificateTemplateBody(template.body_template),
    })),
```

(delete the `dynamic_fields: [],` line that follows `body_template` — the leading `...template` spread already carries the real array from the DB).

`getTemplateById` (around line 505-509): same fix —

```typescript
  return {
    ...template,
    body_template: normalizeCertificateTemplateBody(template.body_template),
  }
```

- [ ] **Step 3: Fix `createTemplate` to validate and persist `dynamic_fields`**

Add the import at the top of `certificate.service.ts`:

```typescript
import { CreateCertificateSchema, DynamicFieldsSchema } from '@/lib/utils/validators'
```

In `createTemplate`, after the existing required-field check, validate the incoming `dynamic_fields`:

```typescript
  const dynamicFieldsResult = DynamicFieldsSchema.safeParse(body.dynamic_fields ?? [])
  if (!dynamicFieldsResult.success) {
    throw new ValidationError('Invalid dynamic fields', dynamicFieldsResult.error.flatten().fieldErrors)
  }
```

Replace the hardcoded `dynamic_fields: [],` in the `CertificateTemplate.create({...})` call with:

```typescript
    dynamic_fields: dynamicFieldsResult.data,
```

- [ ] **Step 4: Fix `updateTemplate` — stop nuking `dynamic_fields`/`template_type` after the loop**

`allowedFields` already includes `'dynamic_fields'`, so the existing per-field loop already assigns it correctly when the caller sends it — the bug is purely the two lines directly below the loop that stomp it back to defaults on every single update, whether or not the caller touched them. Add `'template_type'` to `allowedFields`, validate `dynamic_fields` before the loop runs, and delete the two forced-overwrite lines:

```typescript
  const allowedFields = [
    'name', 'language', 'body_template', 'dynamic_fields', 'template_type', 'is_active', 'fee',
  ]
  const body = dto as Record<string, unknown>
  const before = template.toObject()

  if (body.dynamic_fields !== undefined) {
    const dynamicFieldsResult = DynamicFieldsSchema.safeParse(body.dynamic_fields)
    if (!dynamicFieldsResult.success) {
      throw new ValidationError('Invalid dynamic fields', dynamicFieldsResult.error.flatten().fieldErrors)
    }
    body.dynamic_fields = dynamicFieldsResult.data
  }

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      ;(template as unknown as Record<string, unknown>)[field] =
        field === 'body_template'
          ? normalizeCertificateTemplateBody(String(body[field]))
          : field === 'fee'
            ? Math.max(0, Number(body[field]) || 0)
            : body[field]
    }
  }

  if (body.name !== undefined) {
    template.certificate_category = deriveTemplateCategory(String(body.name)) as CertificateTypeCode
  }

  await template.save()
```

(This removes `template.template_type = 'standard'` and `template.dynamic_fields = []` entirely — both were unconditional overwrites that ran after the field loop no matter what the caller sent, silently reverting any `template_type` or `dynamic_fields` value that was just set two lines above, and permanently downgrading any non-`standard` template — e.g. `warish` — back to `standard` on its very first edit.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/validators.ts src/services/certificate.service.ts
git commit -m "fix: stop discarding certificate template dynamic_fields and template_type"
```

---

### Task 5: Gemini template-draft generator (pure validator + SDK call)

**Files:**
- Modify: `package.json` (add `@google/generative-ai`)
- Create: `src/lib/ai/gemini-template.ts`
- Test: `tests/unit/gemini-template.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone module).
- Produces: `generateTemplateDraft(input: TemplateDraftInput): Promise<TemplateDraft>`, `validateTemplateDraft(value: unknown): TemplateDraft` (throws `AiGenerationError`), `AiGenerationError` class, `TemplateDraftInput`/`TemplateDraft` types — used by Task 6's API route.

- [ ] **Step 1: Install the dependency**

Run: `npm install @google/generative-ai`

- [ ] **Step 2: Write the failing test for the pure validator**

`validateTemplateDraft` is the part worth unit testing — it has no network dependency and is exactly where a schema-constrained-but-still-wrong model response gets caught:

```typescript
// tests/unit/gemini-template.test.ts
import { describe, it, expect } from 'vitest'
import { validateTemplateDraft, AiGenerationError } from '@/lib/ai/gemini-template'

describe('validateTemplateDraft', () => {
  it('accepts a well-formed draft', () => {
    const draft = {
      body_template: 'This certifies {{citizen_name}} resides in {{village}}.',
      dynamic_fields: [
        { field_key: 'citizen_name', field_label: 'Citizen Name', field_type: 'text', options: [], required: true },
        { field_key: 'village', field_label: 'Village', field_type: 'text', options: [], required: true },
      ],
    }
    expect(validateTemplateDraft(draft)).toEqual(draft)
  })

  it('rejects a field_key that never appears in body_template', () => {
    const draft = {
      body_template: 'This certifies {{citizen_name}}.',
      dynamic_fields: [
        { field_key: 'citizen_name', field_label: 'Citizen Name', field_type: 'text', options: [], required: true },
        { field_key: 'unused_field', field_label: 'Unused', field_type: 'text', options: [], required: false },
      ],
    }
    expect(() => validateTemplateDraft(draft)).toThrow(AiGenerationError)
  })

  it('rejects an invalid field_type', () => {
    const draft = {
      body_template: '{{amount}}',
      dynamic_fields: [
        { field_key: 'amount', field_label: 'Amount', field_type: 'currency', options: [], required: true },
      ],
    }
    expect(() => validateTemplateDraft(draft)).toThrow(AiGenerationError)
  })

  it('rejects a non-object response', () => {
    expect(() => validateTemplateDraft('not json')).toThrow(AiGenerationError)
  })

  it('rejects an empty body_template', () => {
    expect(() => validateTemplateDraft({ body_template: '', dynamic_fields: [] })).toThrow(AiGenerationError)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/gemini-template.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ai/gemini-template'`

- [ ] **Step 4: Implement**

```typescript
// src/lib/ai/gemini-template.ts
/**
 * AI-assisted certificate template drafting via Google AI Studio (Gemini).
 *
 * The model is constrained to a JSON schema (responseSchema), but a schema
 * constrains shape, not content — it can still return a dynamic_fields entry
 * whose field_key never actually appears in body_template. validateTemplateDraft
 * re-checks the semantics the schema can't express before this ever reaches
 * the admin's screen.
 */
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export class AiGenerationError extends Error {}

export type DynamicFieldType = 'text' | 'date' | 'number' | 'select'

export interface TemplateDraftField {
  field_key: string
  field_label: string
  field_type: DynamicFieldType
  options: string[]
  required: boolean
}

export interface TemplateDraft {
  body_template: string
  dynamic_fields: TemplateDraftField[]
}

export interface TemplateDraftInput {
  title: string
  templateType: 'standard' | 'custom' | 'warish'
  language: 'bn' | 'en'
  apiKey: string
}

const FIELD_TYPES: DynamicFieldType[] = ['text', 'date', 'number', 'select']

/** Re-checks what the response schema can't express: shape AND semantics. */
export function validateTemplateDraft(value: unknown): TemplateDraft {
  if (typeof value !== 'object' || value === null) {
    throw new AiGenerationError('AI response was not a JSON object')
  }
  const obj = value as Record<string, unknown>

  const bodyTemplate = obj.body_template
  if (typeof bodyTemplate !== 'string' || !bodyTemplate.trim()) {
    throw new AiGenerationError('AI response is missing a non-empty body_template')
  }

  const rawFields = obj.dynamic_fields
  if (!Array.isArray(rawFields)) {
    throw new AiGenerationError('AI response is missing a dynamic_fields array')
  }

  const dynamicFields: TemplateDraftField[] = rawFields.map((raw, index) => {
    const field = raw as Record<string, unknown>
    const fieldKey = field.field_key
    const fieldLabel = field.field_label
    const fieldType = field.field_type
    const options = field.options
    const required = field.required

    if (typeof fieldKey !== 'string' || !fieldKey.trim()) {
      throw new AiGenerationError(`dynamic_fields[${index}] is missing field_key`)
    }
    if (typeof fieldLabel !== 'string' || !fieldLabel.trim()) {
      throw new AiGenerationError(`dynamic_fields[${index}] is missing field_label`)
    }
    if (typeof fieldType !== 'string' || !FIELD_TYPES.includes(fieldType as DynamicFieldType)) {
      throw new AiGenerationError(`dynamic_fields[${index}] has an invalid field_type: ${String(fieldType)}`)
    }
    if (!bodyTemplate.includes(`{{${fieldKey}}}`)) {
      throw new AiGenerationError(`dynamic_fields[${index}] ("${fieldKey}") never appears as {{${fieldKey}}} in body_template`)
    }

    return {
      field_key: fieldKey,
      field_label: fieldLabel,
      field_type: fieldType as DynamicFieldType,
      options: Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : [],
      required: Boolean(required),
    }
  })

  return { body_template: bodyTemplate, dynamic_fields: dynamicFields }
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    body_template: { type: SchemaType.STRING },
    dynamic_fields: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          field_key: { type: SchemaType.STRING },
          field_label: { type: SchemaType.STRING },
          field_type: { type: SchemaType.STRING, enum: FIELD_TYPES },
          options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          required: { type: SchemaType.BOOLEAN },
        },
        required: ['field_key', 'field_label', 'field_type', 'options', 'required'],
      },
    },
  },
  required: ['body_template', 'dynamic_fields'],
}

function buildPrompt(input: TemplateDraftInput): string {
  const languageName = input.language === 'bn' ? 'Bangla' : 'English'
  return [
    `Draft a certificate template body for a Union Parishad (local government) document management system.`,
    `Title: "${input.title}"`,
    `Template type: ${input.templateType}`,
    `Write body_template entirely in ${languageName}.`,
    `body_template is the certificate's body text only — no letterhead, no signature block, no certificate number, those are added separately by the system.`,
    `Anywhere a real citizen/case fact belongs (name, address, date, amount, relation, etc.), insert a placeholder in the exact form {{field_key}}, where field_key is a lowercase snake_case identifier.`,
    `For every placeholder used in body_template, list it once in dynamic_fields with a human-readable field_label in ${languageName}, the most fitting field_type (text, date, number, or select), an options array (only non-empty when field_type is select), and whether it is required.`,
    `Every dynamic_fields entry's field_key must appear at least once in body_template as {{field_key}}. Do not invent a field that isn't used, and do not use a placeholder that isn't declared.`,
  ].join('\n')
}

export async function generateTemplateDraft(input: TemplateDraftInput): Promise<TemplateDraft> {
  const genAI = new GoogleGenerativeAI(input.apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  let text: string
  try {
    const result = await model.generateContent(buildPrompt(input))
    text = result.response.text()
  } catch (err) {
    throw new AiGenerationError(err instanceof Error ? err.message : 'Gemini request failed')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new AiGenerationError('Gemini returned invalid JSON')
  }

  return validateTemplateDraft(parsed)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/gemini-template.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Full regression check**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/ai/gemini-template.ts tests/unit/gemini-template.test.ts
git commit -m "feat: add Gemini-backed certificate template draft generator"
```

---

### Task 6: `POST /api/ai/generate-template` route

**Files:**
- Modify: `src/lib/security/rate-limit.ts`
- Create: `src/app/api/ai/generate-template/route.ts`

**Interfaces:**
- Consumes: `getAiStudioConfig` (Task 3), `generateTemplateDraft`, `AiGenerationError` (Task 5), `BadGatewayError` (Task 2).
- Produces: `POST /api/ai/generate-template` — request `{ title, template_type, language }`, response `{ success: true, data: { body_template, dynamic_fields } }` on success.

- [ ] **Step 1: Add the rate limit bucket**

In `src/lib/security/rate-limit.ts`, add to `RATE_LIMITS`:

```typescript
  /** AI template generation — an external paid API call per request. */
  aiGenerate: { limit: 20, windowMs: 60 * 60_000 },
```

- [ ] **Step 2: Write the route**

```typescript
// src/app/api/ai/generate-template/route.ts
import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { withRateLimit } from '@/middleware/rate-limit'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { RATE_LIMITS } from '@/lib/security/rate-limit'
import { PERMISSIONS } from '@/constants/permissions'
import { BadRequestError, BadGatewayError } from '@/lib/utils/errors'
import { getAiStudioConfig } from '@/services/system-settings.service'
import { generateTemplateDraft, AiGenerationError } from '@/lib/ai/gemini-template'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const TEMPLATE_TYPES = ['standard', 'custom', 'warish'] as const
const LANGUAGES = ['bn', 'en'] as const

const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  void _ctx
  const body = await req.json()

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const templateType = body.template_type
  const language = body.language

  if (!title) throw new BadRequestError('title is required')
  if (!TEMPLATE_TYPES.includes(templateType)) {
    throw new BadRequestError(`template_type must be one of: ${TEMPLATE_TYPES.join(', ')}`)
  }
  if (!LANGUAGES.includes(language)) {
    throw new BadRequestError(`language must be one of: ${LANGUAGES.join(', ')}`)
  }

  const aiConfig = await getAiStudioConfig()
  if (!aiConfig.enabled || !aiConfig.gemini_api_key) {
    throw new BadRequestError('AI Studio is not configured — set it up in Admin → AI Studio')
  }

  try {
    const draft = await generateTemplateDraft({
      title,
      templateType,
      language,
      apiKey: aiConfig.gemini_api_key,
    })
    return successResponse(draft)
  } catch (err) {
    if (err instanceof AiGenerationError) {
      throw new BadGatewayError(err.message)
    }
    throw err
  }
}

export const POST = withRateLimit('ai:generate-template', RATE_LIMITS.aiGenerate)(
  withDb(
    authenticate(
      authorize(['secretary', 'entrepreneur'], PERMISSIONS.TEMPLATE_MANAGE)((req, ctx) =>
        postHandler(req, ctx).catch(errorResponse),
      ),
    ),
  ),
)
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/security/rate-limit.ts src/app/api/ai/generate-template/route.ts
git commit -m "feat: add POST /api/ai/generate-template route"
```

---

### Task 7: AI Studio admin settings page

**Files:**
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/bn.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/app/(dashboard)/admin/ai-studio/page.tsx`

**Interfaces:**
- Consumes: `GET /api/system-settings` (returns masked `ai_studio`), `PATCH /api/system-settings` (Task 3).
- Produces: `/admin/ai-studio` page, gated on `PERMISSIONS.SETTINGS_MANAGE`.

- [ ] **Step 1: Add the translation key**

In `src/lib/i18n/en.ts`, add next to `systemSettings: 'System Settings',`:

```typescript
  aiStudio: 'AI Studio',
```

In `src/lib/i18n/bn.ts`, add next to the matching `systemSettings` line:

```typescript
  aiStudio: 'এআই স্টুডিও',
```

- [ ] **Step 2: Add the sidebar link**

In `src/components/layout/Sidebar.tsx`, add next to the `systemSettings` nav item (same admin section array):

```typescript
      { href: '/admin/ai-studio', labelKey: 'aiStudio', icon: '✨', permission: PERMISSIONS.SETTINGS_MANAGE },
```

- [ ] **Step 3: Write the page**

```typescript
// src/app/(dashboard)/admin/ai-studio/page.tsx
'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import RequirePermission from '@/components/auth/RequirePermission'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { PERMISSIONS } from '@/constants/permissions'

interface SystemSettingsResponse {
  ai_studio?: { gemini_api_key: string; enabled: boolean }
}

function AiStudioPageView() {
  const { data, loading, error, refetch } = useApi<SystemSettingsResponse>('/api/system-settings')
  const [enabled, setEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.ai_studio) {
      setEnabled(data.ai_studio.enabled)
      setApiKey(data.ai_studio.gemini_api_key)
    }
  }, [data])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await apiCall('/api/system-settings', {
      method: 'PATCH',
      body: JSON.stringify({ ai_studio: { gemini_api_key: apiKey, enabled } }),
    })

    setSaving(false)
    if (res.ok) {
      toast.success('AI Studio settings updated.')
      refetch()
      return
    }
    const body = await res.json().catch(() => ({}))
    toast.error(body.message ?? 'Failed to update AI Studio settings.')
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <PageHeader title="AI Studio" />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            Configure the Google AI Studio (Gemini) API key used to auto-draft certificate templates. Get a key at{' '}
            <span className="font-mono text-xs">aistudio.google.com/apikey</span>.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ai_studio_enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="ai_studio_enabled" className="text-sm text-gray-700">
              Enable AI-assisted template generation
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave unchanged (shown masked) to keep the current key. Clear the field and save to remove it.
            </p>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function AiStudioPage() {
  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <AiStudioPageView />
    </RequirePermission>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 5: Manual check**

Run: `npm run dev`, sign in as secretary, open `/admin/ai-studio`, toggle enable, paste a test string as the key, Save, reload the page — confirm the field shows a masked value (e.g. `••••` + last 4 chars of what you typed) and the checkbox state persisted.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/en.ts src/lib/i18n/bn.ts src/components/layout/Sidebar.tsx "src/app/(dashboard)/admin/ai-studio/page.tsx"
git commit -m "feat: add AI Studio admin settings page"
```

---

### Task 8: Wire AI generation + dynamic fields editor into the certificate template modal

**Files:**
- Modify: `src/app/(dashboard)/admin/certificate-templates/page.tsx`

**Interfaces:**
- Consumes: `POST /api/ai/generate-template` (Task 6), `GET /api/system-settings` (to read `ai_studio.enabled` for gating), `DynamicFieldSchema` shape (Task 4, mirrored as a local TS type since this is a client component).

- [ ] **Step 1: Extend form state and add the template-type field**

In `src/app/(dashboard)/admin/certificate-templates/page.tsx`, extend `FormState` and `defaultForm`:

```typescript
type TemplateType = 'standard' | 'custom' | 'warish'

interface DynamicField {
  field_key: string
  field_label: string
  field_type: 'text' | 'date' | 'number' | 'select'
  options: string[]
  required: boolean
}

interface FormState {
  name: string
  language: Language
  template_type: TemplateType
  body_template: string
  fee: number
  dynamic_fields: DynamicField[]
}

const defaultForm: FormState = {
  name: '',
  language: 'bn',
  template_type: 'standard',
  body_template: '',
  fee: 0,
  dynamic_fields: [],
}
```

Update `handleOpenEdit` to seed `template_type: template.template_type ?? 'standard'` and `dynamic_fields: template.dynamic_fields ?? []` (extend the `CertificateTemplate` interface at the top of the file with `template_type?: TemplateType` and `dynamic_fields?: DynamicField[]` to match).

Add a `template_type` select to the form, right after the Language select:

```tsx
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Template Type *</label>
            <select
              required
              value={form.template_type}
              onChange={(e) => setForm((current) => ({ ...current, template_type: e.target.value as TemplateType }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
              <option value="warish">Warish</option>
            </select>
          </div>
```

- [ ] **Step 2: Add AI-Studio-enabled check and the Generate button**

Add state and an effect to check whether AI Studio is on:

```typescript
  const [aiEnabled, setAiEnabled] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiCall('/api/system-settings')
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setAiEnabled(Boolean(body?.data?.ai_studio?.enabled))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleGenerate = async () => {
    if (!form.name.trim()) {
      toast.error('Enter a certificate name first.')
      return
    }
    setGenerating(true)
    const res = await apiCall('/api/ai/generate-template', {
      method: 'POST',
      body: JSON.stringify({
        title: form.name,
        template_type: form.template_type,
        language: form.language,
      }),
    })
    setGenerating(false)

    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setForm((current) => ({
        ...current,
        body_template: body.data.body_template,
        dynamic_fields: body.data.dynamic_fields,
      }))
      toast.success('Draft generated — review before saving.')
    } else {
      toast.error(body.message ?? 'Failed to generate template.')
    }
  }
```

Add `useEffect` to the existing `'react'` import at the top of the file.

Place the button next to the Name field's label:

```tsx
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">Certificate Name *</label>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                >
                  {generating ? 'Generating...' : '✨ Generate with AI'}
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => {
                const nextName = e.target.value
                setForm((current) => ({
                  ...current,
                  name: nextName,
                  body_template: applySuggestedText(nextName, current.language, current.body_template),
                }))
              }}
              placeholder="e.g., নাগরিকত্ব সনদ / Citizenship Certificate"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
```

- [ ] **Step 3: Add the dynamic-fields editor**

Add below the "Certificate Plain Text" textarea, before the footer buttons:

```tsx
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">Dynamic Fields</label>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    dynamic_fields: [
                      ...current.dynamic_fields,
                      { field_key: '', field_label: '', field_type: 'text', options: [], required: false },
                    ],
                  }))
                }
                className="text-xs font-medium text-green-700 hover:underline"
              >
                + Add Field
              </button>
            </div>
            <div className="space-y-2">
              {form.dynamic_fields.map((field, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2">
                  <input
                    type="text"
                    value={field.field_key}
                    onChange={(e) => {
                      const value = e.target.value
                      setForm((current) => ({
                        ...current,
                        dynamic_fields: current.dynamic_fields.map((f, i) => (i === index ? { ...f, field_key: value } : f)),
                      }))
                    }}
                    placeholder="field_key"
                    className="w-32 rounded border border-gray-200 px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={field.field_label}
                    onChange={(e) => {
                      const value = e.target.value
                      setForm((current) => ({
                        ...current,
                        dynamic_fields: current.dynamic_fields.map((f, i) => (i === index ? { ...f, field_label: value } : f)),
                      }))
                    }}
                    placeholder="Label"
                    className="w-40 rounded border border-gray-200 px-2 py-1 text-xs"
                  />
                  <select
                    value={field.field_type}
                    onChange={(e) => {
                      const value = e.target.value as DynamicField['field_type']
                      setForm((current) => ({
                        ...current,
                        dynamic_fields: current.dynamic_fields.map((f, i) => (i === index ? { ...f, field_type: value } : f)),
                      }))
                    }}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="text">text</option>
                    <option value="date">date</option>
                    <option value="number">number</option>
                    <option value="select">select</option>
                  </select>
                  {field.field_type === 'select' && (
                    <input
                      type="text"
                      value={field.options.join(', ')}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm((current) => ({
                          ...current,
                          dynamic_fields: current.dynamic_fields.map((f, i) =>
                            i === index ? { ...f, options: value.split(',').map((o) => o.trim()).filter(Boolean) } : f,
                          ),
                        }))
                      }}
                      placeholder="option1, option2"
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  )}
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const value = e.target.checked
                        setForm((current) => ({
                          ...current,
                          dynamic_fields: current.dynamic_fields.map((f, i) => (i === index ? { ...f, required: value } : f)),
                        }))
                      }}
                    />
                    required
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        dynamic_fields: current.dynamic_fields.filter((_, i) => i !== index),
                      }))
                    }
                    className="ml-auto text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {form.dynamic_fields.length === 0 && (
                <p className="text-xs text-gray-400">No dynamic fields yet — add one, or generate with AI.</p>
              )}
            </div>
          </div>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors

- [ ] **Step 5: Manual check**

Run: `npm run dev`. With AI Studio disabled (default), confirm the "New Template" modal opens with no Generate button and works exactly as before (create/edit a template with just name/language/type/text/fee — no dynamic fields required). Then enable AI Studio with a real Gemini key (Task 7's page), open "New Template" again, type a title, click Generate, confirm `body_template` and the dynamic-fields list populate, edit a field by hand, and Save — then reopen the same template in Edit and confirm the dynamic fields you saved are still there (this exercises Task 4's fix).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/certificate-templates/page.tsx"
git commit -m "feat: add AI generation and dynamic fields editor to certificate template modal"
```

---

### Task 9: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Lint**

Run: `npx eslint .`
Expected: no errors

- [ ] **Step 3: Full test suite**

Run: `npx vitest run --reporter=dot`
Expected: all non-DB unit tests pass, including the new `mask-secret`, `system-settings-ai-config`, and `gemini-template` suites; DB integration suites skip if mongod is unavailable in this environment (unchanged from before this feature)

- [ ] **Step 4: Confirm no dead settings-page split**

Run: `npx knip --no-progress 2>&1 | head -60`
Expected: no new unused-export findings introduced by this feature (some pre-existing findings from before this work are fine and out of scope)
