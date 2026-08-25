'use client'

/**
 * Warish and family-certificate applications.
 *
 * One list, two kinds, switched by the tab: the API filters on
 * application_type and the row layout differs only in wording and icon.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import type { WarishApplicationKind, WarishListResponse } from '@/types/warish.types'
import ApplicationsTable from './ApplicationsTable'
import CreateApplicationModal from './CreateApplicationModal'
import StatCards from './StatCards'
import { useWarishCreateForm } from './useWarishCreateForm'

const PAGE_SIZE = 20

const EMPTY_STATS = { total: 0, pending: 0, approved: 0, draft: 0, rejected: 0 }

const STATUS_OPTIONS = [
  { value: '', bn: 'সব অবস্থা', en: 'All Status' },
  { value: 'draft', bn: 'খসড়া', en: 'Draft' },
  { value: 'pending', bn: 'অপেক্ষমাণ', en: 'Pending' },
  { value: 'approved', bn: 'অনুমোদিত', en: 'Approved' },
  { value: 'rejected', bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
]

export default function WarishPage() {
  const currentUser = useUser()
  const { lang } = useLanguage()
  const bn = lang === 'bn'
  const canApprove = isSuperAdmin(currentUser)

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [kind, setKind] = useState<WarishApplicationKind>('warish')

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    application_type: kind,
  })
  if (statusFilter) query.set('status', statusFilter)

  const { data, loading, error, refetch } = useApi<WarishListResponse>(
    `/api/warish?${query.toString()}`,
    [page, statusFilter, kind],
  )

  const create = useWarishCreateForm(refetch)

  /** Approve and reject differ only in the path and the wording. */
  const decide = async (id: string, action: 'approve' | 'reject') => {
    const res = await apiCall(`/api/warish/${id}/${action}`, { method: 'POST' })
    if (res.ok) {
      toast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'}.`)
      refetch()
    } else {
      toast.error(`Failed to ${action}.`)
    }
  }

  const isFamilyList = kind === 'family_certificate'

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title={
          isFamilyList
            ? bn ? 'পারিবারিক সনদ' : 'Family Certificates'
            : bn ? 'ওয়ারিশ আবেদনসমূহ' : 'Warish Applications'
        }
        subtitle={
          isFamilyList
            ? bn
              ? 'পারিবারিক সদস্যপদ সনদ আবেদন পরিচালনা করুন'
              : 'Manage family membership certificate applications'
            : bn
              ? 'আইনগত ওয়ারিশ সনদ আবেদন পরিচালনা করুন'
              : 'Manage legal heir certificate applications'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => create.openFor('warish')}
              className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
            >
              + New Warish
            </button>
            <button
              onClick={() => create.openFor('family_certificate')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Family Certificate
            </button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <StatCards stats={data?.stats ?? EMPTY_STATS} lang={lang} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {(['warish', 'family_certificate'] as const).map((option) => (
            <button
              key={option}
              onClick={() => {
                setKind(option)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                kind === option
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option === 'warish' ? 'Warish' : 'Family Certificate'}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {bn ? option.bn : option.en}
            </option>
          ))}
        </select>
      </div>

      <ApplicationsTable
        applications={data?.applications ?? []}
        loading={loading}
        canApprove={canApprove}
        lang={lang}
        onApprove={(id) => decide(id, 'approve')}
        onReject={(id) => decide(id, 'reject')}
      />

      <Pagination total={data?.total ?? 0} page={page} limit={PAGE_SIZE} onChange={setPage} />

      <CreateApplicationModal create={create} lang={lang} />
    </div>
  )
}
