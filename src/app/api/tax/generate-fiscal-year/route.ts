import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as TaxService from '@/services/tax.service'
import { getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import type { AuthenticatedRequest } from '@/types/api.types'

/**
 * POST /api/tax/generate-fiscal-year
 * Creates tax records for all families for a new fiscal year.
 * Only secretary can run this operation.
 *
 * Body:
 *   fiscal_year (optional): fiscal year to generate (defaults to current)
 *   default_amount (optional): default tax amount (defaults to 1000)
 */
const postHandler = async (req: AuthenticatedRequest): Promise<NextResponse> => {
  const body = await req.json()
  const fiscalYear = body.fiscal_year ?? getCurrentFiscalYear()
  const defaultAmount = body.default_amount ?? 1000

  const result = await TaxService.createTaxForNewFiscalYear(
    fiscalYear,
    defaultAmount,
    req.user
  )

  return successResponse(
    result,
    `Tax generation completed: ${result.created} created, ${result.skipped} skipped`
  )
}

export const POST = withDb(
  authenticate(authorize(['secretary'], 'tax.create')(postHandler)),
)
