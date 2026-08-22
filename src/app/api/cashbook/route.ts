import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as CashbookService from '@/services/cashbook.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/cashbook — list cashbook entries
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    entry_type: searchParams.get('entry_type') ?? undefined,
    ...parsePagination(searchParams),
  }
  const result = await CashbookService.listEntries(query, req.user)
  return paginatedResponse(result.entries, result.total, result.page, result.limit)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'cashbook.view')(getHandler)),
)
