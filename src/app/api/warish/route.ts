import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, createdResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as WarishService from '@/services/warish.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/warish — list warish applications
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    applicant_citizen_id: searchParams.get('applicant_citizen_id') ?? undefined,
    application_type: searchParams.get('application_type') ?? undefined,
    ...parsePagination(searchParams),
  }
  const result = await WarishService.listWarish(query, req.user)
  return successResponse(result)
}

// POST /api/warish — create warish application
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const application = await WarishService.createWarish(body, req.user)
  return createdResponse(application, 'Warish application created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'warish.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'warish.create')(postHandler)),
)
