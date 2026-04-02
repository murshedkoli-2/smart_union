import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import * as PaymentService from '@/services/payment.service'
import { BadRequestError } from '@/lib/utils/errors'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/certificates/[id]/approve
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const rawBody = await req.text()
  const body = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {}
  const certificateDetails = await CertificateService.getCertificateById(id, req.user) as Record<string, unknown>
  const citizen = certificateDetails.citizen_id as { _id?: string } | null
  const template = certificateDetails.template_id as { fee?: number } | null

  let payment: unknown = null
  const amount = Number(body.amount ?? template?.fee ?? 0)

  if (!certificateDetails.payment_id && amount > 0 && body.collect_payment !== true) {
    throw new BadRequestError('Cash payment must be collected before approval')
  }

  if (body.collect_payment === true && !certificateDetails.payment_id) {
    const rawCitizenId = citizen?._id as unknown
    const citizenId =
      typeof rawCitizenId === 'string'
        ? rawCitizenId
        : rawCitizenId && typeof rawCitizenId === 'object' && 'toString' in rawCitizenId
          ? rawCitizenId.toString()
          : ''

    if (!citizenId) {
      throw new BadRequestError('Citizen information is required for payment collection')
    }

    if (amount > 0) {
      const paymentNote =
        typeof certificateDetails.certificate_no === 'string' && certificateDetails.certificate_no.trim()
          ? `Cash payment for certificate ${certificateDetails.certificate_no}`
          : 'Cash payment for certificate approval'

      payment = await PaymentService.collectPayment({
        payment_type: 'certificate',
        source_type: certificateDetails.language === 'bn' ? 'certificate_bn' : 'certificate_en',
        reference_id: id,
        amount,
        paid_by_citizen: citizenId,
        note: String(body.note ?? paymentNote),
      }, req.user)

      await CertificateService.updateCertificate(id, {
        payment_id: (payment as { _id: string })._id,
      }, req.user)
    }
  }

  if (certificateDetails.payment_id) {
    payment = certificateDetails.payment_id
  }

  const certificate = await CertificateService.approveCertificate(id, req.user)
  return successResponse({ certificate, payment }, 'Certificate approved successfully')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'certificate.approve')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
