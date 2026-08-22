import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as CitizenService from '@/services/citizen.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/citizens/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const citizen = await CitizenService.getCitizenById(id, req.user)
  return successResponse(citizen)
}

// PATCH /api/citizens/[id]
const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const citizen = await CitizenService.updateCitizen(id, body, req.user)
  return successResponse(citizen, 'Citizen updated successfully')
}

// DELETE /api/citizens/[id]
const deleteHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  await CitizenService.deleteCitizen(id, req.user)
  return successResponse(null, 'Citizen deleted successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'citizen.view')(getHandler)),
)

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'citizen.edit')(patchHandler)),
)

export const DELETE = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(deleteHandler)),
)
