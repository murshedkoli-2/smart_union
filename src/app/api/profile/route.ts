import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { successResponse } from '@/lib/utils/api-response'
import * as UserService from '@/services/user.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// PATCH /api/profile
const patchHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const result = await UserService.updateProfile(body, req.user)
  return successResponse(result, 'Profile updated successfully')
}

export const PATCH = withDb(
  authenticate(patchHandler),
)
