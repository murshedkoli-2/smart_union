import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse, errorResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/certificates — list certificates
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    language: searchParams.get('language') ?? undefined,
    certificate_type: searchParams.get('certificate_type') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    citizen_id: searchParams.get('citizen_id') ?? undefined,
    fiscal_year: searchParams.get('fiscal_year') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  }
  const result = await CertificateService.listCertificates(query, req.user)
  return paginatedResponse(result.certificates, result.total, result.page, result.limit)
}

// POST /api/certificates — create certificate
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const certificate = await CertificateService.createCertificate(body, req.user)
  return createdResponse(certificate, 'Certificate created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'])(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'], 'certificate.create')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
