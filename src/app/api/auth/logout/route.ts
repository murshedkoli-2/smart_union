import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { successResponse } from '@/lib/utils/api-response'
import { clearAuthCookies } from '@/lib/auth/cookies'
import * as AuthService from '@/services/auth.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

async function handler(req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> {
  await AuthService.logout(req.user.sub)

  const response = successResponse(null, 'Logged out successfully')
  clearAuthCookies(response)

  return response
}

export const POST = withDb(authenticate(handler))
