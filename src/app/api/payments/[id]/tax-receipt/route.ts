import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import * as PaymentService from '@/services/payment.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/payments/[id]/tax-receipt
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const receiptData = await PaymentService.getTaxPaymentReceiptData(id, req.user)
  return successResponse(receiptData)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'tax.view')(getHandler)),
)
