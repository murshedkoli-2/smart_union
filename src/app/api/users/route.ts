import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, createdResponse, paginatedResponse, errorResponse } from '@/lib/utils/api-response'
import * as UserService from '@/services/user.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/users — list users (secretary only)
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    role: searchParams.get('role') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  }
  const result = await UserService.listUsers(query, req.user)
  return paginatedResponse(result.users, result.total, result.page, result.limit)
}

// POST /api/users — create admin (secretary only)
const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const body = await req.json()
  const admin = await UserService.createAdmin(body, req.user)
  return createdResponse(admin, 'Admin created successfully')
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'user.manage')(getHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'user.manage')(postHandler)),
) as (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>

export { errorResponse }
