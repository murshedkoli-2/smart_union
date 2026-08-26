/**
 * Masks a secret for display, e.g. an admin-configured API key.
 *
 * Never derive the real value from the masked one — this is one-way. The
 * caller must keep the real value server-side and only use the mask to
 * detect "the admin didn't change this field" on write.
 */
const MASK_PREFIX = '••••'

export function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return MASK_PREFIX
  return MASK_PREFIX + value.slice(-4)
}

export function isMaskedSecret(value: string): boolean {
  return value.startsWith(MASK_PREFIX)
}
