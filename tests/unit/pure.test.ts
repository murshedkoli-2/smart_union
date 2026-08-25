import { describe, it, expect } from 'vitest'
import { parsePagination, clampPagination, MAX_PAGE_SIZE } from '@/lib/utils/pagination'
import { escapeRegex, containsFilter } from '@/lib/utils/mongo-query'
import { isVerificationToken, generateVerificationToken } from '@/lib/utils/verification-token'
import { hit, RATE_LIMITS } from '@/lib/security/rate-limit'
import { PasswordSchema, CreateAdminSchema, RegisterSchema } from '@/lib/utils/validators'
import { escapeHtml } from '@/lib/utils/html'
import {
  buildCitizenPayload,
  defaultCitizenForm,
  validateCitizenForm,
  type CitizenFormData,
} from '@/components/forms/citizen-form-model'
import { generateTaxReceiptHtml } from '@/lib/utils/tax-receipt-render'
import { generateWarishApplicationHtml } from '@/lib/utils/warish-application-render'

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

describe('escapeHtml', () => {
  it('escapes the characters that break out of markup', () => {
    expect(escapeHtml(`<img src=x onerror=alert(1)>`)).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    )
    expect(escapeHtml(`" onload="evil`)).toBe('&quot; onload=&quot;evil')
    expect(escapeHtml(`' & '`)).toBe('&#39; &amp; &#39;')
  })

  it('renders null and undefined as an empty string, not "null"', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapes the ampersand first, so an escape is not double-escaped', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('document renderers', () => {
  it('escapes payer-supplied text in a tax receipt', () => {
    const html = generateTaxReceiptHtml({
      payment: {
        receipt_no: 'R-1',
        createdAt: new Date('2026-01-01'),
        note: '<script>x</script>',
        paid_by_citizen: { name_bn: '</div><b>Forged', name_en: 'A', mobile: '01', nid_no: '1' },
        collected_by: { name: 'Clerk' },
      },
      tax: {
        _id: 't',
        holding_no: 'H-1',
        fiscal_year: '2025-2026',
        amount: 100,
        citizen_id: { address: { village_bn: 'V', ward_no: 1 } },
      },
      systemSettings: {
        union_name_bn: 'U',
        union_name_en: 'U',
        chairman_name_bn: 'C',
        chairman_name_en: 'C',
        address_bn: 'A',
        address_en: 'A',
      },
      // The renderer only reads the fields above; the model type is wider.
    } as unknown as Parameters<typeof generateTaxReceiptHtml>[0])

    expect(html).not.toContain('<script>x</script>')
    expect(html).not.toContain('</div><b>Forged')
    expect(html).toContain('&lt;/div&gt;&lt;b&gt;Forged')
  })

  it('escapes applicant-supplied text in a warish application', () => {
    const html = generateWarishApplicationHtml({
      deceased_name_bn: '<b>x</b>',
      deceased_name_en: 'x',
      deceased_father_name_bn: 'f',
      date_of_death: '2026-01-01',
      applicant: { name_bn: 'a', name_en: 'a', mobile: '01' },
      heirs: [{ name_bn: '"><b>h', relation: 'son', birth_date: '2000-01-01', nid_no: '1' }],
      systemSettings: {
        union_name_bn: 'U',
        address_bn: 'A',
        chairman_name_bn: 'C',
        union_logo: '"><script>y</script>',
      },
    })

    expect(html).not.toContain('<b>x</b>')
    expect(html).not.toContain('<script>y</script>')
    expect(html).toContain('&quot;&gt;&lt;b&gt;h')
  })
})

