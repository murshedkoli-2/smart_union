import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { BadRequestError } from '@/lib/utils/errors'
import * as UserService from '@/services/user.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/users/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const user = await UserService.getUserById(id, req.user)
  return successResponse(user, 'User retrieved successfully')
}

// PATCH /api/users/[id] — update permissions or status
const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()

  let result
  if ('permissions' in body) {
    result = await UserService.updateAdminPermissions(id, body, req.user)
  } else if ('status' in body && (body.status === 'active' || body.status === 'inactive')) {
    result = await UserService.updateUserStatus(id, body.status, req.user)
  } else if ('approve' in body && body.approve === true) {
    result = await UserService.approveUser(id, req.user)
  } else {
    return errorResponse(new BadRequestError('No valid update fields provided'))
  }

  return successResponse(result, 'User updated successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'])(getHandler)),
)

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(patchHandler)),
)
