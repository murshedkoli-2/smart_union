'use client'

import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import { useUrlFilters } from '@/hooks/useUrlFilters'

export interface CashbookEntryRow {
  _id: string
  entry_date: string
  entry_type: 'income' | 'expense'
  source: string
  description: string
  amount: number
  reference: string
}

export interface CashbookSummaryData {
  total_income: number
  total_expense: number
  net_balance: number
}

const YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']
const SOURCES = [
  'tax',
  'certificate',
  'trade_license',
  'donation',
  'grant',
  'salary',
  'maintenance',
  'other',
]

/** Interactive shell; rows and totals are rendered on the server. */
export default function CashbookView({
  entries,
  summary,
  total,
  page,
  limit,
}: {
  entries: CashbookEntryRow[]
  summary: CashbookSummaryData
  total: number
  page: number
  limit: number
}) {
  const { get, apply, isPending } = useUrlFilters('/cashbook')

  const columns: Column<CashbookEntryRow>[] = [
    {
      key: 'entry_date',
      label: 'Date',
      render: (v) => new Date(v).toLocaleDateString('en-BD'),
    },
    {
      key: 'entry_type',
      label: 'Type',
      render: (v) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
            v === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {v}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (v) => <span className="capitalize">{v?.replace(/_/g, ' ')}</span>,
    },
    { key: 'description', label: 'Description' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v, row) => (
        <span
          className={`font-medium ${row.entry_type === 'income' ? 'text-green-700' : 'text-red-600'}`}
        >
          {row.entry_type === 'expense' ? '− ' : '+ '}৳ {Number(v).toLocaleString()}
        </span>
      ),
    },
    { key: 'reference', label: 'Reference' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader title="Cashbook" />

      {/* Summary Cards — computed server-side, so no loading skeleton needed. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Income</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            ৳ {summary.total_income.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expense</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ৳ {summary.total_expense.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Balance</p>
          <p
            className={`text-2xl font-bold mt-1 ${summary.net_balance >= 0 ? 'text-green-700' : 'text-red-600'}`}
          >
            ৳ {summary.net_balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={get('fiscal_year')}
          onChange={(e) => apply({ fiscal_year: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Fiscal Years</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={get('entry_type')}
          onChange={(e) => apply({ entry_type: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={get('source')}
          onChange={(e) => apply({ source: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        loading={isPending}
        emptyMessage="No cashbook entries found."
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
