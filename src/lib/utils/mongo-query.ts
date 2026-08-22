/**
 * Helpers for building MongoDB queries out of untrusted input.
 */

const REGEX_METACHARS = /[.*+?^${}()|[\]\\]/g

/**
 * Escape regex metacharacters so user input is matched literally.
 *
 * Without this, a search string like `(a+)+$` is compiled as a real regular
 * expression and evaluated by the server — catastrophic backtracking stalls
 * the query thread (ReDoS), and metacharacters let a caller match documents
 * they never named.
 */
export function escapeRegex(value: string): string {
  return value.replace(REGEX_METACHARS, '\\$&')
}

/**
 * Build a case-insensitive "contains" filter for a free-text search box.
 * Returns undefined for blank input so callers can skip the filter entirely.
 *
 * Note: this still performs a non-anchored scan. Prefer a text index for
 * large collections.
 */
export function containsFilter(value: string | undefined | null) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return { $regex: escapeRegex(trimmed), $options: 'i' }
}
