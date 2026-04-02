import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as AuthService from '@/services/auth.service'
import type { RouteContext } from '@/types/api.types'

const REFRESH_TOKEN_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

async function handler(req: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  const body = await req.json()
  const result = await AuthService.login(body)

  const { refreshToken, ...responseData } = result

  const response = successResponse(responseData, 'Login successful')

  // Set refresh token as httpOnly cookie
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
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
