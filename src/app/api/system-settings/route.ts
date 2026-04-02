import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { errorResponse, successResponse } from '@/lib/utils/api-response'
import * as SystemSettingsService from '@/services/system-settings.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  void ctx
  const settings = await SystemSettingsService.getSystemSettings(req.user)
  return successResponse(settings)
}

const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  void ctx
  const body = await req.json()
  const settings = await SystemSettingsService.updateSystemSettings(body, req.user)
  return successResponse(settings, 'System settings updated successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'settings.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'settings.manage')(patchHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
