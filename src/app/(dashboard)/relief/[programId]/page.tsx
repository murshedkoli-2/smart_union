'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'

interface ReliefProgram {
  _id: string
  name: string
  program_type: string
  fiscal_year: string
  total_budget: number
  status: string
}

interface ReliefList {
  _id: string
  list_name: string
  ward_no: number | null
  max_beneficiaries: number | null
  status: string
  beneficiary_count: number
}

interface ListsResponse {
  lists: ReliefList[]
  total: number
}

const defaultListForm = {
  list_name: '',
  ward_no: '',
  max_beneficiaries: '',
}

export default function ReliefProgramPage() {
  const { programId } = useParams<{ programId: string }>()
  const router = useRouter()
  const [showCreateList, setShowCreateList] = useState(false)
  const [listForm, setListForm] = useState({ ...defaultListForm })
  const [saving, setSaving] = useState(false)

  const { data: program, loading: programLoading, error: programError } = useApi<ReliefProgram>(
    `/api/relief/programs/${programId}`
  )
  const { data: listsData, loading: listsLoading, refetch } = useApi<ListsResponse>(
    `/api/relief/lists?program_id=${programId}`,
    [programId]
  )

  const handleApproveList = async (id: string) => {
    const res = await apiCall(`/api/relief/lists/${id}/approve`, { method: 'POST' })
    if (res.ok) { toast.success('List approved.'); refetch() }
    else toast.error('Failed to approve list.')
  }

  const handleLockList = async (id: string) => {
    const res = await apiCall(`/api/relief/lists/${id}/lock`, { method: 'POST' })
    if (res.ok) { toast.success('List locked.'); refetch() }
    else toast.error('Failed to lock list.')
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, any> = {
      list_name: listForm.list_name,
      program_id: programId,
    }
    if (listForm.ward_no) payload.ward_no = Number(listForm.ward_no)
    if (listForm.max_beneficiaries) payload.max_beneficiaries = Number(listForm.max_beneficiaries)

    const res = await apiCall('/api/relief/lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('List created.')
      setShowCreateList(false)
      setListForm({ ...defaultListForm })
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to create list.')
    }
  }

  const listColumns: Column[] = [
    { key: 'list_name', label: 'List Name' },
    { key: 'ward_no', label: 'Ward', render: (v) => v ?? 'All' },
    { key: 'max_beneficiaries', label: 'Max Beneficiaries', render: (v) => v ?? '—' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'beneficiary_count', label: 'Beneficiary Count' },
    {
      key: '_id',
      label: 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <a
            href={`/relief/lists/${id}`}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            View Beneficiaries
          </a>
          {row.status === 'draft' && (
            <button
              onClick={() => handleApproveList(id)}
              className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
            >
              Approve
            </button>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => handleLockList(id)}
              className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Lock
            </button>
          )}
        </div>
      ),
    },
  ]

  if (programLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (programError || !program) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {programError ?? 'Program not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Back
      </button>

      {/* Program Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{program.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 uppercase font-semibold">{program.program_type}</span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500">{program.fiscal_year}</span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm font-medium text-gray-700">৳ {Number(program.total_budget).toLocaleString()}</span>
            </div>
          </div>
          <StatusBadge status={program.status} />
        </div>
      </div>

      {/* Lists section */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Relief Lists</h2>
        <button
          onClick={() => setShowCreateList(true)}
          className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
        >
          + New List
        </button>
      </div>

      <DataTable
        columns={listColumns}
        data={listsData?.lists ?? []}
        loading={listsLoading}
        emptyMessage="No lists found for this program."
      />

      {/* Create List Modal */}
      <Modal
        open={showCreateList}
        onClose={() => { setShowCreateList(false); setListForm({ ...defaultListForm }) }}
        title="Create New List"
        size="sm"
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">List Name *</label>
            <input
              required
              type="text"
              value={listForm.list_name}
              onChange={(e) => setListForm((f) => ({ ...f, list_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ward No (optional)</label>
            <select
              value={listForm.ward_no}
              onChange={(e) => setListForm((f) => ({ ...f, ward_no: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">All Wards</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>{`Ward ${w}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Beneficiaries (optional)</label>
            <input
              type="number"
              min="1"
              value={listForm.max_beneficiaries}
              onChange={(e) => setListForm((f) => ({ ...f, max_beneficiaries: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreateList(false); setListForm({ ...defaultListForm }) }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create List'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
