/**
 * AI-assisted certificate template drafting via Google AI Studio (Gemini).
 *
 * The model is constrained to a JSON schema (responseSchema), but a schema
 * constrains shape, not content — it can still return a dynamic_fields entry
 * whose field_key never actually appears in body_template. validateTemplateDraft
 * re-checks the semantics the schema can't express before this ever reaches
 * the admin's screen.
 */
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'

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

const RESPONSE_SCHEMA: Schema = {
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
          field_type: { type: SchemaType.STRING, format: 'enum', enum: FIELD_TYPES },
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
