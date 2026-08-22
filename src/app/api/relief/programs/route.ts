import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as ReliefService from '@/services/relief.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/relief/programs — list programs
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const isActiveParam = searchParams.get('is_active')
  const query = {
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
    program_type: searchParams.get('program_type') ?? undefined,
    is_active: isActiveParam !== null ? isActiveParam === 'true' : undefined,
    ...parsePagination(searchParams),
  }
  const result = await ReliefService.listPrograms(query, req.user)
  return paginatedResponse(result.programs, result.total, result.page, result.limit)
}

// POST /api/relief/programs — create program
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const program = await ReliefService.createProgram(body, req.user)
  return createdResponse(program, 'Relief program created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(postHandler)),
)
