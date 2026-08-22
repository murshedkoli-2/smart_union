import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as CitizenService from '@/services/citizen.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/citizens/[id]/reject
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const citizen = await CitizenService.rejectCitizen(id, body, req.user)
  return successResponse(citizen, 'Citizen rejected')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'citizen.approve')(postHandler)),
)
