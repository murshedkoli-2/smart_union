'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, hasPermission } from '@/hooks/useUser'
import type { Permission } from '@/constants/permissions'

/**
 * Renders `children` only for a user holding `permission`.
 *
 * Pages used to do this inline with an early `return null` placed above their
 * data hooks. That changes how many hooks run between renders — React's
 * "rendered fewer hooks than expected" crash — because the user starts
 * unknown and resolves a moment later. Gating at the boundary means the page
 * body mounts already authorized and its hooks run unconditionally for its
 * whole lifetime.
 *
 * This is UI only. It hides controls and avoids a pointless request; the
 * server independently re-checks role and permission on every API call, so a
 * user who edits their cached profile gains nothing.
 */
export default function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: React.ReactNode
}) {
  const router = useRouter()
  const user = useUser()

  const allowed = user !== null && hasPermission(user, permission)

  useEffect(() => {
    if (user !== null && !allowed) router.replace('/dashboard')
  }, [user, allowed, router])

  if (user === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}
