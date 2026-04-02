'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import CitizenRegistrationForm from '@/components/forms/CitizenRegistrationForm'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'
import { useApi } from '@/hooks/useApi'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

interface Citizen {
  _id: string
  name_bn: string
  name_en: string
  nid_no?: string
  mobile: string
  address?: { ward_no: number }
  holding_no?: string
  status: string
}

interface CitizensResponse {
  citizens: Citizen[]
  total: number
  page: number
  limit: number
}

export default function CitizensPage() {
  const currentUser = useUser()
  const { lang } = useLanguage()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [wardFilter, setWardFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Citizen | null>(null)
  const [deleting, setDeleting] = useState(false)

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '20')
    if (search) params.set('search', search)
    if (wardFilter) params.set('ward_no', wardFilter)
    if (statusFilter) params.set('status', statusFilter)
    return `/api/citizens?${params.toString()}`
  }, [page, search, wardFilter, statusFilter])

  const { data, loading, error, refetch } = useApi<CitizensResponse>(buildUrl(), [
    page, search, wardFilter, statusFilter,
  ])

  const { data: pendingData } = useApi<CitizensResponse>(
    '/api/citizens?status=pending&limit=1',
  )
  const pendingCount = pendingData?.total ?? 0

  const handleApprove = async (id: string) => {
    const res = await apiCall(`/api/citizens/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen approved.')
      refetch()
    } else {
      toast.error('Failed to approve citizen.')
    }
  }

  const handleReject = async (id: string) => {
    const res = await apiCall(`/api/citizens/${id}/reject`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen rejected.')
      refetch()
    } else {
      toast.error('Failed to reject citizen.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await apiCall(`/api/citizens/${deleteTarget._id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setDeleteTarget(null)
      toast.success('Citizen deleted.')
      refetch()
    } else {
      const payload = await res.json()
      toast.error(payload.message ?? 'Failed to delete citizen.')
    }
  }

  const handleCreateSuccess = () => {
    toast.success('Citizen created successfully.')
    setShowCreate(false)
    refetch()
  }

  const columns: Column[] = [
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
          <a
            href={`/citizens/${id}`}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            View
          </a>
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
          <button
            disabled
            className="cursor-not-allowed rounded border border-red-200 bg-gray-100 px-2 py-1 text-xs text-red-400 opacity-60"
            title="Delete is disabled"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const citizens = data?.citizens ?? []
  const total = data?.total ?? 0

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:min-w-[200px] sm:flex-1">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="{lang === 'bn' ? 'নাম দ্বারা খুঁজুন...' : 'Search by name...'}"
          />
        </div>
        <select
          value={wardFilter}
          onChange={(event) => {
            setWardFilter(event.target.value)
            setPage(1)
          }}
          className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{lang === 'bn' ? 'সব ওয়ার্ড' : 'All Wards'}</option>
          {Array.from({ length: 9 }, (_, index) => index + 1).map((ward) => (
            <option key={ward} value={ward}>{`Ward ${ward}`}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
          className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
          <option value="pending">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</option>
          <option value="approved">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</option>
          <option value="rejected">{lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'}</option>
        </select>
      </div>

      <DataTable columns={columns} data={citizens} loading={loading} emptyMessage="{lang === 'bn' ? 'কোনো নাগরিক পাওয়া যায়নি।' : 'No citizens found.'}" />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />

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

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Citizen"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Are you sure you want to permanently delete this citizen?
            </div>
            <div className="rounded border bg-gray-50 p-3">
              <p className="font-medium text-gray-900">{deleteTarget.name_bn}</p>
              <p className="text-sm text-gray-600">{deleteTarget.name_en}</p>
              <p className="text-sm text-gray-500">Mobile: {deleteTarget.mobile}</p>
              {deleteTarget.nid_no && (
                <p className="text-sm text-gray-500">NID: {deleteTarget.nid_no}</p>
              )}
            </div>
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-medium text-red-700">Warning</p>
              <p className="text-xs text-red-600">
                This action cannot be undone. The citizen record will be permanently removed from the system.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
