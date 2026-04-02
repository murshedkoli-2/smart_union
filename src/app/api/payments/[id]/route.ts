import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import * as PaymentService from '@/services/payment.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/payments/[id]
const getHandler = async (req: AuthenticatedRequest, ctx: RouteContext): Promise<NextResponse> => {
  const { id } = await ctx.params
  const payment = await PaymentService.getPaymentById(id, req.user)
  return successResponse(payment)
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'payment.view')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
