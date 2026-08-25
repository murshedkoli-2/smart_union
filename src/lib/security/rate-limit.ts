/**
 * Fixed-window rate limiter for unauthenticated endpoints.
 *
 * IMPORTANT — deployment note: state lives in the process heap, so limits are
 * enforced *per instance*. On a single container this is correct. Behind a
 * load balancer or on a serverless platform that spins up many instances, an
 * attacker's effective budget is (limit × instance count). Before scaling out,
 * swap `hit()` for a Redis backend (Upstash via the Vercel Marketplace) —
 * the call sites do not need to change.
 */

import type { NextRequest } from 'next/server'

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()

// Drop expired windows periodically so the map cannot grow without bound.
const SWEEP_INTERVAL_MS = 60_000
let lastSweep = 0

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the current window resets. */
  retryAfter: number
}

export interface RateLimitOptions {
  /** Max requests permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

/**
 * Record a hit against `key` and report whether it is allowed.
 */
export function hit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count += 1

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, remaining: limit - existing.count, retryAfter: 0 }
}

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is client-controlled unless a trusted proxy overwrites it.
 * Deploy behind a proxy that sets it (Vercel, nginx with `proxy_set_header`)
 * — otherwise an attacker rotates the header to reset their own budget.
 */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Preset budgets, tuned for a union-office deployment. */
export const RATE_LIMITS = {
  /** Credential submission — the brute-force surface. */
  login: { limit: 10, windowMs: 15 * 60_000 },
  /** Account creation — public and unauthenticated, so a spam surface. */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** Token refresh — generous; legitimate clients refresh every 13 minutes. */
  refresh: { limit: 60, windowMs: 15 * 60_000 },
  /** Public certificate verification — the scraping surface. */
  verify: { limit: 30, windowMs: 60_000 },
  /**
   * Authenticated writes, keyed per user rather than per IP.
   *
   * Deliberately generous. This is not a defence against a determined insider;
   * it is a ceiling that turns a runaway script or a stolen session into a slow
   * problem rather than thousands of ledger rows a minute. A clerk working
   * quickly does not come near 120 mutations in a minute.
   */
  write: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>
