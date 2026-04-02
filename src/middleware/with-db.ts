import type { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { errorResponse } from '@/lib/utils/api-response'
import type { RouteContext } from '@/types/api.types'

type Handler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse | Response>

/**
 * Ensures DB connection is established before the route handler runs.
 * No-op if connection already exists (cached singleton).
 */
export function withDb(handler: Handler): Handler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      await connectDB()
    } catch (err) {
      console.error('[DB connection error]', err)
      return errorResponse(err)
    }
    try {
      return await handler(req, ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}
