import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { withRateLimit } from '@/middleware/rate-limit'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { UnauthorizedError } from '@/lib/utils/errors'
import { REFRESH_TOKEN_COOKIE, setAuthCookies } from '@/lib/auth/cookies'
import { RATE_LIMITS } from '@/lib/security/rate-limit'
import * as AuthService from '@/services/auth.service'
import type { RouteContext } from '@/types/api.types'

async function handler(req: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  const rawRefreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token not found')
  }

  const tokens = await AuthService.refreshTokens(rawRefreshToken)

  // Both tokens are rotated and returned as httpOnly cookies only.
  const response = successResponse(null, 'Token refreshed successfully')
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken)

  return response
}

export const POST = withRateLimit('auth:refresh', RATE_LIMITS.refresh)(
  withDb((req, ctx) => handler(req, ctx).catch(errorResponse)),
)
