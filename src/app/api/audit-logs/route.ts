import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { paginatedResponse, errorResponse } from '@/lib/utils/api-response'
import { BadRequestError } from '@/lib/utils/errors'
import { getAuditLogs } from '@/services/audit-log.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (isNaN(date.getTime())) return undefined
  return date
}

// GET /api/audit-logs — super_admin and admin
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)

  // Support both 'from'/'to' and 'date_from'/'date_to' query params
  const fromRaw = searchParams.get('from') || searchParams.get('date_from')
  const toRaw = searchParams.get('to') || searchParams.get('date_to')
  if (fromRaw && isNaN(new Date(fromRaw).getTime())) {
    throw new BadRequestError('Invalid "from" date format')
  }
  if (toRaw && isNaN(new Date(toRaw).getTime())) {
    throw new BadRequestError('Invalid "to" date format')
  }

  const query = {
    user_id: searchParams.get('user_id') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    target_model: searchParams.get('target_model') ?? undefined,
    status: (searchParams.get('status') as 'success' | 'failure') ?? undefined,
    from: parseDate(fromRaw),
    to: parseDate(toRaw),
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 25),
  }

  const result = await getAuditLogs(query)
  return paginatedResponse(result.logs, result.total, result.page, result.limit)
}

export const GET = withDb(
  authenticate(authorize(['super_admin', 'admin'])(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
