import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies'
import { errorResponse } from '@/lib/utils/api-response'
import { UnauthorizedError } from '@/lib/utils/errors'
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

/**
 * Verifies the JWT access token and attaches the decoded payload to req.user.
 * Must be wrapped with withDb() first.
 */
export function authenticate(handler: AuthenticatedHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const payload = verifyAccessToken(extractToken(req))

      // Attach user payload to request (cast is safe — we just validated)
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = payload

      return await handler(authenticatedReq, ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
