import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as ReliefService from '@/services/relief.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/relief/lists/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const list = await ReliefService.getListById(id, req.user)
  return successResponse(list)
}

// PATCH /api/relief/lists/[id]
const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const list = await ReliefService.updateList(id, body, req.user)
  return successResponse(list, 'Relief list updated successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'relief.manage')(patchHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
