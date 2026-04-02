import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { NotFoundError } from '@/lib/utils/errors'
import Certificate from '@/models/Certificate'
import type { RouteContext } from '@/types/api.types'

// GET /api/verify/[certificate_no] — PUBLIC, no auth required
async function handler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { certificate_no } = await ctx.params

  const cert = await Certificate.findOne({ certificate_no })
    .populate('citizen_id', 'name_bn name_en address')
    .populate('approved_by', 'name')
    .lean()

  if (!cert) {
    throw new NotFoundError(`Certificate ${certificate_no} not found`)
  }

  const normalizedStatus = cert.status === 'locked' ? 'approved' : cert.status
  const isValid = normalizedStatus === 'approved'

  if (!isValid) {
    return successResponse(
      {
        valid: false,
        certificate_no: cert.certificate_no,
        status: normalizedStatus,
      },
      normalizedStatus === 'pending'
        ? 'Certificate is pending approval'
        : 'Certificate is not available for verification',
    )
  }

  return successResponse(
    {
      valid: isValid,
      certificate_no: cert.certificate_no,
      language: cert.language,
      certificate_type: cert.certificate_type,
      status: normalizedStatus,
      citizen: cert.citizen_id,
      approved_by: cert.approved_by,
      approved_at: cert.approved_at,
      fiscal_year: cert.fiscal_year,
    },
    isValid ? 'Certificate is valid' : 'Certificate is not yet approved',
  )
}

export const GET = withDb((req, ctx) =>
  handler(req, ctx).catch(errorResponse),
)
