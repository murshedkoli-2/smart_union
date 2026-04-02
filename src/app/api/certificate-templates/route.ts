import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse, errorResponse } from '@/lib/utils/api-response'
import * as CertificateService from '@/services/certificate.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/certificate-templates — list templates
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const isActiveParam = searchParams.get('is_active')
  const query = {
    language: searchParams.get('language') ?? undefined,
    template_type: searchParams.get('template_type') ?? undefined,
    certificate_category: searchParams.get('certificate_category') ?? undefined,
    is_active: isActiveParam !== null ? isActiveParam === 'true' : undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  }
  const result = await CertificateService.listTemplates(query, req.user)
  return paginatedResponse(result.templates, result.total, result.page, result.limit)
}

// POST /api/certificate-templates — create template
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const template = await CertificateService.createTemplate(body, req.user)
  return createdResponse(template, 'Certificate template created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'template.manage')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
