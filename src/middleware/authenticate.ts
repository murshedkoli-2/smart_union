import type { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { errorResponse } from '@/lib/utils/api-response'
import { UnauthorizedError } from '@/lib/utils/errors'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  ctx: RouteContext,
) => Promise<NextResponse | Response>

type Handler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse | Response>

/**
 * Verifies JWT access token from Authorization header.
 * Attaches decoded payload to req.user.
 * Must be wrapped with withDb() first.
 */
export function authenticate(handler: AuthenticatedHandler): Handler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authorization header missing or malformed')
      }

      const token = authHeader.slice(7)
      const payload = verifyAccessToken(token)

      // Attach user payload to request (cast is safe — we just validated)
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = payload

      return await handler(authenticatedReq, ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
