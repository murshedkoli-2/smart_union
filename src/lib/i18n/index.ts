import { en } from './en'
import { bn } from './bn'

export type Lang = 'en' | 'bn'

const translations = { en, bn }

export type TranslationKey = keyof typeof en

/**
 * Returns the translator for a language.
 *
 * Falls back to English, then to the key itself: a missing string should show
 * something recognisable rather than blank space.
 */
export function getT(lang: Lang) {
  return (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key
}
