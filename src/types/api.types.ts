import type { NextRequest } from 'next/server'
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

export type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext,
) => Promise<Response>

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  ctx: RouteContext,
) => Promise<Response>
