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
