// Singleton promise to deduplicate concurrent refresh calls
let refreshingPromise: Promise<string | null> | null = null

/**
 * Silently refresh the access token using the httpOnly refresh_token cookie.
 * Updates sessionStorage and the access_token cookie on success.
 * Returns the new token or null on failure.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    const token: string | undefined = data.data?.accessToken ?? data.accessToken
    if (!token) return null
    sessionStorage.setItem('access_token', token)
    document.cookie = `access_token=${token}; path=/; max-age=900; SameSite=Strict${
      location.protocol === 'https:' ? '; Secure' : ''
    }`
    return token
  } catch {
    return null
  }
}

function getOrStartRefresh(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = refreshAccessToken().finally(() => {
      refreshingPromise = null
    })
  }
  return refreshingPromise
}

function redirectToLogin(): void {
  sessionStorage.clear()
  document.cookie = 'access_token=; max-age=0; path=/'
  window.location.href = '/login'
}

/** Helper for making authenticated API calls from client. Auto-refreshes on 401. */
export async function apiCall(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null

  const buildRequest = (t: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options?.headers,
      },
      credentials: 'include',
    })

  const res = await buildRequest(token)

  // On 401: attempt silent token refresh then retry once
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await getOrStartRefresh()
    if (newToken) return buildRequest(newToken)
    redirectToLogin()
  }

  return res
}
