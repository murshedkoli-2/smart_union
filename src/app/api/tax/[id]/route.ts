import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/tax/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const tax = await TaxService.getTaxById(id, req.user)
  return successResponse(tax)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