describe('clampPagination', () => {
  it('caps a limit passed straight to a service by a Server Component', () => {
    expect(clampPagination({ limit: 999999 }).limit).toBe(MAX_PAGE_SIZE)
  })

  it('falls back for missing, zero, negative and non-finite values', () => {
    expect(clampPagination({})).toEqual({ page: 1, limit: 20 })
    expect(clampPagination({ page: 0, limit: -5 })).toEqual({ page: 1, limit: 20 })
    expect(clampPagination({ page: Number.NaN })).toEqual({ page: 1, limit: 20 })
  })

  it('honours a caller-supplied default below the cap', () => {
    expect(clampPagination({}, 5).limit).toBe(5)
    expect(clampPagination({ limit: 50 }, 5).limit).toBe(50)
  })
})

describe('authenticated write budget', () => {
  it('lets reads through unmetered and stops writes past the ceiling', () => {
    const key = `write:${Math.random()}`
    const { limit } = RATE_LIMITS.write

    for (let i = 0; i < limit; i++) {
      expect(hit(key, RATE_LIMITS.write).allowed).toBe(true)
    }

    const blocked = hit(key, RATE_LIMITS.write)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('budgets each user separately', () => {
    const a = `write:${Math.random()}`
    const b = `write:${Math.random()}`
    for (let i = 0; i < RATE_LIMITS.write.limit + 1; i++) hit(a, RATE_LIMITS.write)
    expect(hit(a, RATE_LIMITS.write).allowed).toBe(false)
    expect(hit(b, RATE_LIMITS.write).allowed).toBe(true)
  })
})

describe('citizen form model', () => {
  const complete = (): CitizenFormData => ({
    ...defaultCitizenForm(),
    name_bn: 'নাম',
    name_en: 'Name',
    father_name_bn: 'পিতা',
    father_name_en: 'Father',
    mother_name_bn: 'মাতা',
    mother_name_en: 'Mother',
    date_of_birth: '1990-01-01',
    mobile: '01700000000',
    address: {
      village_bn: 'গ্রাম',
      village_en: 'Village',
      post_office_bn: 'ডাকঘর',
      post_office_en: 'Post',
      thana_bn: 'থানা',
      thana_en: 'Thana',
      district_bn: 'জেলা',
      district_en: 'District',
      ward_no: 3,
    },
  })

  it('accepts a complete form', () => {
    expect(validateCitizenForm(complete())).toBeNull()
  })

  it('reports the first missing required field, in form order', () => {
    const form = { ...complete(), name_en: '', mobile: '' }
    expect(validateCitizenForm(form)).toBe('Name (English) is required')
  })

  it('treats whitespace-only input as missing', () => {
    expect(validateCitizenForm({ ...complete(), name_bn: '   ' })).toContain('Name (Bangla)')
  })

  it('rejects ward 0, which is not a ward', () => {
    const form = complete()
    expect(validateCitizenForm({ ...form, address: { ...form.address, ward_no: 0 } })).toContain(
      'Ward number',
    )
  })

  it('omits blank optional fields rather than sending empty strings', () => {
    const payload = buildCitizenPayload(complete())
    expect(payload).not.toHaveProperty('blood_group')
    expect(payload).not.toHaveProperty('nid_no')
    expect(payload).not.toHaveProperty('permanent_address')
    expect(payload).not.toHaveProperty('housing_info')
    expect(payload).not.toHaveProperty('financial_info')
  })

  it('trims values and sends ward_no as a number', () => {
    const form = complete()
    form.name_bn = '  নাম  '
    form.address.ward_no = '4'
    const payload = buildCitizenPayload(form)
    expect(payload.name_bn).toBe('নাম')
    expect((payload.address as { ward_no: number }).ward_no).toBe(4)
  })

  it('copies the present address when "same as present" is ticked', () => {
    const payload = buildCitizenPayload({ ...complete(), same_as_present: true })
    expect(payload.permanent_address).toEqual(payload.address)
  })

  it('sends housing and financial groups only when they hold something', () => {
    const form = complete()
    form.housing_info.house_type = 'pucca'
    form.financial_info.annual_income = '50000'
    const payload = buildCitizenPayload(form)
    expect(payload.housing_info).toEqual({ house_type: 'pucca' })
    expect(payload.financial_info).toEqual({ annual_income: 50000 })
  })
})
