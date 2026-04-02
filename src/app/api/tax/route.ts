import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse, errorResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/tax — list tax records
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    citizen_id: searchParams.get('citizen_id') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  }
  const result = await TaxService.listTax(query, req.user)
  return paginatedResponse(result.records, result.total, result.page, result.limit)
}

// POST /api/tax — create tax record
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const tax = await TaxService.createTax(body, req.user)
  return createdResponse(tax, 'Tax record created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'tax.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.create')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
