'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { apiCall } from '@/lib/utils/api-client'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'

export interface PendingCitizenRow {
  _id: string
  name_bn: string
  name_en: string
  nid_no?: string
  birth_cert_no?: string
  mobile: string
  address?: { village_bn: string; thana_bn: string; district_bn: string; ward_no: number }
  status: string
  createdAt: string
}

/** Interactive shell; rows are fetched by the Server Component that renders it. */
export default function PendingCitizensView({
  citizens,
  total,
  page,
  limit,
}: {
  citizens: PendingCitizenRow[]
  total: number
  page: number
  limit: number
}) {
  const { get, apply, isPending, refresh } = useUrlFilters('/citizens/pending')
  const search = get('search')
  const wardFilter = get('ward_no')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Local mirror so typing stays responsive; the URL updates on a debounce.
  const [searchDraft, setSearchDraft] = useState(search)

  useEffect(() => {
    if (searchDraft === search) return
    const timer = setTimeout(() => apply({ search: searchDraft }), 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft, search])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    const res = await apiCall(`/api/citizens/${id}/approve`, { method: 'POST' })
    setProcessingId(null)
    if (res.ok) { toast.success('Citizen approved successfully.'); refresh() }
    else toast.error('Failed to approve citizen.')
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    const res = await apiCall(`/api/citizens/${id}/reject`, { method: 'POST' })
    setProcessingId(null)
    if (res.ok) { toast.success('Citizen rejected.'); refresh() }
    else toast.error('Failed to reject citizen.')
  }

  const columns: Column<PendingCitizenRow>[] = [
    {
      key: 'name_bn',
      label: 'Name',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name_bn}</p>
          <p className="text-xs text-gray-400">{row.name_en}</p>
        </div>
      ),
    },
    { key: 'mobile', label: 'Mobile' },
    {
      key: 'nid_no',
      label: 'NID / Birth Cert',
      render: (_, row) => (
        <div>
          {row.nid_no && <p className="text-xs text-gray-700">NID: {row.nid_no}</p>}
          {row.birth_cert_no && <p className="text-xs text-gray-500">BC: {row.birth_cert_no}</p>}
          {!row.nid_no && !row.birth_cert_no && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Ward / Area',
      render: (val) =>
        val ? (
          <div>
            <p className="text-xs font-medium text-gray-700">Ward {val.ward_no}</p>
            <p className="text-xs text-gray-400">{val.village_bn}, {val.thana_bn}</p>
          </div>
        ) : '—',
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      render: (v) => (
        <span className="text-xs text-gray-500">
          {new Date(v).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (id) => {
        const busy = processingId === id
        return (
          <div className="flex items-center gap-2">
            <a
              href={`/citizens/${id}`}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              View
            </a>
            <button
              onClick={() => handleApprove(id)}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              {busy ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => handleReject(id)}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? '...' : 'Reject'}
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title={`Pending Approvals${total > 0 ? ` (${total})` : ''}`}
        action={
          <Link
            href="/citizens"
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Citizens
          </Link>
        }
      />

      {/* Info banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
        Citizens who registered themselves are listed here. Review and approve or reject each request.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={searchDraft}
            onChange={setSearchDraft}
            placeholder="Search by name, mobile or NID..."
          />
        </div>
        <select
          value={wardFilter}
          onChange={(e) => apply({ ward_no: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Wards</option>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>{`Ward ${w}`}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={citizens}
        loading={isPending}
        emptyMessage="No pending approvals. All citizen registrations are up to date."
      />
      <Pagination
        total={total}
        page={page}
        limit={limit}
        onChange={(next) => apply({ page: String(next) })}
      />
    </div>
  )
}
