import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { UnauthorizedError } from '@/lib/utils/errors'
import * as AuthService from '@/services/auth.service'
import type { RouteContext } from '@/types/api.types'

const REFRESH_TOKEN_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

async function handler(req: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  const rawRefreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token not found')
  }

  const tokens = await AuthService.refreshTokens(rawRefreshToken)

  const response = successResponse(
    { accessToken: tokens.accessToken },
    'Token refreshed successfully',
  )

  // Rotate cookie with new refresh token
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/api/auth',
  })

  return response
}

export const POST = withDb((req, ctx) =>
  handler(req, ctx).catch(errorResponse),
)
