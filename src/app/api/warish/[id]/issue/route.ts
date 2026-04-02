import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as WarishService from '@/services/warish.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/warish/[id]/issue  — body: { language: 'bn' | 'en' }
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const body = await req.json()
  const language = body?.language === 'en' ? 'en' : 'bn'
  const certificate = await WarishService.issueWarishCertificate(id, language, req.user)
  return successResponse(certificate, `${language.toUpperCase()} certificate created successfully`)
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'warish.create')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
