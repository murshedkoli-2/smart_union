'use client'

/**
 * Dashboard.
 *
 * Two entirely different screens behind one route: a citizen sees their own
 * documents and taxes, staff see union-wide totals and the audit trail. Only
 * the greeting is shared, so each lives in its own component.
 */
import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiCall } from '@/lib/utils/api-client'
import { useUser } from '@/hooks/useUser'
import type { DashboardStats } from '@/types/dashboard.types'
import CitizenDashboard from './CitizenDashboard'
import StaffDashboard from './StaffDashboard'

export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const user = useUser()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiCall('/api/dashboard/stats')
      .then((res) => res.json())
      .then((body) => {
        if (body.success) setStats(body.data)
        else setError(body.message)
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm animate-pulse">{t('loadingDashboard')}</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error ?? 'Failed to load stats'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('welcomeBack')}, {user?.name ?? 'Admin'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('fiscalYear')}:{' '}
            <span className="font-medium text-gray-700">{stats.fiscal_year}</span>
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          {new Date().toLocaleDateString('en-BD', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {stats.is_citizen ? (
        <CitizenDashboard
          stats={stats}
          lang={lang}
          name={user?.name ?? (lang === 'bn' ? 'নাগরিক' : 'Citizen')}
        />
      ) : (
        <StaffDashboard stats={stats} t={t} />
      )}
    </div>
  )
}
