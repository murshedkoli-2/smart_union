'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'

interface ReliefProgram {
  _id: string
  name: string
  program_type: string
  fiscal_year: string
  total_budget: number
  status: string
  createdAt: string
}

const PROGRAM_TYPES = ['vgd', 'vgf', 'tr', 'kabikha', 'other']

const defaultForm = {
  name: '',
  program_type: '',
  fiscal_year: '2025-2026',
  total_budget: '',
}

export default function ReliefPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...defaultForm })
  const [saving, setSaving] = useState(false)

  const { data, loading, error, refetch, pagination } = useApi<ReliefProgram[]>('/api/relief/programs', [page])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await apiCall('/api/relief/programs', {
      method: 'POST',
      body: JSON.stringify({ ...form, total_budget: Number(form.total_budget) }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Program created successfully.')
      setShowCreate(false)
      setForm({ ...defaultForm })
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to create program.')
    }
  }

  const columns: Column[] = [
    { key: 'name', label: 'Program Name' },
    {
      key: 'program_type',
      label: 'Type',
      render: (v) => <span className="uppercase text-xs font-semibold text-gray-700">{v}</span>,
    },
    { key: 'fiscal_year', label: 'Fiscal Year' },
    {
      key: 'total_budget',
      label: 'Budget',
      render: (v) => <span className="font-medium text-gray-900">৳ {Number(v).toLocaleString()}</span>,
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: '_id',
      label: 'Actions',
      render: (id) => (
        <Link
          href={`/relief/${id}`}
          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          View Lists
        </Link>
      ),
    },
  ]

  const programs = data ?? []
  const total = pagination?.total ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title="Relief Programs"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            + New Program
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <DataTable columns={columns} data={programs} loading={loading} emptyMessage="No relief programs found." />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm({ ...defaultForm }) }}
        title="New Relief Program"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Program Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Program Type *</label>
            <select
              required
              value={form.program_type}
              onChange={(e) => setForm((f) => ({ ...f, program_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Select Type</option>
              {PROGRAM_TYPES.map((t) => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year *</label>
            <input
              required
              type="text"
              value={form.fiscal_year}
              onChange={(e) => setForm((f) => ({ ...f, fiscal_year: e.target.value }))}
              placeholder="e.g. 2025-2026"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Total Budget (৳)</label>
            <input
              type="number"
              min="0"
              value={form.total_budget}
              onChange={(e) => setForm((f) => ({ ...f, total_budget: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setForm({ ...defaultForm }) }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Program'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
