'use client'

import { useSessionValue } from './useSessionValue'

export const USER_STORAGE_KEY = 'user'

export interface AppUser {
  name: string
  role: string
  email: string
  sub?: string
  permissions?: string[]
}

/**
 * Returns the currently logged-in user's display details from sessionStorage.
 * Returns null on the server (hydration safe) and when signed out.
 *
 * This is UI state only — name, role, permissions for showing and hiding
 * controls. It is not an authorization decision: the server re-checks role and
 * permissions on every request from the signed JWT.
 */
export function useUser(): AppUser | null {
  return useSessionValue<AppUser>(USER_STORAGE_KEY)
}

export const isSuperAdmin = (user: AppUser | null): boolean =>
  user?.role === 'secretary'

export const hasPermission = (user: AppUser | null, permission: string): boolean => {
  if (!user) return false
  if (user.role === 'secretary') return true
  if (user.role === 'entrepreneur') return user.permissions?.includes(permission) ?? false
  return false
}
