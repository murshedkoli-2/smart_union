import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies'
import { errorResponse } from '@/lib/utils/api-response'
import { hit, RATE_LIMITS } from '@/lib/security/rate-limit'
import { TooManyRequestsError, UnauthorizedError } from '@/lib/utils/errors'
import type {
  AuthenticatedHandler,
  AuthenticatedRequest,
  RouteContext,
  RouteHandler,
} from '@/types/api.types'

/**
 * Extracts the access token.
 *
 * The httpOnly `access_token` cookie is the browser path and is preferred.
 * The Authorization header remains supported for non-browser callers
 * (scripts, integrations) that cannot hold a cookie jar.
 */
function extractToken(req: NextRequest): string {
  const cookieToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (cookieToken) return cookieToken

  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7).trim()
    if (headerToken) return headerToken
  }

  throw new UnauthorizedError('Authentication required')
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Per-user ceiling on state-changing requests.
 *
 * withRateLimit covers the unauthenticated endpoints and keys on IP; past
 * login there was no ceiling at all, so a stolen session or a runaway script
 * could write ledger rows as fast as the database accepted them. Keyed on the
 * user id rather than the IP because that is the thing being abused here, and
 * because a whole union office shares one NAT address.
 *
 * Applied here rather than per route so a new route cannot forget it. Reads
 * are exempt: paging through a list is legitimately fast, and the volume cap
 * on those is parsePagination.
 */
function enforceWriteBudget(req: NextRequest, userId: string): void {
  if (READ_METHODS.has(req.method)) return

  const result = hit(`write:${userId}`, RATE_LIMITS.write)
  if (!result.allowed) throw new TooManyRequestsError(result.retryAfter)
}

/**
 * Verifies the JWT access token and attaches the decoded payload to req.user.
 * Must be wrapped with withDb() first.
 */
export function authenticate(handler: AuthenticatedHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const payload = verifyAccessToken(extractToken(req))
      enforceWriteBudget(req, payload.sub)

      // Attach user payload to request (cast is safe — we just validated)
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = payload

      return await handler(authenticatedReq, ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
