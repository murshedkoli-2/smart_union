'use client'

import { useState, useEffect } from 'react'

export interface AppUser {
  name: string
  role: string
  email: string
  sub?: string
  permissions?: string[]
}

/**
 * Returns the currently logged-in user from sessionStorage.
 * Returns null on the server or before the effect runs (hydration safe).
 */
export function useUser(): AppUser | null {
  const [user, setUser] = useState<AppUser | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        // ignore malformed JSON
      }
    }
  }, [])

  return user
}

export const isSuperAdmin = (user: AppUser | null): boolean =>
  user?.role === 'secretary'

export const hasPermission = (user: AppUser | null, permission: string): boolean => {
  if (!user) return false
  if (user.role === 'secretary') return true
  if (user.role === 'entrepreneur') return user.permissions?.includes(permission) ?? false
  return false
}
