/**
 * Client-side API helpers.
 *
 * Both the access token and the refresh token are httpOnly cookies set by the
 * server, so this module never sees, stores, or forwards a token. Every
 * request just needs `credentials: 'include'`.
 */

// Singleton promise to deduplicate concurrent refresh calls.
//
// This MUST be the only path to /api/auth/refresh. Refresh rotates the stored
// token, so two refreshes racing means the second invalidates the first, the
// server treats the reuse as token theft and wipes the session — logging out
// a user who did nothing wrong. Every caller goes through refreshSession().
let refreshingPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Silently refresh the session using the httpOnly refresh_token cookie.
 * Concurrent callers share a single in-flight request.
 * Resolves true when the session was renewed.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshingPromise) {
    refreshingPromise = doRefresh().finally(() => {
      refreshingPromise = null
    })
  }
  return refreshingPromise
}

/** Clears client-held UI state and sends the user to the login page. */
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  // Only non-sensitive UI state (display name, role) lives here — the tokens
  // are httpOnly cookies and are cleared by the server on logout/expiry.
  sessionStorage.clear()
  window.location.href = '/login'
}

/** Authenticated API call. Refreshes once on 401 and retries. */
export async function apiCall(url: string, options?: RequestInit): Promise<Response> {
  const buildRequest = () =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    })

  const res = await buildRequest()

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await refreshSession()
    if (refreshed) return buildRequest()
    redirectToLogin()
  }

  return res
}
