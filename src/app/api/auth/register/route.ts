import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { createdResponse, errorResponse } from '@/lib/utils/api-response'
import * as AuthService from '@/services/auth.service'
import type { RouteContext } from '@/types/api.types'

async function handler(req: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  const body = await req.json()
  const result = await AuthService.register(body)
  return createdResponse(result, 'Registration successful. Your account is pending approval.')
}

export const POST = withDb((req, ctx) =>
  handler(req, ctx).catch(errorResponse),
)
