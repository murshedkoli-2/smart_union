import { NextRequest, NextResponse } from 'next/server'
import { decodeWithoutVerify } from '@/lib/auth/jwt'

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // API routes protect themselves via authenticate() middleware
  // This middleware only guards page routes to prevent unauthenticated flash
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check for access token cookie (set by frontend after login)
  // Full JWT verification happens in API middleware — this is a fast page guard
  const accessToken = req.cookies.get('access_token')?.value

  if (!accessToken) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Quick decode to check the token is a valid JWT structure
  // NOTE: we intentionally do NOT redirect on expiry here.
  // If the access token is expired, the client will silently refresh it via
  // the httpOnly refresh_token cookie (7-day lifetime). Redirecting on every
  // 15-minute access-token expiry would kick admins out while they are working.
  const payload = decodeWithoutVerify(accessToken)
  if (!payload) {
    // Token is structurally invalid (not a JWT) — force re-login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token may be expired — let the page load.
  // DashboardShell will proactively refresh before rendering,
  // and api-client / useApi will silently refresh on any 401.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
