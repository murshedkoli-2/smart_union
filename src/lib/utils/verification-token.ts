/**
 * Unguessable public verification tokens.
 *
 * Certificate numbers are sequential by design (BN-CIT-2026-0001, -0002, …)
 * because they are an official record locator. That makes them useless as a
 * secret: anyone can walk the range and pull the citizen behind every
 * certificate from the public verification endpoint.
 *
 * The QR code therefore carries this token instead, and the public endpoint
 * only ever resolves a certificate by token. The certificate number remains
 * visible on the printed document and in the verification *result* — it is
 * just no longer the key that unlocks it.
 */

const TOKEN_BYTES = 24

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 24 random bytes → 32 URL-safe characters (192 bits). */
export function generateVerificationToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

/** Shape check before hitting the database. */
export function isVerificationToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(value)
}
