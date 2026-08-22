'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

/**
 * Keeps list filters and pagination in the URL.
 *
 * Server Components read their query from the request, so filter state has to
 * live in the URL rather than in component state — otherwise changing a filter
 * would not re-run the server render. Doing it this way also makes list views
 * linkable and restores browser back/forward, which the old useState filters
 * broke.
 *
 * `isPending` is true while the server renders the next page, so the table can
 * show a loading state instead of appearing frozen.
 */
export function useUrlFilters(basePath: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  /** Current value of a query param. */
  const get = (key: string, fallback = ''): string => searchParams.get(key) ?? fallback

  /**
   * Merges `changes` into the query string and navigates.
   * Empty values remove the param, so "All" options produce clean URLs.
   *
   * Changing any filter resets to page 1 — leaving the caller on page 7 of a
   * result set that now has two pages would show an empty table.
   */
  const apply = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!('page' in changes)) params.delete('page')

    const query = params.toString()
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath))
  }

  return { get, apply, isPending, searchParams, refresh: () => router.refresh() }
}
