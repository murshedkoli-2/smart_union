import type { NextRequest } from 'next/server'
import { hit, clientIp, type RateLimitOptions } from '@/lib/security/rate-limit'
import { errorResponse } from '@/lib/utils/api-response'
import { TooManyRequestsError } from '@/lib/utils/errors'
import type { RouteContext, RouteHandler } from '@/types/api.types'

/**
 * Rejects a caller that exceeds `options` within the window.
 *
 * `bucket` namespaces the counter so two endpoints sharing an IP do not
 * consume each other's budget. Place this OUTERMOST in the wrapper chain so a
 * throttled request never reaches the database.
 */
export function withRateLimit(bucket: string, options: RateLimitOptions) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, ctx: RouteContext) => {
      const result = hit(`${bucket}:${clientIp(req)}`, options)

      if (!result.allowed) {
        const response = errorResponse(new TooManyRequestsError(result.retryAfter))
        response.headers.set('Retry-After', String(result.retryAfter))
        return response
      }

      return handler(req, ctx)
    }
  }
}
