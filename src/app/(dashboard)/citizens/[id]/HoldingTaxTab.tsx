'use client'

/** Holding number, the tax record table, and the assess-tax modal. */
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import type { CitizenTaxData } from '@/types/citizen.types'

export const FISCAL_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']
const DEFAULT_FISCAL_YEAR = '2025-2026'

const PLUS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const HEADERS = ['Fiscal Year', 'Amount', 'Status', 'Paid At', 'Action']

export default function HoldingTaxTab({
  taxData,
  loading,
  canAssess,
  canCollect,
  assessing,
  payingTaxId,
  onAssess,
  onPay,
  onDownloadReceipt,
}: {
  taxData: CitizenTaxData | null
  loading: boolean
  canAssess: boolean
  canCollect: boolean
  assessing: boolean
  payingTaxId: string | null
  onAssess: (fiscalYear: string, amount: string) => Promise<boolean>
  onPay: (taxId: string) => void
  onDownloadReceipt: (paymentId: string) => void
}) {
  const [showAssess, setShowAssess] = useState(false)
  const [form, setForm] = useState({ fiscal_year: DEFAULT_FISCAL_YEAR, amount: '' })

  const closeAssess = () => {
    setShowAssess(false)
    setForm({ fiscal_year: DEFAULT_FISCAL_YEAR, amount: '' })
  }

  const submitAssess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await onAssess(form.fiscal_year, form.amount)) closeAssess()
  }

  const taxes = taxData?.taxes ?? []

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">হোল্ডিং তথ্য / Holding Information</h3>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500">হোল্ডিং নং / Holding No</p>
                <p className="text-lg font-bold text-green-700">
                  {taxData?.holding_no ?? <span className="text-gray-400">Not Generated</span>}
                </p>
              </div>
              {taxData?.holding_no && (
                <div className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                  First payment generates holding number
                </div>
              )}
            </div>
          </div>
          {canAssess && (
            <button
              onClick={() => setShowAssess(true)}
              className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
            >
              {PLUS_ICON}
              Assess Holding Tax
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">
          হোল্ডিং ট্যাক্স রেকর্ড / Holding Tax Records
        </h3>
        {loading ? (
          <div className="h-32 animate-pulse rounded bg-gray-100" />
        ) : taxes.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No holding tax records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {HEADERS.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {taxes.map((tax) => (
                  <tr key={tax._id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{tax.fiscal_year}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      ৳ {tax.amount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={tax.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {tax.paid_at ? new Date(tax.paid_at).toLocaleDateString('en-BD') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {tax.status === 'unpaid' && canCollect && (
                        <button
                          onClick={() => onPay(tax._id)}
                          disabled={payingTaxId === tax._id}
                          className="rounded border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          {payingTaxId === tax._id ? 'Processing...' : 'Pay Now'}
                        </button>
                      )}
                      {tax.status === 'paid' && tax.payment_id && (
                        <button
                          onClick={() => onDownloadReceipt(tax.payment_id!)}
                          className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Download Receipt
                        </button>
                      )}
                      {tax.status === 'paid' && !tax.payment_id && (
                        <span className="text-xs text-gray-400">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAssess} onClose={closeAssess} title="Assess Holding Tax" size="sm">
        <form onSubmit={submitAssess} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fiscal Year *</label>
            <select
              required
              value={form.fiscal_year}
              onChange={(e) => setForm((f) => ({ ...f, fiscal_year: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {FISCAL_YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Amount (৳) *</label>
            <input
              required
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeAssess}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assessing}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {assessing ? 'Assessing...' : 'Assess Holding Tax'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
