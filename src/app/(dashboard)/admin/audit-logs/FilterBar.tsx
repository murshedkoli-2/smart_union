'use client'

import {
  ACTION_TYPES,
  TARGET_MODELS,
  countActiveFilters,
  emptyFilters,
  type AuditLogFilters,
} from './audit-log'

const CONTROL =
  'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500'

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500">{label}:</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={CONTROL} />
    </div>
  )
}

export default function FilterBar({
  filters,
  onChange,
}: {
  filters: AuditLogFilters
  onChange: (filters: AuditLogFilters) => void
}) {
  const set = <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.action}
          onChange={(e) => set('action', e.target.value)}
          className={`${CONTROL} bg-white`}
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.map((action) => (
            <option key={action} value={action} className="capitalize">{action}</option>
          ))}
        </select>

        <select
          value={filters.target_model}
          onChange={(e) => set('target_model', e.target.value)}
          className={`${CONTROL} bg-white`}
        >
          <option value="">All Models</option>
          {TARGET_MODELS.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value)}
          className={`${CONTROL} bg-white`}
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>

        <DateFilter label="From" value={filters.date_from} onChange={(v) => set('date_from', v)} />
        <DateFilter label="To" value={filters.date_to} onChange={(v) => set('date_to', v)} />

        {countActiveFilters(filters) > 0 && (
          <button
            onClick={() => onChange(emptyFilters())}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}
