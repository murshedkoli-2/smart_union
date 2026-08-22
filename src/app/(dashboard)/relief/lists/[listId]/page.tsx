'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface ReliefList {
  _id: string
  list_name: string
  ward_no: number | null
  max_beneficiaries: number | null
  status: string
  program_id: { _id: string; name: string; program_type: string }
}

interface Beneficiary {
  _id: string
  citizen_id: { _id: string; name_bn: string; name_en: string; ward_no: number } | null
  allocation_amount: number | null
  deleted?: boolean
}

interface BeneficiariesResponse {
  beneficiaries: Beneficiary[]
  total: number
}

const defaultBeneficiaryForm = {
  citizen_id: '',
  allocation_amount: '',
}

export default function ReliefListPage() {
  const { listId } = useParams<{ listId: string }>()
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...defaultBeneficiaryForm })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: list, loading: listLoading, error: listError } = useApi<ReliefList>(
    `/api/relief/lists/${listId}`
  )
  const { data: bData, loading: bLoading, refetch } = useApi<BeneficiariesResponse>(
    `/api/relief/lists/${listId}/beneficiaries`,
    [listId]
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = { citizen_id: form.citizen_id }
    if (form.allocation_amount) payload.allocation_amount = Number(form.allocation_amount)

    const res = await apiCall(`/api/relief/lists/${listId}/beneficiaries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Beneficiary added.')
      setShowAdd(false)
      setForm({ ...defaultBeneficiaryForm })
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to add beneficiary.')
    }
  }

  const handleRemove = async (id: string) => {
    const res = await apiCall(`/api/relief/beneficiaries/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Beneficiary removed.'); refetch() }
    else toast.error('Failed to remove beneficiary.')
  }

  const columns: Column[] = [
    {
      key: 'citizen_id',
      label: 'Citizen Name',
      render: (val) => val ? (
        <div>
          <p className="font-medium">{val.name_bn}</p>
          <p className="text-xs text-gray-400">{val.name_en}</p>
        </div>
      ) : '—',
    },
    {
      key: 'citizen_id',
      label: 'Ward',
      render: (val) => val?.ward_no ?? '—',
    },
    {
      key: 'allocation_amount',
      label: 'Allocation Amount',
      render: (v) => v ? `৳ ${Number(v).toLocaleString()}` : '—',
    },
    {
      key: 'deleted',
      label: 'Status',
      render: (v) => <StatusBadge status={v ? 'deleted' : 'active'} />,
    },
    {
      key: '_id',
      label: 'Actions',
      render: (id, row) => (
        !row.deleted && (
          <button
            onClick={() => setDeleteId(id)}
            className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        )
      ),
    },
  ]

  if (listLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (listError || !list) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {listError ?? 'List not found.'}
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

      {/* List Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{list.list_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">
                Program: <span className="font-medium">{list.program_id?.name}</span>
              </span>
              {list.ward_no && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Ward {list.ward_no}</span>
                </>
              )}
              {list.max_beneficiaries && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Max: {list.max_beneficiaries}</span>
                </>
              )}
            </div>
          </div>
          <StatusBadge status={list.status} />
        </div>
      </div>

      {/* Beneficiaries */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          Beneficiaries ({bData?.total ?? 0})
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
        >
          + Add Beneficiary
        </button>
      </div>

      <DataTable
        columns={columns}
        data={bData?.beneficiaries ?? []}
        loading={bLoading}
        emptyMessage="No beneficiaries in this list."
      />

      {/* Add Beneficiary Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm({ ...defaultBeneficiaryForm }) }}
        title="Add Beneficiary"
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Citizen ID *</label>
            <input
              required
              type="text"
              value={form.citizen_id}
              onChange={(e) => setForm((f) => ({ ...f, citizen_id: e.target.value }))}
              placeholder="ObjectId"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Allocation Amount (৳) (optional)</label>
            <input
              type="number"
              min="0"
              value={form.allocation_amount}
              onChange={(e) => setForm((f) => ({ ...f, allocation_amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setForm({ ...defaultBeneficiaryForm }) }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Beneficiary'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleRemove(deleteId)}
        title="Remove Beneficiary"
        message="Are you sure you want to remove this beneficiary from the list?"
        confirmLabel="Remove"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}
