import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, createdResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/citizens/[id]/tax — get citizen's holding tax records
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const result = await TaxService.getTaxByCitizen(id, req.user)
  return successResponse(result)
}

// POST /api/citizens/[id]/tax — create holding tax for citizen
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const result = await TaxService.createTaxForCitizen(id, body, req.user)
  return createdResponse(result, 'Holding tax created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'citizen.view')(getHandler)),
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.create')(postHandler)),
)
