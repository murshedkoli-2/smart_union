import type { NextRequest, NextResponse } from 'next/server'
import type { JwtAccessPayload } from './auth.types'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Extends NextRequest to carry the authenticated user payload
export interface AuthenticatedRequest extends NextRequest {
  user: JwtAccessPayload
}

export type RouteContext = {
  params: Promise<Record<string, string>>
}

/**
 * A route handler after the middleware chain has been applied.
 *
 * Every wrapper — withDb, authenticate, authorize, withRateLimit — takes and
 * returns this exact shape, so `withDb(authenticate(authorize(...)(h)))`
 * composes to something Next.js accepts as a route export directly. Route
 * files used to end with `as (req: NextRequest, ctx: RouteContext) =>
 * Promise<NextResponse>` because the wrappers each declared slightly different
 * return types (`NextResponse | Response`) that would not line up.
 */
export type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext,
) => Promise<NextResponse>

/** A handler that runs after authenticate() has attached req.user. */
export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  ctx: RouteContext,
) => Promise<NextResponse>
