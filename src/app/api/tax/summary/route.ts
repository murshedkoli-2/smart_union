import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/tax/summary — get tax summary stats
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const result = await TaxService.getTaxSummary(req.user)
  return successResponse(result)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.view')(getHandler)),
)
