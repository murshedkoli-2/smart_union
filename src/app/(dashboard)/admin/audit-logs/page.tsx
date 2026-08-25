'use client'

/**
 * Audit log browser.
 *
 * Read-only by design: entries are written by the services and never edited
 * here, so the screen is filters, a table, and one details dialog.
 */
import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { PERMISSIONS } from '@/constants/permissions'
import RequirePermission from '@/components/auth/RequirePermission'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import FilterBar from './FilterBar'
import LogDetailsModal from './LogDetailsModal'
import {
  actionColor,
  countActiveFilters,
  emptyFilters,
  statusColor,
  type AuditLogEntry,
  type AuditLogFilters,
} from './audit-log'

const PAGE_SIZE = 25

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function AuditLogsPageView() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuditLogFilters>(emptyFilters)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value)
  }

  const { data, loading, error, pagination } = useApi<AuditLogEntry[]>(
    `/api/audit-logs?${query.toString()}`,
    [page, filters],
  )

  /** Any filter change returns to the first page. */
  const applyFilters = (next: AuditLogFilters) => {
    setFilters(next)
    setPage(1)
  }

  const logs = data ?? []
  const total = pagination?.total ?? 0

  const columns: Column[] = [
    {
      key: 'action',
      label: 'Action',
      render: (value) => (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'target_model',
      label: 'Target',
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium">{value}</p>
          {row.target_id && (
            <p
              className="text-xs text-gray-400 font-mono truncate max-w-[120px]"
              title={row.target_id}
            >
              {row.target_id}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'user_id',
      label: 'User',
      render: (value, row) =>
        value ? (
          <div>
            <p className="text-sm">{value.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {row.user_role?.replace(/_/g, ' ')}
            </p>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">System</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor(value)}`}
        >
          {value === 'success' ? '✓' : '✗'} {value}
        </span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (value) => <span className="text-xs font-mono">{value ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (value) => (
        <div>
          <p className="text-sm">{new Date(value).toLocaleDateString('en-BD')}</p>
          <p className="text-xs text-gray-400">{new Date(value).toLocaleTimeString('en-BD')}</p>
        </div>
      ),
    },
    {
      key: '_id',
      label: '',
      render: (_id, row) => (
        <button
          onClick={() => setSelectedLog(row as AuditLogEntry)}
          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Details
        </button>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title="Audit Logs"
        subtitle="Complete system activity log - All actions are recorded"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Logs" value={total.toLocaleString()} />
        <SummaryCard label="Page" value={`${page} / ${Math.ceil(total / PAGE_SIZE) || 1}`} />
        <SummaryCard label="Filters Applied" value={countActiveFilters(filters)} />
        <SummaryCard label="Showing" value={`${logs.length} logs`} />
      </div>

      <FilterBar filters={filters} onChange={applyFilters} />

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs found."
      />
      <Pagination total={total} page={page} limit={PAGE_SIZE} onChange={setPage} />

      <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}

export default function AuditLogsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_VIEW}>
      <AuditLogsPageView />
    </RequirePermission>
  )
}
