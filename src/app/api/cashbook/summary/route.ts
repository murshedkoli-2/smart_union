import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as CashbookService from '@/services/cashbook.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/cashbook/summary
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
  }
  const summary = await CashbookService.getSummary(query, req.user)
  return successResponse(summary)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'cashbook.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
