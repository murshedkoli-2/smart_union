import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import { PERMISSIONS } from '@/constants/permissions'
import * as SystemSettingsService from '@/services/system-settings.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  void ctx
  const body = await req.json()
  const aiStudio = await SystemSettingsService.updateAiStudioConfig(body, req.user)
  return successResponse({ ai_studio: aiStudio }, 'AI Studio settings updated successfully')
}

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], PERMISSIONS.SETTINGS_MANAGE)(patchHandler)),
)
