import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/certificates/[id]/lock
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const certificate = await CertificateService.lockCertificate(id, req.user)
  return successResponse(certificate, 'Certificate remains approved and is not editable')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'certificate.approve')(postHandler)),
)
