'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiCall } from '@/lib/utils/api-client'
import { useUser } from '@/hooks/useUser'

interface Stats {
  fiscal_year: string
  is_citizen?: boolean
  citizen_status?: string
  users?: { total: number; pending: number; admins: number }
  citizens?: { total: number; pending: number; approved: number }
  certificates: { total: number; pending: number; approved: number }
  tax: { total: number; paid: number; unpaid: number }
  relief?: { active_programs: number }
  recent_activity?: {
    _id: string
    action: string
    target_model: string
    status: string
    createdAt: string
    user_id: { name: string; role: string } | null
  }[]
}

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

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: 'bg-green-100 text-green-700',
    logout: 'bg-gray-100 text-gray-600',
    register: 'bg-blue-100 text-blue-700',
    create: 'bg-purple-100 text-purple-700',
    approve: 'bg-teal-100 text-teal-700',
    update: 'bg-yellow-100 text-yellow-700',
    delete: 'bg-red-100 text-red-700',
  }
  const key = Object.keys(colors).find((k) => action.includes(k)) ?? 'create'
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[key]}`}>
      {action}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const user = useUser()

  useEffect(() => {
    apiCall('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data)
        else setError(d.message)
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

  const taxPaidPct = stats.tax.total > 0 ? Math.round((stats.tax.paid / stats.tax.total) * 100) : 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
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
        <>
          {/* Dashboard Welcome Header */}
          <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-900 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10 relative">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white opacity-10 blur-3xl"></div>
            <div className="absolute -bottom-10 right-32 h-32 w-32 rounded-full bg-emerald-400 opacity-20 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{lang === 'bn' ? `স্মার্ট ইউনিয়নে স্বাগতম, ${user?.name ?? 'নাগরিক'}!` : `Welcome to Smart Union, ${user?.name ?? 'Citizen'}!`}</h2>
                <p className="text-emerald-50 text-sm max-w-xl leading-relaxed">
                  {lang === 'bn' ? 'আপনার হাতের মুঠোয় নির্বিঘ্ন ইউনিয়ন সেবা। সার্টিফিকেট থেকে শুরু করে হোল্ডিং ট্যাক্স, অনলাইনে সহজেই আপনার নাগরিক দায়িত্ব এবং আবেদন পরিচালনা করুন।' : 'Experience seamless union services at your fingertips. From certificates to holding taxes, manage your civic responsibilities and applications effortlessly online.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row shrink-0 gap-3">
                <Link href="/certificates" className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-5 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-white/20 hover:scale-[1.02] shadow-sm">
                  {lang === 'bn' ? 'সার্টিফিকেটের আবেদন' : 'Apply Certificate'}
                </Link>
                <Link href="/tax" className="rounded-xl bg-white px-5 py-2.5 text-center text-sm font-bold text-teal-800 shadow-md transition-all hover:bg-emerald-50 hover:scale-[1.02] hover:shadow-lg">
                  {lang === 'bn' ? 'ট্যাক্স পরিশোধ করুন' : 'Pay Your Tax'}
                </Link>
              </div>
            </div>
          </div>

          {!stats.citizen_status ? (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex shrink-0 items-center justify-center h-10 w-10 bg-blue-100 rounded-full text-blue-600 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-900">{lang === 'bn' ? 'প্রোফাইল সেটআপ সম্পন্ন করুন' : 'Complete Your Setup'}</h3>
                  <p className="text-sm text-blue-700 mt-1 max-w-2xl">
                    {lang === 'bn' ? 'সমস্ত ইউনিয়ন পরিষেবা আনলক করতে আপনাকে আপনার প্রোফাইল সম্পূর্ণ করতে হবে। নিশ্চিত করুন আপনার ঠিকানা এবং এনআইডি তথ্য যাচাইকৃত।' : 'You need to complete your profile structure to unlock all union services natively. Ensure your address and NID info is verified to proceed.'}
                  </p>
                </div>
              </div>
              <Link href="/citizens/profile" className="shrink-0 text-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md">
                {lang === 'bn' ? 'প্রোফাইল সেটআপ করুন \u2192' : 'Setup Profile \u2192'}
              </Link>
            </div>
          ) : stats.citizen_status === 'pending' ? (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex shrink-0 items-center justify-center h-10 w-10 bg-amber-100 rounded-full text-amber-600 sm:mt-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">{lang === 'bn' ? 'প্রোফাইল পর্যালোচনার অধীনে আছে' : 'Profile Under Review'}</h3>
                <p className="text-sm text-amber-800 mt-0.5 max-w-2xl">
                  {lang === 'bn' ? 'আপনার জমাকৃত প্রোফাইল ইউনিয়ন অনুমোদনের অপেক্ষায় রয়েছে। আপনার যাচাইকরণ সম্পন্ন হওয়ার সাথে সাথে আপনি আবেদন শুরু করতে পারবেন।' : 'Your submitted profile is waiting for union approval. You can start applying right after your verification is complete.'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Link href="/certificates" className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 block">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] transition-transform duration-500 group-hover:scale-125">📜</div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600/70">{lang === 'bn' ? 'আমার সার্টিফিকেটসমূহ' : 'My Certificates'}</p>
              <p className="mt-3 text-4xl font-black text-amber-700 tracking-tight">{stats.certificates.total}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700/80 bg-amber-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-amber-200/50">
                <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {stats.certificates.pending} {lang === 'bn' ? 'অপেক্ষমাণ' : 'pending'}
              </div>
            </Link>

            <Link href="/certificates" className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 block">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] transition-transform duration-500 group-hover:scale-125">✅</div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">{lang === 'bn' ? 'অনুমোদিত ও প্রস্তুত' : 'Approved & Ready'}</p>
              <p className="mt-3 text-4xl font-black text-emerald-700 tracking-tight">{stats.certificates.approved}</p>
              <div className="mt-4 text-xs font-bold text-emerald-700/80 bg-emerald-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-emerald-200/50">
                {lang === 'bn' ? 'যাচাইকৃত নথিপত্র' : 'Verified Documents'}
              </div>
            </Link>

            <Link href="/tax" className="group relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 block">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] transition-transform duration-500 group-hover:scale-125">🏛</div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600/70">{lang === 'bn' ? 'পরিশোধিত ট্যাক্স' : 'Taxes Settled'}</p>
              <p className="mt-3 text-4xl font-black text-teal-700 tracking-tight">৳ {stats.tax.paid.toLocaleString()}</p>
              <div className="mt-4 text-xs font-bold text-teal-700/80 bg-teal-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-teal-200/50 mb-0.5">
                {lang === 'bn' ? 'চলতি অর্থবছর' : 'Current Fiscal Year'}
              </div>
            </Link>

            <div className="group relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] transition-transform duration-500 group-hover:scale-125">⚠️</div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600/70">{lang === 'bn' ? 'বকেয়া ট্যাক্স' : 'Taxes Unpaid'}</p>
              <p className="mt-3 text-4xl font-black text-rose-700 tracking-tight">৳ {stats.tax.unpaid.toLocaleString()}</p>
              {stats.tax.unpaid > 0 ? (
                <div className="mt-4">
                  <Link href="/tax" className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 underline decoration-rose-200/50 underline-offset-4 decoration-2">
                    {lang === 'bn' ? 'পরিশোধ করুন ' : 'Pay Now '}<span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-xs font-bold text-rose-700/80 bg-rose-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-rose-200/50 mb-0.5">
                  {lang === 'bn' ? 'সব ক্লিয়ার' : 'All Clear'}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{lang === 'bn' ? 'আপনার দ্রুত সেবাসমূহ' : 'Your Quick Services'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link href="/certificates" className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-3 shadow-sm group-hover:shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{lang === 'bn' ? 'ডিজিটাল সার্টিফিকেটসমূহ' : 'Digital Certificates'}</h4>
              <p className="mt-2 text-xs font-medium text-gray-500 leading-relaxed max-w-xs">
                {lang === 'bn' ? 'ইউনিয়ন পোর্টালের মাধ্যমে নিরাপদে নাগরিকত্ব, চারিত্রিক বা ট্রেড লাইসেন্স সার্টিফিকেটের জন্য আবেদন করুন।' : 'Apply for citizenship, character, or trade license certificates securely through your union portal.'}
              </p>
              <div className="mt-auto pt-4 flex items-center text-xs font-bold text-emerald-600 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                {lang === 'bn' ? 'আবেদন করুন \u2192' : 'Apply Now \u2192'}
              </div>
            </Link>
            
            <Link href="/warish" className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-purple-200 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-3 shadow-sm group-hover:shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{lang === 'bn' ? 'ওয়ারিশ ও পরিবার' : 'Warish & Family'}</h4>
              <p className="mt-2 text-xs font-medium text-gray-500 leading-relaxed max-w-xs">
                {lang === 'bn' ? 'অনলাইনে সহজেই ওয়ারিশ বা পারিবারিক সনদের জন্য আবেদন করুন।' : 'Request structured verified inheritance (Warish) or family certificates easily online.'}
              </p>
              <div className="mt-auto pt-4 flex items-center text-xs font-bold text-purple-600 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                {lang === 'bn' ? 'আবেদন করুন \u2192' : 'Request \u2192'}
              </div>
            </Link>

            <Link href="/tax" className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-orange-200 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-3 shadow-sm group-hover:shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{lang === 'bn' ? 'হোল্ডিং ট্যাক্স' : 'Holding Taxes'}</h4>
              <p className="mt-2 text-xs font-medium text-gray-500 leading-relaxed max-w-xs">
                {lang === 'bn' ? 'স্বয়ংক্রিয় এবং স্বচ্ছ পেমেন্ট রেকর্ডের মাধ্যমে আপনার হোল্ডিং অ্যাসেসমেন্ট ট্র্যাক এবং পূরণ করুন।' : 'Track and fulfill your holding assessments with automated transparent payment records.'}
              </p>
              <div className="mt-auto pt-4 flex items-center text-xs font-bold text-orange-600 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                {lang === 'bn' ? 'ট্যাক্স দেখুন \u2192' : 'View Taxes \u2192'}
              </div>
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Pending alerts */}
          {((stats.users?.pending || 0) > 0 || (stats.citizens?.pending || 0) > 0 || stats.certificates.pending > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-amber-800">{t('pendingApprovals')}:</span>
              {(stats.users?.pending || 0) > 0 && (
                <span className="text-amber-700"><strong>{stats.users?.pending}</strong> user{(stats.users?.pending || 0) > 1 ? 's' : ''}</span>
              )}
              {(stats.citizens?.pending || 0) > 0 && (
                <span className="text-amber-700"><strong>{stats.citizens?.pending}</strong> citizen{(stats.citizens?.pending || 0) > 1 ? 's' : ''}</span>
              )}
              {stats.certificates.pending > 0 && (
                <span className="text-amber-700"><strong>{stats.certificates.pending}</strong> certificate{stats.certificates.pending > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Stat cards — row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('totalCitizens')} value={stats.citizens?.total ?? 0} sub={stats.citizens?.pending ?? 0} subLabel={t('pendingApproval')} color="text-green-700" icon="👤" />
            <StatCard label={t('totalCertificates')} value={stats.certificates.total} sub={stats.certificates.pending} subLabel={t('awaitingApproval')} color="text-purple-700" icon="📜" />
            <StatCard label={t('approvedCitizens')} value={stats.citizens?.approved ?? 0} color="text-indigo-700" icon="✅" />
          </div>

          {/* Stat cards — row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('systemUsers')} value={stats.users?.total ?? 0} sub={stats.users?.admins ?? 0} subLabel={t('admins')} color="text-gray-800" icon="👥" />
            <StatCard label={`${t('taxCollection')} (${stats.fiscal_year || ''})`} value={stats.tax.total} sub={stats.tax.unpaid} subLabel={t('unpaid')} color="text-orange-700" icon="🏛" />
            <StatCard label={t('reliefPrograms')} value={stats.relief?.active_programs ?? 0} subLabel={t('activeProgramsSub')} color="text-teal-700" icon="🎁" />
          </div>

          {/* Tax progress */}
          {stats.tax.total > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  {t('taxCollection')} — {stats.fiscal_year || ''}
                </h3>
                <span className="text-sm font-bold text-green-700">{taxPaidPct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${taxPaidPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{t('paid')}: {stats.tax.paid}</span>
                <span>Total: {stats.tax.total}</span>
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{t('recentActivity')}</h3>
              <Link href="/admin/audit-logs" className="text-xs text-green-700 hover:text-green-800 font-medium">
                View All →
              </Link>
            </div>
            {!stats.recent_activity || stats.recent_activity.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">{t('noActivity')}</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {stats.recent_activity.slice(0, 10).map((log) => (
                  <li key={log._id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ActionBadge action={log.action} />
                          <span className="text-xs text-gray-500 font-medium">{log.target_model}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          by {log.user_id?.name ?? 'System'}
                          {log.user_id?.role && (
                            <span className="ml-1 text-gray-300">({log.user_id.role.replace(/_/g, ' ')})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 font-medium">{timeAgo(log.createdAt)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('quickActions')}</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/admin/users', label: t('createAdminAction'), color: 'bg-red-50 text-red-700 border-red-200' },
                { href: '/citizens', label: t('addCitizenAction'), color: 'bg-green-50 text-green-700 border-green-200' },
                { href: '/certificates', label: t('newCertificateAction'), color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { href: '/tax', label: t('assessTaxAction'), color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { href: '/admin/audit-logs', label: `📋 ${t('auditLogs')}`, color: 'bg-gray-50 text-gray-700 border-gray-200' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80 ${a.color}`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
