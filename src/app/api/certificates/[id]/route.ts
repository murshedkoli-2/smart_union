import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/certificates/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const certificate = await CertificateService.getCertificateById(id, req.user)
  return successResponse(certificate)
}

// PATCH /api/certificates/[id]
const patchHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const certificate = await CertificateService.updateCertificate(id, body, req.user)
  return successResponse(certificate, 'Certificate updated successfully')
}

// DELETE /api/certificates/[id]
const deleteHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  await CertificateService.deleteCertificate(id, req.user)
  return successResponse(null, 'Certificate deleted successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'certificate.view')(getHandler)),
)

export const PATCH = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'certificate.create')(patchHandler)),
)

export const DELETE = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(deleteHandler)),
)
