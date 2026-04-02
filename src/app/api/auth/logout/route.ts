import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as AuthService from '@/services/auth.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const REFRESH_TOKEN_COOKIE = 'refresh_token'

async function handler(req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> {
  await AuthService.logout(req.user.sub)

  const response = successResponse(null, 'Logged out successfully')

  // Clear refresh token cookie
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth',
  })

  return response
}

export const POST = withDb(authenticate(handler)) as (
  req: NextRequest,
  ctx: RouteContext,
) => Promise<NextResponse>
