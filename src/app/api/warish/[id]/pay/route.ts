import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as WarishService from '@/services/warish.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/warish/[id]/pay — generate payment for application
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const application = await WarishService.payWarish(id, req.user)
  return successResponse(application, 'Payment processed successfully')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'warish.create')(postHandler)),
)
