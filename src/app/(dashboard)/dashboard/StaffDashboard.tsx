'use client'

/** Union-wide totals, collection progress, and the audit trail. */
import Link from 'next/link'
import type { DashboardStats } from '@/types/dashboard.types'
import RecentActivity from './RecentActivity'
import type { TranslationKey } from '@/lib/i18n'

/** The translator from useLanguage, keyed by the i18n dictionary. */
type Translate = (key: TranslationKey) => string

function StatCard({
  label,
  value,
  sub,
  subLabel,
  color,
  icon,
}: {
  label: string
  value: number | string
  sub?: number | string
  subLabel?: string
  color: string
  icon: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {sub !== undefined && (
            <p className="text-xs text-gray-400 mt-1">
              <span className="font-medium text-amber-600">{sub}</span> {subLabel}
            </p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

/** One amber strip summarising everything waiting on a decision. */
function PendingAlerts({ stats, t }: { stats: DashboardStats; t: Translate }) {
  const users = stats.users?.pending ?? 0
  const citizens = stats.citizens?.pending ?? 0
  const certificates = stats.certificates.pending

  if (users + citizens + certificates === 0) return null

  const plural = (count: number, noun: string) => `${noun}${count > 1 ? 's' : ''}`

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
      <span className="font-medium text-amber-800">{t('pendingApprovals')}:</span>
      {users > 0 && (
        <span className="text-amber-700"><strong>{users}</strong> {plural(users, 'user')}</span>
      )}
      {citizens > 0 && (
        <span className="text-amber-700"><strong>{citizens}</strong> {plural(citizens, 'citizen')}</span>
      )}
      {certificates > 0 && (
        <span className="text-amber-700">
          <strong>{certificates}</strong> {plural(certificates, 'certificate')}
        </span>
      )}
    </div>
  )
}

function TaxProgress({ stats, t }: { stats: DashboardStats; t: Translate }) {
  if (stats.tax.total === 0) return null
  const paidPercent = Math.round((stats.tax.paid / stats.tax.total) * 100)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('taxCollection')} — {stats.fiscal_year || ''}
        </h3>
        <span className="text-sm font-bold text-green-700">{paidPercent}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${paidPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1.5">
        <span>{t('paid')}: {stats.tax.paid}</span>
        <span>Total: {stats.tax.total}</span>
      </div>
    </div>
  )
}

function QuickActions({ t }: { t: Translate }) {
  const actions = [
    { href: '/admin/users', label: t('createAdminAction'), color: 'bg-red-50 text-red-700 border-red-200' },
    { href: '/citizens', label: t('addCitizenAction'), color: 'bg-green-50 text-green-700 border-green-200' },
    { href: '/certificates', label: t('newCertificateAction'), color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { href: '/tax', label: t('assessTaxAction'), color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { href: '/admin/audit-logs', label: `📋 ${t('auditLogs')}`, color: 'bg-gray-50 text-gray-700 border-gray-200' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('quickActions')}</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80 ${action.color}`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function StaffDashboard({
  stats,
  t,
}: {
  stats: DashboardStats
  t: Translate
}) {
  return (
    <>
      <PendingAlerts stats={stats} t={t} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('totalCitizens')}
          value={stats.citizens?.total ?? 0}
          sub={stats.citizens?.pending ?? 0}
          subLabel={t('pendingApproval')}
          color="text-green-700"
          icon="👤"
        />
        <StatCard
          label={t('totalCertificates')}
          value={stats.certificates.total}
          sub={stats.certificates.pending}
          subLabel={t('awaitingApproval')}
          color="text-purple-700"
          icon="📜"
        />
        <StatCard
          label={t('approvedCitizens')}
          value={stats.citizens?.approved ?? 0}
          color="text-indigo-700"
          icon="✅"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('systemUsers')}
          value={stats.users?.total ?? 0}
          sub={stats.users?.admins ?? 0}
          subLabel={t('admins')}
          color="text-gray-800"
          icon="👥"
        />
        <StatCard
          label={`${t('taxCollection')} (${stats.fiscal_year || ''})`}
          value={stats.tax.total}
          sub={stats.tax.unpaid}
          subLabel={t('unpaid')}
          color="text-orange-700"
          icon="🏛"
        />
        <StatCard
          label={t('reliefPrograms')}
          value={stats.relief?.active_programs ?? 0}
          subLabel={t('activeProgramsSub')}
          color="text-teal-700"
          icon="🎁"
        />
      </div>

      <TaxProgress stats={stats} t={t} />
      <RecentActivity entries={stats.recent_activity} t={t} />
      <QuickActions t={t} />
    </>
  )
}
