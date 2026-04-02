'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { useLanguage } from '@/contexts/LanguageContext'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'

interface TaxRecord {
  _id: string
  holding_no: string
  fiscal_year: string
  amount: number
  status: string
  paid_at: string | null
  createdAt: string
  citizen_name?: string
  citizen_id?: string
  ward_no?: number
}

interface TaxSummary {
  total_paid: number
  total_due: number
  total_near_due: number
  paid_amount: number
  due_amount: number
}

// Get current fiscal year for near due calculation
function getCurrentFiscalYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 7) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

export default function HoldingTaxPage() {
  const router = useRouter()
  const { lang, t } = useLanguage()
  const [page, setPage] = useState(1)
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (yearFilter) p.set('fiscal_year', yearFilter)
    if (statusFilter) p.set('status', statusFilter)
    return `/api/tax?${p.toString()}`
  }

  const { data, loading, error, pagination } = useApi<TaxRecord[]>(buildUrl(), [page, yearFilter, statusFilter])

  // Fetch summary data
  const { data: summaryData } = useApi<TaxSummary>('/api/tax/summary', [])

  // Calculate summary from current data
  const summary = useMemo(() => {
    const currentFY = getCurrentFiscalYear()
    return {
      total_paid: summaryData?.total_paid ?? 0,
      total_due: summaryData?.total_due ?? 0,
      total_near_due: summaryData?.total_near_due ?? 0,
      paid_amount: summaryData?.paid_amount ?? 0,
      due_amount: summaryData?.due_amount ?? 0,
      currentFY,
    }
  }, [summaryData])

  const columns: Column[] = [
    {
      key: 'holding_no',
      label: lang === 'bn' ? 'হোল্ডিং নং' : 'Holding No',
      render: (v) => v && v !== 'PENDING' ? <span className="font-medium text-green-700">{v}</span> : <span className="text-gray-400">Not Generated</span>,
    },
    {
      key: 'citizen_name',
      label: lang === 'bn' ? 'নাগরিক' : 'Citizen',
      render: (v, row) => (
        <button
          onClick={() => row.citizen_id && router.push(`/citizens/${row.citizen_id}`)}
          className="text-left hover:text-green-700 hover:underline"
        >
          {v ?? '—'}
        </button>
      ),
    },
    {
      key: 'ward_no',
      label: lang === 'bn' ? 'ওয়ার্ড' : 'Ward',
      render: (v) => v ?? '—',
    },
    { key: 'fiscal_year', label: lang === 'bn' ? 'অর্থবছর' : 'Fiscal Year' },
    {
      key: 'amount',
      label: lang === 'bn' ? 'পরিমাণ' : 'Amount',
      render: (v) => `৳ ${Number(v).toLocaleString()}`,
    },
    {
      key: 'status',
      label: lang === 'bn' ? 'অবস্থা' : 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'paid_at',
      label: lang === 'bn' ? 'পরিশোধের তারিখ' : 'Paid At',
      render: (v) => v ? new Date(v).toLocaleDateString('en-BD') : '—',
    },
    {
      key: '_id',
      label: lang === 'bn' ? 'কার্যক্রম' : 'Actions',
      render: (_id, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/tax/${_id}`)}
            className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {lang === 'bn' ? 'দেখুন' : 'View'}
          </button>
          {row.citizen_id && (
            <button
              onClick={() => router.push(`/citizens/${row.citizen_id}`)}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {lang === 'bn' ? 'নাগরিক' : 'Citizen'}
            </button>
          )}
        </div>
      ),
    },
  ]

  const taxes = data ?? []
  const total = pagination?.total ?? 0

  const YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title="হোল্ডিং ট্যাক্স / Holding Tax"
        subtitle="Assess and pay holding tax from Citizen Profile"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${statusFilter === 'paid' ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-100 hover:border-green-200'}`}
          onClick={() => { setStatusFilter(statusFilter === 'paid' ? '' : 'paid'); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">পরিশোধিত / Paid</p>
              <p className="text-2xl font-bold text-green-700">{summary.total_paid}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">৳ {summary.paid_amount.toLocaleString()}</p>
        </div>

        <div
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${statusFilter === 'unpaid' ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-100 hover:border-red-200'}`}
          onClick={() => { setStatusFilter(statusFilter === 'unpaid' ? '' : 'unpaid'); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">বকেয়া / Due</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_due}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">৳ {summary.due_amount.toLocaleString()}</p>
        </div>

        <div
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${yearFilter === summary.currentFY && statusFilter === 'unpaid' ? 'border-yellow-500 ring-2 ring-yellow-100' : 'border-gray-100 hover:border-yellow-200'}`}
          onClick={() => {
            if (yearFilter === summary.currentFY && statusFilter === 'unpaid') {
              setYearFilter('')
              setStatusFilter('')
            } else {
              setYearFilter(summary.currentFY)
              setStatusFilter('unpaid')
            }
            setPage(1)
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">শীঘ্রই বকেয়া / Near Due</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.total_near_due}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">Current FY: {summary.currentFY}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব অর্থবছর' : 'All Fiscal Years'}</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
          <option value="unpaid">{lang === 'bn' ? 'পরিশোধিত নয়' : 'Unpaid'}</option>
          <option value="paid">{lang === 'bn' ? 'পরিশোধিত' : 'Paid'}</option>
        </select>
      </div>

      <DataTable columns={columns} data={taxes} loading={loading} emptyMessage={lang === 'bn' ? 'কোনো ট্যাক্স রেকর্ড পাওয়া যায়নি' : 'No holding tax records found.'} />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />
    </div>
  )
}
