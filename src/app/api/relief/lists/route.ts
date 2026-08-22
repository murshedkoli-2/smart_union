import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as ReliefService from '@/services/relief.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/relief/lists — list relief lists
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    program_id: searchParams.get('program_id') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    ward_no: searchParams.get('ward_no') ? Number(searchParams.get('ward_no')) : undefined,
    ...parsePagination(searchParams),
  }
  const result = await ReliefService.listLists(query, req.user)
  return paginatedResponse(result.lists, result.total, result.page, result.limit)
}

// POST /api/relief/lists — create relief list
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const list = await ReliefService.createList(body, req.user)
  return createdResponse(list, 'Relief list created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(postHandler)),
)
