/**
 * Input character filters for bilingual (Bengali / English) form fields.
 *
 * filterBangla — strips Latin letters (a-z, A-Z) so Bengali-only fields
 *   cannot receive English input.  Digits, spaces, and punctuation are kept
 *   so users can still type numbers or hyphens where needed.
 *
 * filterEnglish — strips Bengali Unicode characters (U+0980–U+09FF) so
 *   English-only fields cannot receive Bengali input.
 */

const LATIN_LETTERS = /[a-zA-Z]/g
const BENGALI_CHARS = /[\u0980-\u09FF]/g

export function filterBangla(value: string): string {
  return value.replace(LATIN_LETTERS, '')
}

export function filterEnglish(value: string): string {
  return value.replace(BENGALI_CHARS, '')
}
