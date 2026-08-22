import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from './jwt'
import { ACCESS_TOKEN_COOKIE } from './cookies'
import { connectDB } from '@/lib/db/mongoose'
import type { JwtAccessPayload } from '@/types/auth.types'
import type { Role } from '@/constants/roles'
import type { Permission } from '@/constants/permissions'

/**
 * Authenticates a Server Component from the httpOnly access-token cookie.
 *
 * This is what makes Server Components possible here: because the access token
 * is an httpOnly cookie rather than a value held in sessionStorage, a server
 * render can read and verify it directly and then call the service layer — no
 * HTTP round-trip back into the app's own API just to fetch a list.
 *
 * The token is fully verified (signature and exp), so this is a real
 * authorization boundary, unlike the presence check in proxy.ts.
 *
 * Returns null rather than throwing when there is no valid session, so callers
 * can decide between redirecting and rendering a signed-out state.
 */
export async function getServerActor(): Promise<JwtAccessPayload | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    return verifyAccessToken(token)
  } catch {
    // Expired or invalid. The client refreshes on its next API call; a page
    // render must not treat this as fatal.
    return null
  }
}

/**
 * getServerActor plus a DB connection, redirecting to /login when signed out.
 *
 * Use in a Server Component that is about to call the service layer.
 */
export async function requireServerActor(from: string): Promise<JwtAccessPayload> {
  const actor = await getServerActor()
  if (!actor) redirect(`/login?from=${encodeURIComponent(from)}`)
  await connectDB()
  return actor
}

/**
 * requireServerActor plus the same role/permission gate the API routes apply.
 *
 * Mirrors middleware/authorize deliberately: a Server Component that calls the
 * service layer directly bypasses the route middleware, so the check has to be
 * repeated here or the page would be a hole around it.
 */
export async function requireServerPermission(
  from: string,
  roles: Role[],
  permission?: Permission,
): Promise<JwtAccessPayload> {
  const actor = await requireServerActor(from)

  if (!roles.includes(actor.role)) redirect('/dashboard')

  // Only entrepreneurs carry granular permissions; secretary bypasses.
  if (permission && actor.role === 'entrepreneur' && !actor.permissions.includes(permission)) {
    redirect('/dashboard')
  }

  return actor
}

/**
 * Makes service-layer output safe to hand to a Client Component.
 *
 * Mongoose lean() documents carry ObjectId and Date instances, which are not
 * serializable across the server/client boundary — React throws rather than
 * silently dropping them. This flattens both to strings.
 */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
