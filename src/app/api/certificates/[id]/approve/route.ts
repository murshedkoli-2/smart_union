import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import { PERMISSIONS } from '@/constants/permissions'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/certificates/[id]/approve
//
// Fee collection and approval happen in one transaction inside the service.
// This handler only parses the request — orchestrating the two here previously
// meant a failure between them banked money for a certificate never issued.
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const rawBody = await req.text()
  const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}

  const result = await CertificateService.approveCertificate(id, req.user, {
    collect_payment: body.collect_payment === true,
    amount: body.amount === undefined ? undefined : Number(body.amount),
    note: typeof body.note === 'string' ? body.note : undefined,
  })

  return successResponse(result, 'Certificate approved successfully')
}

export const POST = withDb(
  authenticate(
    authorize(['secretary', 'entrepreneur'], PERMISSIONS.CERTIFICATE_APPROVE)(postHandler),
  ),
)
