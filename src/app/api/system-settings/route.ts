import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import { PERMISSIONS } from '@/constants/permissions'
import * as SystemSettingsService from '@/services/system-settings.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  void ctx
  const settings = await SystemSettingsService.getSystemSettings()
  return successResponse(settings)
}

const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  void ctx
  const body = await req.json()
  const settings = await SystemSettingsService.updateSystemSettings(body, req.user)
  return successResponse(settings, 'System settings updated successfully')
}

// Read is gated on role only, deliberately.
//
// This previously required the permission 'settings.view', which does not
// exist in PERMISSIONS — so no entrepreneur could ever hold it and every read
// 403'd for them. Secretary bypasses permission checks, which is why it went
// unnoticed. These settings carry the union name, chairman name and logo that
// certificate rendering needs, so any admin role must be able to read them.
export const GET = withDb(authenticate(authorize(['secretary', 'entrepreneur'])(getHandler)))

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], PERMISSIONS.SETTINGS_MANAGE)(patchHandler)),
)
