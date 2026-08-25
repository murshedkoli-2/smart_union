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

function toPositiveInt(raw: string | number | null | undefined, fallback: number): number {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === 'string' && raw.trim() === '') return fallback
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

/**
 * Clamp a page/limit pair that did not come from parsePagination.
 *
 * The API routes parse the query string through parsePagination, but a Server
 * Component calls the service layer directly and never goes near that — so the
 * cap has to live in the service too, or the RSC pages are a hole around it.
 * Every list service starts by putting its `query` through this.
 */
export function clampPagination(
  query: { page?: number; limit?: number },
  defaultLimit: number = DEFAULT_PAGE_SIZE,
): Pagination {
  const page = toPositiveInt(query.page, 1)
  const limit = Math.min(toPositiveInt(query.limit, defaultLimit), MAX_PAGE_SIZE)
  return { page, limit }
}
