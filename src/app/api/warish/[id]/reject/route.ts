import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as WarishService from '@/services/warish.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/warish/[id]/reject
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const application = await WarishService.rejectWarish(id, body, req.user)
  return successResponse(application, 'Warish application rejected')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'warish.approve')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
