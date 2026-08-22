import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// POST /api/citizens/[id]/tax/[taxId]/pay — pay holding tax for citizen
const postHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id, taxId } = await ctx.params
  const result = await TaxService.payTaxForCitizen(id, taxId, req.user)
  return successResponse(result, 'Holding tax paid successfully')
}

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.collect')(postHandler)),
)
