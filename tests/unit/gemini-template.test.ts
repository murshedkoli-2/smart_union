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
