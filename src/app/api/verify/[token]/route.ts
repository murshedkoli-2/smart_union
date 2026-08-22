import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { withRateLimit } from '@/middleware/rate-limit'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { NotFoundError } from '@/lib/utils/errors'
import { isVerificationToken } from '@/lib/utils/verification-token'
import { RATE_LIMITS } from '@/lib/security/rate-limit'
import Certificate from '@/models/Certificate'
import type { RouteContext } from '@/types/api.types'

/**
 * GET /api/verify/[token] — PUBLIC, no auth required.
 *
 * The route param is a `verification_token`, NOT a certificate number.
 * Certificate numbers are sequential, so accepting one here turned the whole
 * citizen register into a scrapeable list.
 *
 * The response is deliberately minimal: enough to confirm a document in hand
 * is genuine, and nothing more. Address is not returned — a verifier already
 * holds the paper certificate, and anyone who does not should not learn where
 * the citizen lives.
 */
async function handler(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { token } = await ctx.params

  // Reject anything that is not token-shaped before touching the database, so
  // a scraper walking certificate numbers costs nothing to serve.
  if (!isVerificationToken(token)) {
    throw new NotFoundError('Certificate not found')
  }

  const cert = await Certificate.findOne({ verification_token: token })
    .populate('citizen_id', 'name_bn name_en')
    .populate('approved_by', 'name')
    .lean()

  if (!cert) {
    throw new NotFoundError('Certificate not found')
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
    'Certificate is valid',
  )
}

export const GET = withRateLimit('verify', RATE_LIMITS.verify)(
  withDb((req, ctx) => handler(req, ctx).catch(errorResponse)),
)
