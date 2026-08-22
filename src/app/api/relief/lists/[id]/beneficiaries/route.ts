import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as ReliefService from '@/services/relief.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/relief/lists/[id]/beneficiaries
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const { searchParams } = new URL(req.url)
  const query = {
    ward_no: searchParams.get('ward_no') ? Number(searchParams.get('ward_no')) : undefined,
    ...parsePagination(searchParams),
  }
  const result = await ReliefService.listBeneficiaries(id, query, req.user)
  return paginatedResponse(result.beneficiaries, result.total, result.page, result.limit)
}

// POST /api/relief/lists/[id]/beneficiaries — add beneficiary
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const beneficiary = await ReliefService.addBeneficiary(id, body, req.user)
  return createdResponse(beneficiary, 'Beneficiary added successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(postHandler)),
)
