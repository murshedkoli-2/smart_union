'use client'

import Link from 'next/link'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import CitizenRegistrationForm from '@/components/forms/CitizenRegistrationForm'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'
import { useUrlFilters } from '@/hooks/useUrlFilters'

export interface CitizenRow {
  _id: string
  name_bn: string
  name_en: string
  nid_no?: string
  mobile: string
  address?: { ward_no: number }
  holding_no?: string
  status: string
}

/**
 * Interactive shell for the citizens list.
 *
 * The rows arrive from the Server Component that renders this — the page no
 * longer fetches its own data after hydration. Filters and pagination live in
 * the URL rather than component state, so the server can render the right page
 * directly and the browser's back button and shareable links work.
 */
export default function CitizensView({
  citizens,
  total,
  page,
  limit,
  pendingCount,
}: {
  citizens: CitizenRow[]
  total: number
  page: number
  limit: number
  pendingCount: number
}) {
  const currentUser = useUser()
  const { lang } = useLanguage()
  const { get, apply, isPending, refresh } = useUrlFilters('/citizens')
  const [showCreate, setShowCreate] = useState(false)

  const search = get('search')
  const wardFilter = get('ward_no')
  const statusFilter = get('status')

  // Local mirror so typing stays responsive; the URL updates on a debounce.
  const [searchDraft, setSearchDraft] = useState(search)

  useEffect(() => {
    if (searchDraft === search) return
    // Debounced so a server render is not queued on every keystroke.
    const timer = setTimeout(() => apply({ search: searchDraft }), 350)
    return () => clearTimeout(timer)
    // `apply` is recreated each render; the values it depends on are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft, search])

  const handleApprove = async (id: string) => {
    const res = await apiCall(`/api/citizens/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen approved.')
      refresh()
    } else {
      toast.error('Failed to approve citizen.')
    }
  }

  const handleReject = async (id: string) => {
    const res = await apiCall(`/api/citizens/${id}/reject`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen rejected.')
      refresh()
    } else {
      toast.error('Failed to reject citizen.')
    }
  }

  const handleCreateSuccess = () => {
    toast.success('Citizen created successfully.')
    setShowCreate(false)
    refresh()
  }

  const columns: Column<CitizenRow>[] = [
    {
      key: 'name_bn',
      label: lang === 'bn' ? 'নাম' : 'Name',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name_bn}</p>
          <p className="text-xs text-gray-400">{row.name_en}</p>
        </div>
      ),
    },
    { key: 'nid_no', label: 'NID' },
    { key: 'holding_no', label: 'Holding No', render: (val) => val || '—' },
    { key: 'mobile', label: 'Mobile' },
    {
      key: 'address',
      label: lang === 'bn' ? 'ওয়ার্ড' : 'Ward',
      render: (value) => value?.ward_no ?? '—',
    },
    {
      key: 'status',
      label: lang === 'bn' ? 'অবস্থা' : 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: '_id',
      label: lang === 'bn' ? 'কার্যক্রম' : 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/citizens/${id}`}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            View
          </Link>
          {row.status === 'pending' && hasPermission(currentUser, PERMISSIONS.CITIZEN_APPROVE) && (
            <>
              <button
                onClick={() => handleApprove(id)}
                className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(id)}
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <PageHeader
        title={lang === 'bn' ? 'নাগরিকসমূহ' : 'Citizens'}
        action={
          <div className="flex items-center gap-2">
            {hasPermission(currentUser, PERMISSIONS.CITIZEN_APPROVE) && (
              <Link
                href="/citizens/pending"
                className="relative flex items-center gap-1.5 rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-50"
              >
                ⏳ Pending Approvals
                {pendingCount > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            )}
            {hasPermission(currentUser, PERMISSIONS.CITIZEN_CREATE) && (
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
              >
                + Add Citizen
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:min-w-[200px] sm:flex-1">
          <SearchInput
            value={searchDraft}
            onChange={setSearchDraft}
            placeholder={lang === 'bn' ? 'নাম দ্বারা খুঁজুন...' : 'Search by name...'}
          />
        </div>
        <select
          value={wardFilter}
          onChange={(event) => apply({ ward_no: event.target.value })}
          className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{lang === 'bn' ? 'সব ওয়ার্ড' : 'All Wards'}</option>
          {Array.from({ length: 9 }, (_, index) => index + 1).map((ward) => (
            <option key={ward} value={ward}>{`Ward ${ward}`}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => apply({ status: event.target.value })}
          className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
          <option value="pending">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</option>
          <option value="approved">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</option>
          <option value="rejected">{lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={citizens}
        loading={isPending}
        emptyMessage={lang === 'bn' ? 'কোনো নাগরিক পাওয়া যায়নি।' : 'No citizens found.'}
      />
      <Pagination
        total={total}
        page={page}
        limit={limit}
        onChange={(next) => apply({ page: String(next) })}
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="নাগরিক নিবন্ধন / Citizen Registration"
        size="lg"
      >
        <CitizenRegistrationForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  )
}
