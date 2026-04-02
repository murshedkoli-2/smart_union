import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse, errorResponse } from '@/lib/utils/api-response'
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
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
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
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
