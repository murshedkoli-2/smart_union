# AI Studio: AI-Generated Certificate Templates

Date: 2026-08-26

## Context

The user asked for a "center AI studio" that configures AI for the whole
site, starting with: admin types a certificate title and AI generates the
template (body text + variables). The full "site-wide AI orchestration"
request is too broad and vague to spec in one pass — it names no other
concrete feature. This spec covers the first, concrete sub-project:
AI-assisted certificate template generation, built on a reusable AI config
so future features can plug into the same Google AI Studio (Gemini) key
without re-wiring auth.

`CertificateTemplate.dynamic_fields` already exists on the model but is
dead: `createTemplate`/`updateTemplate` hardcode `dynamic_fields: []` and
the admin UI has no field for it. This work makes it real, driven by AI
generation, with the admin able to hand-edit the result before saving.

## Goals

- A "center" AI Studio settings page where an admin configures the Google
  AI Studio (Gemini) API key and turns the feature on/off.
- In the certificate-template creation flow, an admin enters a title +
  template type + language and gets a generated `body_template` (with
  `{{field_key}}` placeholders) and a matching `dynamic_fields` list, both
  editable before save.
- No behavior change for anyone who never touches AI Studio: existing
  template create/edit flow keeps working exactly as today if the feature
  is off or unconfigured.

## Non-goals

- Any other "AI across the site" feature (help text, report summaries,
  etc.) — explicitly deferred; the config this builds is reusable for that
  later work but no such feature ships here.
- Auto-saving AI output — generation only fills the draft into form state;
  saving the template is still an explicit, separate action.
- Field-level encryption of the API key — this repo has no active
  field-level encryption layer (removed earlier), and reintroducing one
  for a single secretary-only field isn't justified. The key is stored as
  plaintext in `SystemSettings`, masked in every API response and in the
  admin UI.

## Data model

`SystemSettings` gains:

```ts
ai_studio: {
  gemini_api_key: string   // default ''
  enabled: boolean         // default false
}
```

`GET /api/system-settings` masks `gemini_api_key` in its response (e.g.
`••••1234`, last 4 characters only, empty string stays empty). `PATCH
/api/system-settings` only overwrites the stored key when the incoming
value doesn't look like a masked placeholder — i.e. a blank/unchanged
field in the admin form never clobbers the real key with the mask.

`CertificateTemplate.createTemplate` / `updateTemplate` (in
`src/services/certificate.service.ts`) stop hardcoding `dynamic_fields:
[]` and instead validate + accept a `dynamic_fields` array from the
request body, matching the existing `IDynamicField` shape:
`{ field_key, field_label, field_type, options, required, default_value? }`.

## AI generation service

New file `src/lib/ai/gemini-template.ts`, using the official
`@google/generative-ai` SDK (new dependency) — direct provider wiring per
the user's explicit request for the Google AI Studio API.

```ts
interface TemplateDraftInput {
  title: string
  templateType: 'standard' | 'custom' | 'warish'
  language: 'bn' | 'en'
  apiKey: string
}

interface TemplateDraft {
  body_template: string
  dynamic_fields: Array<{
    field_key: string
    field_label: string
    field_type: 'text' | 'date' | 'number' | 'select'
    options: string[]
    required: boolean
  }>
}

function generateTemplateDraft(input: TemplateDraftInput): Promise<TemplateDraft>
```

Uses Gemini's `responseSchema` structured-output mode so the model is
constrained to the shape above — no free-form parsing of prose. The
prompt states the `{{field_key}}` placeholder convention (matching the
substitution already done in `src/lib/utils/certificate-render.ts`) and
requires every `dynamic_fields` entry to appear at least once in
`body_template`.

A thin validator re-checks the parsed JSON against the shape (field keys
are non-empty slugs, `field_type` is one of the four enum values, every
`field_key` appears in `body_template`) before returning it — the model
can still return malformed JSON despite the schema constraint. Throws a
typed `AiGenerationError(message)` on any failure (network, API error,
malformed/invalid output); this is a pure, unit-testable function aside
from the one `fetch`-equivalent call the SDK makes.

## API routes

**`POST /api/ai/generate-template`** (new)
- Body: `{ title: string, template_type: 'standard'|'custom'|'warish', language: 'bn'|'en' }`
- Guard: `authenticate` + `authorize(['secretary','entrepreneur'], 'template.manage')`
- Rate-limited via the existing `withRateLimit` middleware (external paid
  API call, same treatment as other write endpoints)
- Loads `SystemSettings.ai_studio`; if `enabled` is false or
  `gemini_api_key` is empty, responds 400 with a clear message
  ("AI Studio is not configured — set it up in Admin → AI Studio") rather
  than calling the SDK
- On `AiGenerationError`, responds 502 with the error message (still a
  normal JSON error body, not a raw 500)
- On success, returns `{ body_template, dynamic_fields }` — nothing is
  persisted by this route

**`PATCH /api/system-settings`** (existing route, extended)
- Accepts `ai_studio: { gemini_api_key?, enabled? }` in its body
- Same masking rule as the GET side: a value matching the mask pattern is
  ignored, so re-saving the settings form without touching the key field
  doesn't erase it

## Admin UI

**New page**: `src/app/(dashboard)/admin/ai-studio/page.tsx`
- `RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}` (no new
  permission — this is a system setting)
- Added to the admin nav beside "System Settings"
- Fields: enable/disable toggle, API key input (type=password-style
  masking, matching the `••••1234` from the API), Save button using the
  existing `system-settings` PATCH endpoint
- Short inline help text linking out to where to obtain a Google AI
  Studio key (text only, no live external fetch)

**Certificate Templates modal**
(`src/app/(dashboard)/admin/certificate-templates/page.tsx`), for the
**create** flow only (editing an existing template keeps today's plain
edit form — regenerating over real data is out of scope here):
- Add the currently-missing `template_type` select (standard/custom/
  warish) — needed as generation input, and also a real gap in the
  existing form (the service already accepts it, just never sent)
- "✨ Generate with AI" button next to the Name field — disabled with a
  tooltip when AI Studio is off (checked once via the system-settings
  fetch already used elsewhere in the dashboard)
- New **Dynamic Fields** section: a list editor (field_key, field_label,
  field_type select, comma-separated options when type is `select`,
  required checkbox) — empty by default, populated by a successful
  generation, freely editable/removable/addable by hand either way
- Clicking Generate calls `POST /api/ai/generate-template` with the
  current name/template_type/language, fills `body_template` and
  `dynamic_fields` into form state on success, and shows a toast error
  (using the route's message) on failure — no crash, no partial save

## Testing

- Unit tests (no network, no DB) for:
  - The Gemini response validator in `gemini-template.ts`: accepts a
    well-formed draft, rejects a `dynamic_fields` entry whose `field_key`
    never appears in `body_template`, rejects an invalid `field_type`
  - The API-key masking/unmasking logic used by the system-settings
    route: masks on read, ignores a resubmitted mask on write, accepts a
    real new key on write
- No new integration-test infrastructure — route-level
  authentication/authorization follows the existing
  `authenticate(authorize(...))` pattern already exercised by other
  routes' conventions

## Error handling summary

| Failure | Behavior |
|---|---|
| AI Studio disabled / key empty | 400 from `/api/ai/generate-template`, button disabled in UI |
| Gemini API error / network failure | 502 with message, surfaced as a toast; form state untouched |
| Model returns malformed/invalid JSON | Same 502 path — validator catches it before it reaches the client |
| Admin resaves settings without touching key field | Real key preserved, not overwritten with the mask |
