import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as ReliefService from '@/services/relief.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// DELETE /api/relief/beneficiaries/[id]
const deleteHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const result = await ReliefService.removeBeneficiary(id, req.user)
  return successResponse(result, 'Beneficiary removed successfully')
}

export const DELETE = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(deleteHandler)),
)
