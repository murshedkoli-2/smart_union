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
