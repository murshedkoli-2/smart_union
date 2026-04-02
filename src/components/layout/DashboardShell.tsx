'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import { refreshAccessToken } from '@/lib/utils/api-client'
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  name: string
  role: string
  email: string
}

/** Decode the exp claim from a JWT without verifying the signature. */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

// Background refresh interval — refresh every 13 minutes so the 15-minute
// access token never expires while the admin is actively using the app.
const REFRESH_INTERVAL_MS = 13 * 60 * 1000

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { t, lang, setLang } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const token = sessionStorage.getItem('access_token')
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
    } catch {}
    sessionStorage.clear()
    document.cookie = 'access_token=; max-age=0; path=/'
    router.push('/login')
  }

  // On mount: restore user and proactively refresh if the token is expired
  // or about to expire (within 3 minutes). This covers page navigations where
  // the middleware let an expired cookie through.
  useEffect(() => {
    const init = async () => {
      const stored = sessionStorage.getItem('user')
      if (!stored) {
        router.push('/login')
        return
      }

      const token = sessionStorage.getItem('access_token')
      if (token) {
        const expiry = getTokenExpiry(token)
        const expiresInMs = expiry !== null ? expiry - Date.now() : 0
        if (expiresInMs < 3 * 60 * 1000) {
          // Token is expired or expiring in < 3 min — refresh now
          const newToken = await refreshAccessToken()
          if (!newToken) {
            // Refresh token also expired — force re-login
            sessionStorage.clear()
            document.cookie = 'access_token=; max-age=0; path=/'
            router.push('/login')
            return
          }
        }
      }

      try {
        setUser(JSON.parse(stored))
      } catch {
        router.push('/login')
      }
    }

    init()
  }, [router])

  // Background keep-alive: refresh the access token every 13 minutes so
  // admins are never interrupted by a token expiry mid-session.
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        // Refresh token has expired — redirect to login
        sessionStorage.clear()
        document.cookie = 'access_token=; max-age=0; path=/'
        router.push('/login')
      }
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [user, router])

  // Close sidebar when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar: overlay on mobile, sticky on desktop */}
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content column */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* ── Topbar (Desktop & Mobile) ── */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 md:hidden"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm sm:text-base font-bold text-green-800 truncate md:hidden">
              {t('appName')}
            </span>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              title={t('switchLang')}
            >
              {t('switchLang')}
            </button>

            {user.role !== 'citizen' && (
              <>
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                <NotificationBell />
              </>
            )}

            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-50"
                aria-label="User profile"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <p className="text-sm font-medium text-gray-800 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-green-700 text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <svg
                  className={`hidden sm:block h-4 w-4 text-gray-500 transition-transform ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                    {/* Mobile only user info in dropdown */}
                    <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                      <p className="truncate text-sm font-medium text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false)
                        router.push('/profile')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false)
                        handleLogout()
                      }}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {loggingOut ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-inherit border-t-transparent" />
                      ) : (
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {loggingOut ? t('signingOut') : t('signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
