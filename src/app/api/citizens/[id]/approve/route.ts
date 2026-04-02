import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as CitizenService from '@/services/citizen.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/citizens/[id]/approve
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const citizen = await CitizenService.approveCitizen(id, req.user)
  return successResponse(citizen, 'Citizen approved successfully')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'citizen.approve')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
