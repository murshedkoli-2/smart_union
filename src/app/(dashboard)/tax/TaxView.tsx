'use client'

import { useRouter } from 'next/navigation'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { useLanguage } from '@/contexts/LanguageContext'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'

export interface TaxRecordRow {
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

export interface TaxSummaryData {
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

/** Interactive shell; rows and totals come from the Server Component. */
export default function TaxView({
  taxes,
  summary: summaryData,
  total,
  page,
  limit,
}: {
  taxes: TaxRecordRow[]
  summary: TaxSummaryData
  total: number
  page: number
  limit: number
}) {
  const router = useRouter()
  const { lang } = useLanguage()
  const { get, apply, isPending } = useUrlFilters('/tax')
  const yearFilter = get('fiscal_year')
  const statusFilter = get('status')

  // Totals are computed on the server; only the current fiscal year, which is
  // derived from the clock rather than the data, is added here.
  const summary = { ...summaryData, currentFY: getCurrentFiscalYear() }

  const columns: Column<TaxRecordRow>[] = [
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
          onClick={() => apply({ status: statusFilter === 'paid' ? '' : 'paid' })}
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
          onClick={() => apply({ status: statusFilter === 'unpaid' ? '' : 'unpaid' })}
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
            const isActive = yearFilter === summary.currentFY && statusFilter === 'unpaid'
            apply(
              isActive
                ? { fiscal_year: '', status: '' }
                : { fiscal_year: summary.currentFY, status: 'unpaid' },
            )
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={yearFilter}
          onChange={(e) => apply({ fiscal_year: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব অর্থবছর' : 'All Fiscal Years'}</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => apply({ status: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
          <option value="unpaid">{lang === 'bn' ? 'পরিশোধিত নয়' : 'Unpaid'}</option>
          <option value="paid">{lang === 'bn' ? 'পরিশোধিত' : 'Paid'}</option>
        </select>
      </div>

      <DataTable columns={columns} data={taxes} loading={isPending} emptyMessage={lang === 'bn' ? 'কোনো ট্যাক্স রেকর্ড পাওয়া যায়নি' : 'No holding tax records found.'} />
      <Pagination
        total={total}
        page={page}
        limit={limit}
        onChange={(next) => apply({ page: String(next) })}
      />
    </div>
  )
}
