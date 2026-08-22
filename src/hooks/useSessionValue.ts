'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reads a JSON value out of sessionStorage without an effect.
 *
 * sessionStorage is an external store, so `useSyncExternalStore` is the right
 * primitive: it gives a correct server snapshot for hydration and delivers the
 * real value on the first client render. Reading it in a useEffect and calling
 * setState — what this replaces — renders once with null, then immediately
 * again with the value, which is the cascading render React warns about.
 *
 * Values written by another tab arrive through the `storage` event; values
 * written by this tab are picked up on the next render, and callers that need
 * to force one can dispatch `new StorageEvent('storage')` after writing.
 */

/**
 * getSnapshot must return a referentially stable value or React re-renders
 * forever, so parsed results are cached against the raw string they came from.
 */
const cache = new Map<string, { raw: string | null; parsed: unknown }>()

function readSnapshot<T>(key: string): T | null {
  const raw = typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)

  const cached = cache.get(key)
  if (cached && cached.raw === raw) return cached.parsed as T | null

  let parsed: T | null = null
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw) as T
    } catch {
      // Malformed JSON — treat as absent rather than crashing the tree.
      parsed = null
    }
  }

  cache.set(key, { raw, parsed })
  return parsed
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/** Server snapshot: nothing is available before hydration. */
function serverSnapshot(): null {
  return null
}

export function useSessionValue<T>(key: string): T | null {
  const getSnapshot = useCallback(() => readSnapshot<T>(key), [key])
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

/** Clears the parse cache for a key. Call after writing to force a re-read. */
export function invalidateSessionValue(key: string): void {
  cache.delete(key)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }
}
