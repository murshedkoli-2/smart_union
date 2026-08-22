/**
 * Request proxy (formerly middleware).
 *
 * Next.js 16 renamed middleware.ts to proxy.ts and the export from
 * `middleware` to `proxy`. The old name still worked in `next build` but was
 * silently ignored by `next dev`, so locally there was no page auth guard and
 * no security headers at all — `/dashboard` served 200 to an anonymous
 * request in dev while returning 307 in production.
 *
 * Proxy runs on the Node.js runtime; the edge runtime is not supported here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies'
import { buildCsp, generateNonce, STATIC_SECURITY_HEADERS } from '@/lib/security/csp'

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/verify',
  '/_next',
  '/favicon.ico',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/verify',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`),
  )
}

/**
 * Attaches the security headers, and the per-request CSP nonce.
 *
 * The nonce goes on the REQUEST headers as well as the response: Next.js reads
 * it back from the incoming `Content-Security-Policy` header and stamps it
 * onto the inline scripts it generates. Without that the framework's own
 * hydration script would be blocked by the policy we just set.
 */
function withSecurityHeaders(req: NextRequest): NextResponse {
  const nonce = generateNonce()
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production')

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return withSecurityHeaders(req)
  }

  // API routes protect themselves via authenticate() middleware
  // This middleware only guards page routes to prevent unauthenticated flash
  if (pathname.startsWith('/api/')) {
    return withSecurityHeaders(req)
  }

  // Presence check only — this is a page guard that prevents an
  // unauthenticated flash, not an authorization decision.
  //
  // The cookie is httpOnly and server-set, so it cannot be forged by script in
  // the page, but it is still just an assertion: real enforcement is
  // verifyAccessToken() in the API middleware, which checks the signature and
  // the exp claim on every request. Deliberately no decode here, so this
  // module stays free of the jsonwebtoken dependency and runs anywhere.
  //
  // A structurally invalid or expired token is allowed through: DashboardShell
  // refreshes on mount, and useApi / apiCall refresh silently on any 401.
  // Redirecting on expiry would kick admins out mid-session.
  const hasSession = Boolean(req.cookies.get(ACCESS_TOKEN_COOKIE)?.value)

  if (!hasSession) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    const redirect = NextResponse.redirect(loginUrl)
    for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
      redirect.headers.set(key, value)
    }
    return redirect
  }

  return withSecurityHeaders(req)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - static assets served from /public, by extension
     *
     * The extension exclusion matters: without it every file in /public is
     * treated as a protected page route. /logo.svg was being redirected to
     * /login?from=%2Flogo.svg for anyone without a session — so the logo was
     * broken on the login and register pages, which are exactly the pages
     * shown to people who have no session.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|txt|xml|webmanifest)$).*)',
  ],
}
