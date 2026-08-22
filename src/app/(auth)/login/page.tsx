'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

interface LoginForm {
  email: string
  password: string
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/dashboard'
  const { t } = useLanguage()

  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Login failed')
        return
      }

      // Tokens are set by the server as httpOnly cookies and are deliberately
      // not readable here. Only non-sensitive display state is cached.
      sessionStorage.setItem('user', JSON.stringify(data.data.user))

      router.push(from)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (email: string, pass: string) => {
    setForm({ email, password: pass })
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Login failed')
        return
      }

      sessionStorage.setItem('user', JSON.stringify(data.data.user))

      router.push(from)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.svg"
              alt={t('appName')}
              width={64}
              height={64}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('appName')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('appSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('signIn')}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                suppressHydrationWarning
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           disabled:bg-gray-100"
                placeholder="admin@smartunion.gov.bd"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                suppressHydrationWarning
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           disabled:bg-gray-100"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-700 hover:bg-green-800 text-white font-medium
                         rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>

          {/* Quick Login Buttons (Demo) */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">Quick Login (Demo)</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@smartunion.gov.bd', 'Admin@1234!Smart')}
                disabled={loading}
                className="w-full py-2 px-4 border border-green-600 text-green-700 hover:bg-green-50 font-medium rounded-md text-sm transition-colors disabled:opacity-50"
              >
                Login as Secretary
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('entrepreneur@smartunion.gov.bd', 'password123')}
                disabled={loading}
                className="w-full py-2 px-4 border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium rounded-md text-sm transition-colors disabled:opacity-50"
              >
                Login as Entrepreneur
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('citizen@smartunion.gov.bd', 'password123')}
                disabled={loading}
                className="w-full py-2 px-4 border border-orange-600 text-orange-700 hover:bg-orange-50 font-medium rounded-md text-sm transition-colors disabled:opacity-50"
              >
                Login as Citizen
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            {t('newCitizen')}{' '}
            <Link href="/register" className="text-green-700 hover:underline font-medium">
              {t('registerHere')}
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          {t('govLine')}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
