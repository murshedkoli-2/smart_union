import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, createdResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as CitizenService from '@/services/citizen.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/citizens — list citizens
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    ward_no: searchParams.get('ward_no') ? Number(searchParams.get('ward_no')) : undefined,
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    ...parsePagination(searchParams),
  }
  const result = await CitizenService.listCitizens(query, req.user)
  return successResponse({
    citizens: result.citizens,
    total: result.total,
    page: result.page,
    limit: result.limit,
  })
}

// POST /api/citizens — create citizen
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const citizen = await CitizenService.createCitizen(body, req.user)
  return createdResponse(citizen, 'Citizen created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'citizen.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'citizen.create')(postHandler)),
)
