/**
 * Content Security Policy, built per request around a fresh nonce.
 *
 * The previous policy carried `'unsafe-inline'` on script-src, which makes the
 * script directive close to decorative: an injected <script> executes exactly
 * like a legitimate one. Next.js needs inline scripts to ship hydration data,
 * so the fix is a per-request nonce rather than dropping inline scripts.
 *
 * `'strict-dynamic'` lets a nonced script load the chunks it needs without
 * every chunk URL having to be enumerated. Browsers that honour it ignore the
 * host allow-list; `'self'` remains for older browsers that do not.
 *
 * COST: a nonce must differ per response, so pages carrying one cannot be
 * served from the static cache — every route this applies to renders per
 * request. That is acceptable here because the static routes were empty
 * client-rendered shells anyway, but it is a real trade and the reason this is
 * applied in middleware rather than as a static header in next.config.
 *
 * style-src keeps 'unsafe-inline'. Tailwind and the inline `style` attributes
 * throughout the app need it, and nonces do not apply to style attributes.
 * Inline CSS is a far weaker vector than inline script.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is required by the Turbopack HMR client in development
    // only, and is never emitted in a production build.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // 'self' does not cover the ws:/wss: scheme, so the dev HMR socket needs an
    // explicit entry or hot reload silently stops working. Not emitted in a
    // production build.
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Production only. On a plain-HTTP dev server this upgrades same-origin
    // asset requests to https and every one of them fails with
    // ERR_SSL_PROTOCOL_ERROR, because there is no TLS listener to upgrade to.
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

/** 128 bits, base64 — regenerated for every response. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Headers that are the same for every response. */
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  // Defence in depth alongside frame-ancestors, for older browsers.
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // Only honoured over HTTPS; harmless on local HTTP.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}
