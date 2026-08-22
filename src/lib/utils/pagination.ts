/**
 * Pagination parsing with hard bounds.
 *
 * Every list endpoint must go through this. Reading `limit` straight from the
 * query string lets a caller request the entire collection in one response
 * (`?limit=1000000`), which is both a denial-of-service vector and a bulk
 * data-exfiltration vector.
 */

export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 20

export interface Pagination {
  page: number
  limit: number
}

function toPositiveInt(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === '') return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  const truncated = Math.trunc(parsed)
  return truncated < 1 ? fallback : truncated
}

/**
 * Parse `page` / `limit` from a query string, clamped to safe bounds.
 * `limit` is capped at MAX_PAGE_SIZE regardless of what the caller asked for.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = DEFAULT_PAGE_SIZE,
): Pagination {
  const page = toPositiveInt(searchParams.get('page'), 1)
  const limit = Math.min(toPositiveInt(searchParams.get('limit'), defaultLimit), MAX_PAGE_SIZE)
  return { page, limit }
}
