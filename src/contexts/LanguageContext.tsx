'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { type Lang, type TranslationKey, getT } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const STORAGE_KEY = 'lang'
const DEFAULT_LANG: Lang = 'en'

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: getT(DEFAULT_LANG),
})

/**
 * localStorage-backed language preference.
 *
 * Read through useSyncExternalStore rather than an effect. The effect version
 * rendered once in English, then setState'd to the stored language — the
 * cascading render React warns about — and a change in one tab never reached
 * the others. Subscribers are notified on write here, so every consumer in
 * every tab updates together.
 */
const listeners = new Set<() => void>()

function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'bn'
}

function readLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isLang(stored) ? stored : DEFAULT_LANG
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  // 'storage' only fires in OTHER tabs, so same-tab writes are emitted directly.
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function writeLang(lang: Lang): void {
  window.localStorage.setItem(STORAGE_KEY, lang)
  for (const listener of listeners) listener()
}

/** Server snapshot: the default until hydration reads the real preference. */
function serverSnapshot(): Lang {
  return DEFAULT_LANG
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, serverSnapshot)

  const setLang = useCallback((next: Lang) => writeLang(next), [])

  // Memoised so consumers do not re-render on every provider render.
  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: getT(lang) }),
    [lang, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
