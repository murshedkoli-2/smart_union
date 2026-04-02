'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'

interface CashbookEntry {
  _id: string
  entry_date: string
  entry_type: 'income' | 'expense'
  source: string
  description: string
  amount: number
  reference: string
}

interface CashbookSummary {
  total_income: number
  total_expense: number
  net_balance: number
}

const CURRENT_YEAR = '2025-2026'

export default function CashbookPage() {
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR)
  const [typeFilter, setTypeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (yearFilter) p.set('fiscal_year', yearFilter)
    if (typeFilter) p.set('entry_type', typeFilter)
    if (sourceFilter) p.set('source', sourceFilter)
    return `/api/cashbook?${p.toString()}`
  }

  const summaryUrl = () => {
    const p = new URLSearchParams()
    if (yearFilter) p.set('fiscal_year', yearFilter)
    return `/api/cashbook/summary?${p.toString()}`
  }

  const { data, loading, error, pagination } = useApi<CashbookEntry[]>(buildUrl(), [page, yearFilter, typeFilter, sourceFilter])
  const { data: summary, loading: summaryLoading } = useApi<CashbookSummary>(summaryUrl(), [yearFilter])

  const YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']
  const SOURCES = ['tax', 'certificate', 'trade_license', 'donation', 'grant', 'salary', 'maintenance', 'other']

  const columns: Column[] = [
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
    { key: 'source', label: 'Source', render: (v) => <span className="capitalize">{v?.replace(/_/g, ' ')}</span> },
    { key: 'description', label: 'Description' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v, row) => (
        <span className={`font-medium ${row.entry_type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
          {row.entry_type === 'expense' ? '− ' : '+ '}৳ {Number(v).toLocaleString()}
        </span>
      ),
    },
    { key: 'reference', label: 'Reference' },
  ]

  const entries = data ?? []
  const total = pagination?.total ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader title="Cashbook" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-2" />
              <div className="h-7 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Income</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                ৳ {(summary?.total_income ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expense</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ৳ {(summary?.total_expense ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${(summary?.net_balance ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                ৳ {(summary?.net_balance ?? 0).toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Fiscal Years</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={entries} loading={loading} emptyMessage="No cashbook entries found." />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />
    </div>
  )
}
