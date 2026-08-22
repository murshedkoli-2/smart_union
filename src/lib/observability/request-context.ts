import { AsyncLocalStorage } from 'node:async_hooks'
import type { NextRequest } from 'next/server'

/**
 * Per-request context, carried implicitly for the life of a request.
 *
 * The audit trail needs the caller's IP and user agent, but the services that
 * write audit entries only receive a JWT payload — they never see the request.
 * Threading a request object through every service signature would touch every
 * function in the layer for one cross-cutting concern, so it rides in
 * AsyncLocalStorage instead: withDb() opens the scope, createAuditLog() reads
 * it, nothing in between needs to know.
 *
 * Requires the Node.js runtime (the default for route handlers). Reading
 * outside a request scope returns undefined rather than throwing, so anything
 * running off the request path — scripts, seeds — still works.
 */
export interface RequestContext {
  ip?: string
  userAgent?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is caller-controlled unless a trusted proxy overwrites it,
 * so treat a logged IP as evidence, not proof, unless the deployment
 * terminates at a proxy that sets the header itself.
 */
function extractIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || undefined
}

export function fromRequest(req: NextRequest): RequestContext {
  return {
    ip: extractIp(req),
    // Cap the length — this is attacker-controlled and lands in the database.
    userAgent: req.headers.get('user-agent')?.slice(0, 512) || undefined,
  }
}

/** Runs `fn` with `context` available to everything it awaits. */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn)
}

/** Current request context, or undefined when called off the request path. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}
