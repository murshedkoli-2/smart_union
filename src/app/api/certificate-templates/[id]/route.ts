import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/certificate-templates/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const template = await CertificateService.getTemplateById(id, req.user)
  return successResponse(template)
}

// PATCH /api/certificate-templates/[id]
const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const template = await CertificateService.updateTemplate(id, body, req.user)
  return successResponse(template, 'Certificate template updated successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(getHandler)),
)

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'template.manage')(patchHandler)),
)
