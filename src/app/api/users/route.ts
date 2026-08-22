import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { createdResponse, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/utils/pagination'
import * as UserService from '@/services/user.service'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

// GET /api/users — list users (secretary only)
const getHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  const { searchParams } = new URL(req.url)
  const query = {
    role: searchParams.get('role') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    ...parsePagination(searchParams),
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
)

export const POST = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'], 'user.manage')(postHandler)),
)
