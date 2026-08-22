import { describe, it, expect } from 'vitest'
import { parsePagination, MAX_PAGE_SIZE } from '@/lib/utils/pagination'
import { escapeRegex, containsFilter } from '@/lib/utils/mongo-query'
import { isVerificationToken, generateVerificationToken } from '@/lib/utils/verification-token'
import { hit, RATE_LIMITS } from '@/lib/security/rate-limit'
import { PasswordSchema, CreateAdminSchema, RegisterSchema } from '@/lib/utils/validators'

describe('parsePagination', () => {
  const parse = (qs: string) => parsePagination(new URLSearchParams(qs))

  it('caps limit so a caller cannot request the whole collection', () => {
    expect(parse('limit=999999').limit).toBe(MAX_PAGE_SIZE)
  })

  it('falls back to defaults for junk input', () => {
    expect(parse('page=abc&limit=abc')).toEqual({ page: 1, limit: 20 })
    expect(parse('page=-5&limit=0')).toEqual({ page: 1, limit: 20 })
    expect(parse('')).toEqual({ page: 1, limit: 20 })
  })

  it('honours a valid request', () => {
    expect(parse('page=3&limit=50')).toEqual({ page: 3, limit: 50 })
  })

  it('truncates fractional input rather than producing a fractional skip', () => {
    expect(parse('page=2.7&limit=10.9')).toEqual({ page: 2, limit: 10 })
  })
})

describe('escapeRegex', () => {
  it('neutralises the ReDoS pattern that used to reach the query planner', () => {
    const escaped = escapeRegex('(a+)+$')
    expect(new RegExp(escaped).test('(a+)+$')).toBe(true)
    expect(new RegExp(escaped).test('aaaaaaaa')).toBe(false)
  })

  it('escapes every regex metacharacter', () => {
    for (const char of ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']) {
      expect(new RegExp(escapeRegex(char)).test(char)).toBe(true)
    }
  })

  it('leaves ordinary text matchable', () => {
    expect(new RegExp(escapeRegex('Rahim'), 'i').test('rahim uddin')).toBe(true)
  })
})

describe('containsFilter', () => {
  it('skips blank input so the caller can omit the filter', () => {
    expect(containsFilter('')).toBeUndefined()
    expect(containsFilter('   ')).toBeUndefined()
    expect(containsFilter(undefined)).toBeUndefined()
  })

  it('escapes what it passes to $regex', () => {
    expect(containsFilter('a.b')).toEqual({ $regex: 'a\\.b', $options: 'i' })
  })
})

describe('verification tokens', () => {
  it('produces 32 URL-safe characters', () => {
    const token = generateVerificationToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
  })

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateVerificationToken))
    expect(tokens.size).toBe(500)
  })

  it('rejects sequential certificate numbers, which is the whole point', () => {
    expect(isVerificationToken('BN-CIT-2026-0001')).toBe(false)
    expect(isVerificationToken('')).toBe(false)
    expect(isVerificationToken('short')).toBe(false)
    expect(isVerificationToken(generateVerificationToken())).toBe(true)
  })
})

describe('rate limiter', () => {
  it('allows exactly `limit` requests then refuses', () => {
    const key = `test-bucket-${Math.random()}`
    const options = { limit: 3, windowMs: 60_000 }

    expect(hit(key, options).allowed).toBe(true)
    expect(hit(key, options).allowed).toBe(true)
    expect(hit(key, options).allowed).toBe(true)

    const refused = hit(key, options)
    expect(refused.allowed).toBe(false)
    expect(refused.retryAfter).toBeGreaterThan(0)
  })

  it('keeps separate budgets per key so one caller cannot exhaust another', () => {
    const options = { limit: 1, windowMs: 60_000 }
    const suffix = Math.random()
    expect(hit(`a-${suffix}`, options).allowed).toBe(true)
    expect(hit(`a-${suffix}`, options).allowed).toBe(false)
    expect(hit(`b-${suffix}`, options).allowed).toBe(true)
  })

  it('resets once the window elapses', () => {
    const key = `expiry-${Math.random()}`
    const options = { limit: 1, windowMs: 1 }
    expect(hit(key, options).allowed).toBe(true)
    expect(hit(key, options).allowed).toBe(false)

    const later = Date.now() + 50
    while (Date.now() < later) {
      /* spin briefly rather than adding a timer dependency */
    }
    expect(hit(key, options).allowed).toBe(true)
  })

  it('budgets the login bucket tightly enough to matter', () => {
    expect(RATE_LIMITS.login.limit).toBeLessThanOrEqual(10)
  })
})

describe('password policy', () => {
  const valid = 'Str0ngPass'

  it('requires length and mixed character classes', () => {
    expect(PasswordSchema.safeParse('short1A').success).toBe(false)
    expect(PasswordSchema.safeParse('alllowercase1').success).toBe(false)
    expect(PasswordSchema.safeParse('ALLUPPERCASE1').success).toBe(false)
    expect(PasswordSchema.safeParse('NoDigitsHere').success).toBe(false)
    expect(PasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('holds admins to the same policy as citizens', () => {
    // Admin creation previously accepted min(6) with no complexity rule —
    // a weaker password on the more privileged account.
    const weak = 'abc123'
    expect(RegisterSchema.shape.password.safeParse(weak).success).toBe(false)
    expect(CreateAdminSchema.shape.password.safeParse(weak).success).toBe(false)
  })

  it('rejects permissions that name no real capability', () => {
    const base = { name: 'Admin User', email: 'a@b.com', password: valid }
    expect(CreateAdminSchema.safeParse({ ...base, permissions: ['citizen.view'] }).success).toBe(
      true,
    )
    expect(CreateAdminSchema.safeParse({ ...base, permissions: ['settings.view'] }).success).toBe(
      false,
    )
  })
})
