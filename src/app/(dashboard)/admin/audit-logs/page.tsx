'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'

interface AuditLog {
  _id: string
  action: string
  target_model: string
  target_id?: string
  user_id: { _id: string; name: string; role: string } | null
  user_role: string
  status: string
  ip_address: string
  user_agent?: string
  changes?: { before: unknown; after: unknown }
  error_message?: string
  createdAt: string
}

const TARGET_MODELS = [
  'User', 'Citizen', 'Certificate', 'CertificateTemplate', 'Tax', 'Payment',
  'Cashbook', 'WarishApplication', 'ReliefProgram', 'ReliefList', 'ReliefBeneficiary',
]

const ACTION_TYPES = [
  'login', 'logout', 'register', 'create', 'update', 'delete', 'approve', 'reject', 'lock', 'pay'
]

export default function AuditLogsPage() {
  const router = useRouter()
  const currentUser = useUser()
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Guard: only those with AUDIT_VIEW can access this page
  useEffect(() => {
    if (currentUser !== null && !hasPermission(currentUser, PERMISSIONS.AUDIT_VIEW)) {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  if (!currentUser || !hasPermission(currentUser, PERMISSIONS.AUDIT_VIEW)) {
    return null
  }

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '25')
    if (actionFilter) p.set('action', actionFilter)
    if (modelFilter) p.set('target_model', modelFilter)
    if (statusFilter) p.set('status', statusFilter)
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo) p.set('date_to', dateTo)
    return `/api/audit-logs?${p.toString()}`
  }

  const { data, loading, error, pagination } = useApi<AuditLog[]>(buildUrl(), [
    page, actionFilter, modelFilter, statusFilter, dateFrom, dateTo,
  ])

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      login: 'bg-green-100 text-green-700',
      logout: 'bg-gray-100 text-gray-600',
      register: 'bg-blue-100 text-blue-700',
      create: 'bg-purple-100 text-purple-700',
      approve: 'bg-teal-100 text-teal-700',
      update: 'bg-yellow-100 text-yellow-700',
      delete: 'bg-red-100 text-red-700',
      reject: 'bg-red-100 text-red-700',
      lock: 'bg-blue-100 text-blue-700',
      pay: 'bg-emerald-100 text-emerald-700',
    }
    const key = Object.keys(colors).find((k) => String(action).includes(k)) ?? 'create'
    return colors[key]
  }

  const columns: Column[] = [
    {
      key: 'action',
      label: 'Action',
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getActionColor(v)}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'target_model',
      label: 'Target',
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium">{v}</p>
          {row.target_id && (
            <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]" title={row.target_id}>
              {row.target_id}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'user_id',
      label: 'User',
      render: (val, row) => val ? (
        <div>
          <p className="text-sm">{val.name}</p>
          <p className="text-xs text-gray-400 capitalize">{row.user_role?.replace(/_/g, ' ')}</p>
        </div>
      ) : <span className="text-gray-400 text-xs">System</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            v === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {v === 'success' ? '✓' : '✗'} {v}
        </span>
      ),
    },
    { key: 'ip_address', label: 'IP', render: (v) => <span className="text-xs font-mono">{v ?? '—'}</span> },
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (v) => (
        <div>
          <p className="text-sm">{new Date(v).toLocaleDateString('en-BD')}</p>
          <p className="text-xs text-gray-400">{new Date(v).toLocaleTimeString('en-BD')}</p>
        </div>
      ),
    },
    {
      key: '_id',
      label: '',
      render: (_id, row) => (
        <button
          onClick={() => setSelectedLog(row as AuditLog)}
          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Details
        </button>
      ),
    },
  ]

  const logs = data ?? []
  const total = pagination?.total ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader title="Audit Logs" subtitle="Complete system activity log - All actions are recorded" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Page</p>
          <p className="text-2xl font-bold text-gray-900">{page} / {Math.ceil(total / 25) || 1}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Filters Applied</p>
          <p className="text-2xl font-bold text-gray-900">
            {[actionFilter, modelFilter, statusFilter, dateFrom, dateTo].filter(Boolean).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Showing</p>
          <p className="text-2xl font-bold text-gray-900">{logs.length} logs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a} className="capitalize">{a}</option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">All Models</option>
            {TARGET_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {(actionFilter || modelFilter || statusFilter || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setActionFilter('')
                setModelFilter('')
                setStatusFilter('')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No audit logs found." />
      <Pagination total={total} page={page} limit={25} onChange={setPage} />

      {/* Details Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Action</p>
                <span className={`text-sm px-2 py-1 rounded font-medium ${getActionColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                <span className={`text-sm px-2 py-1 rounded font-medium ${
                  selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedLog.status}
                </span>
              </div>
            </div>

            {/* Target Info */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Target</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-800">{selectedLog.target_model}</p>
                {selectedLog.target_id && (
                  <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedLog.target_id}</p>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Performed By</p>
              <div className="bg-gray-50 rounded-lg p-3">
                {selectedLog.user_id ? (
                  <>
                    <p className="font-medium text-gray-800">{selectedLog.user_id.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{selectedLog.user_role?.replace(/_/g, ' ')}</p>
                  </>
                ) : (
                  <p className="text-gray-500">System</p>
                )}
              </div>
            </div>

            {/* Timestamp & Technical Info */}
            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Timestamp</p>
                <p className="text-sm text-gray-800">
                  {new Date(selectedLog.createdAt).toLocaleString('en-BD')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">IP Address</p>
                <p className="text-sm text-gray-800 font-mono">{selectedLog.ip_address ?? '—'}</p>
              </div>
            </div>

            {/* User Agent */}
            {selectedLog.user_agent && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 uppercase mb-1">User Agent</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            {/* Error Message */}
            {selectedLog.error_message && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-red-500 uppercase mb-1">Error Message</p>
                <p className="text-sm text-red-700 bg-red-50 p-3 rounded">
                  {selectedLog.error_message}
                </p>
              </div>
            )}

            {/* Changes */}
            {selectedLog.changes && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Changes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Before</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40 font-mono">
                      {JSON.stringify(selectedLog.changes.before, null, 2) || '—'}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">After</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40 font-mono">
                      {JSON.stringify(selectedLog.changes.after, null, 2) || '—'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Log ID */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">
                Log ID: <span className="font-mono">{selectedLog._id}</span>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
