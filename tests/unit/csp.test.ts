import { describe, it, expect } from 'vitest'
import { buildCsp, generateNonce, STATIC_SECURITY_HEADERS } from '@/lib/security/csp'

const scriptSrc = (csp: string) =>
  csp.split('; ').find((directive) => directive.startsWith('script-src')) ?? ''
const connectSrc = (csp: string) =>
  csp.split('; ').find((directive) => directive.startsWith('connect-src')) ?? ''

describe('buildCsp', () => {
  const prod = buildCsp('TESTNONCE', false)
  const dev = buildCsp('TESTNONCE', true)

  it('never allows inline script', () => {
    // The whole point of the nonce: with 'unsafe-inline' an injected <script>
    // executes exactly like a legitimate one.
    expect(scriptSrc(prod)).not.toContain("'unsafe-inline'")
    expect(scriptSrc(dev)).not.toContain("'unsafe-inline'")
  })

  it('carries the nonce it was given', () => {
    expect(scriptSrc(prod)).toContain("'nonce-TESTNONCE'")
  })

  it('allows eval in development only', () => {
    expect(scriptSrc(dev)).toContain("'unsafe-eval'")
    expect(scriptSrc(prod)).not.toContain("'unsafe-eval'")
  })

  it('allows the HMR websocket in development only', () => {
    // 'self' does not cover the ws: scheme, so without this hot reload dies.
    expect(connectSrc(dev)).toContain('ws:')
    expect(connectSrc(prod)).not.toContain('ws:')
  })

  it('upgrades insecure requests in production only', () => {
    // On a plain-HTTP dev server this turns every asset into an SSL error.
    expect(prod).toContain('upgrade-insecure-requests')
    expect(dev).not.toContain('upgrade-insecure-requests')
  })

  it('keeps the non-negotiable directives', () => {
    for (const directive of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(prod).toContain(directive)
    }
  })
})

describe('generateNonce', () => {
  it('is base64 and long enough to be unguessable', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/)
  })

  it('never repeats — a reused nonce is no better than unsafe-inline', () => {
    const nonces = new Set(Array.from({ length: 500 }, generateNonce))
    expect(nonces.size).toBe(500)
  })
})

describe('STATIC_SECURITY_HEADERS', () => {
  it('sets the headers that do not vary per request', () => {
    expect(STATIC_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
    expect(STATIC_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    expect(STATIC_SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(STATIC_SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=')
  })
})
