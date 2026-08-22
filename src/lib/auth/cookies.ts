import type { NextResponse } from 'next/server'

export const ACCESS_TOKEN_COOKIE = 'access_token'
export const REFRESH_TOKEN_COOKIE = 'refresh_token'

/** Must stay in sync with JWT_REFRESH_EXPIRY (7d). */
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60

/**
 * The access token JWT itself expires in 15 minutes (JWT_ACCESS_EXPIRY), but
 * the cookie carrying it is kept for the refresh lifetime on purpose.
 *
 * Authority lives in the signature and the `exp` claim, both checked server
 * side — a stale cookie grants nothing. What it does provide is a signal to
 * the page middleware that a session exists, so a user returning to a tab
 * after 20 minutes gets the page (and a silent refresh) instead of being
 * bounced to /login while holding a perfectly valid refresh token.
 */
const ACCESS_MAX_AGE = REFRESH_MAX_AGE

const isProduction = () => process.env.NODE_ENV === 'production'

/**
 * Access token cookie.
 *
 * httpOnly: JavaScript must not be able to read the token. Previously it was
 * kept in sessionStorage and a script-readable cookie, so any XSS anywhere in
 * the app yielded a full session takeover.
 *
 * sameSite 'lax': the cookie must survive a top-level navigation (a citizen
 * following a link into the dashboard), otherwise the page middleware bounces
 * an authenticated user to /login. 'lax' still withholds the cookie on
 * cross-site POST/PATCH/DELETE, which is what blocks CSRF against mutations.
 */
export function setAccessTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: ACCESS_MAX_AGE,
    path: '/',
  })
}

/**
 * Refresh token cookie.
 *
 * Scoped to /api/auth so it is never attached to ordinary API traffic, and
 * 'strict' because it is only ever sent by same-origin fetch — no navigation
 * depends on it.
 */
export function setRefreshTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: REFRESH_MAX_AGE,
    path: '/api/auth',
  })
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  setAccessTokenCookie(response, accessToken)
  setRefreshTokenCookie(response, refreshToken)
}

/** Clears both cookies. Paths must match the ones used when setting them. */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth',
  })
}
