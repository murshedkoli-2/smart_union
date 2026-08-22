import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { withRateLimit } from '@/middleware/rate-limit'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { setAuthCookies } from '@/lib/auth/cookies'
import { RATE_LIMITS } from '@/lib/security/rate-limit'
import * as AuthService from '@/services/auth.service'
import type { RouteContext } from '@/types/api.types'

async function handler(req: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  const body = await req.json()
  const result = await AuthService.login(body)

  const { refreshToken, accessToken, ...responseData } = result

  // Neither token is returned in the body — both live in httpOnly cookies so
  // that script running in the page cannot read them.
  const response = successResponse(responseData, 'Login successful')
  setAuthCookies(response, accessToken, refreshToken)

  return response
}

export const POST = withRateLimit('auth:login', RATE_LIMITS.login)(
  withDb((req, ctx) => handler(req, ctx).catch(errorResponse)),
)
