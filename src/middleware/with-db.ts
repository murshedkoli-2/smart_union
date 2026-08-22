import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { errorResponse } from '@/lib/utils/api-response'
import { fromRequest, runWithContext } from '@/lib/observability/request-context'
import type { RouteContext, RouteHandler } from '@/types/api.types'

/**
 * Ensures a DB connection exists before the route handler runs (no-op if the
 * cached singleton is already connected), and opens the per-request context
 * scope that the audit log reads its IP and user agent from.
 */
export function withDb(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      await connectDB()
    } catch (err) {
      return errorResponse(err)
    }
    return runWithContext(fromRequest(req), async () => {
      try {
        return await handler(req, ctx)
      } catch (err) {
        return errorResponse(err)
      }
    })
  }
}
