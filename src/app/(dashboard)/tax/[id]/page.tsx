'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'
import { generateTaxReceiptHtml } from '@/lib/utils/tax-receipt-render'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

interface TaxCitizen {
  _id: string
  name_bn: string
  name_en: string
  mobile: string
  holding_no: string
  ward_no: number
  address?: {
    village_bn: string
    village_en: string
    post_office_bn: string
    thana_bn: string
    district_bn: string
  }
}

interface TaxPayment {
  _id: string
  receipt_no: string
  amount: number
  payment_method: string
  payment_type: string
  source_type: string
  createdAt: string
  collected_by?: { name: string; email: string }
}

interface TaxDetail {
  _id: string
  holding_no: string
  fiscal_year: string
  amount: number
  status: string
  paid_at: string | null
  createdAt: string
  updatedAt: string
  citizen_id: TaxCitizen
  payment_id: TaxPayment | null
  assessed_by: string
}

export default function TaxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const { data: tax, loading, error } = useApi<TaxDetail>(`/api/tax/${id}`, [id])

  const handleDownloadPdf = async () => {
    if (!tax?.payment_id) return
    setDownloading(true)
    setPdfError('')

    try {
      const res = await apiCall(`/api/payments/${tax.payment_id._id}/tax-receipt`)
      if (!res.ok) throw new Error('Failed to fetch receipt data')
      const json = await res.json()
      const receiptData = json.data ?? json

      await downloadHtmlAsPdf(
        generateTaxReceiptHtml(receiptData),
        `tax-receipt-${tax.payment_id.receipt_no}.pdf`,
        { selector: '.receipt-container', settleMs: 700, quality: 0.95 },
      )
    } catch {
      setPdfError('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error || !tax) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error ?? 'Tax record not found.'}
        </div>
      </div>
    )
  }

  const citizen = tax.citizen_id ?? null

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Holding Tax Details"
        subtitle={`Fiscal Year: ${tax.fiscal_year}`}
        action={
          <div className="flex items-center gap-2">
            {tax.payment_id && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {downloading ? 'Generating...' : 'Download Receipt PDF'}
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>
        }
      />

      {pdfError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{pdfError}</div>
      )}

      {/* Status Banner */}
      <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${
        tax.status === 'paid'
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div>
          <p className="text-sm font-medium text-gray-700">Payment Status</p>
          <div className="mt-1">
            <StatusBadge status={tax.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">৳ {tax.amount.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tax Record Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tax Record</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Holding No</dt>
              <dd className="font-medium text-gray-900">
                {tax.holding_no && tax.holding_no !== 'PENDING'
                  ? <span className="text-green-700">{tax.holding_no}</span>
                  : <span className="text-gray-400">Not Generated</span>
                }
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Fiscal Year</dt>
              <dd className="font-medium text-gray-900">{tax.fiscal_year}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-medium text-gray-900">৳ {tax.amount.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Status</dt>
              <dd><StatusBadge status={tax.status} /></dd>
            </div>
            {tax.paid_at && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Paid At</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(tax.paid_at).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-gray-900">
                {new Date(tax.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Citizen Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Citizen</h2>
            {citizen && (
              <button
                onClick={() => router.push(`/citizens/${citizen._id}`)}
                className="text-xs px-3 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
              >
                View Profile
              </button>
            )}
          </div>
          {!citizen ? (
            <p className="text-sm text-gray-400">Citizen information unavailable.</p>
          ) : (
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Name (বাংলা)</dt>
                <dd className="font-medium text-gray-900">{citizen.name_bn}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Name (English)</dt>
                <dd className="font-medium text-gray-900">{citizen.name_en}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Mobile</dt>
                <dd className="font-medium text-gray-900">{citizen.mobile}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Ward No</dt>
                <dd className="font-medium text-gray-900">{citizen.ward_no ?? '—'}</dd>
              </div>
              {citizen.address && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Village</dt>
                  <dd className="font-medium text-gray-900">{citizen.address.village_bn}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {/* Payment Info */}
      {tax.payment_id && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Receipt</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-xs text-gray-500">Receipt No</dt>
              <dd className="mt-1 text-sm font-semibold text-green-700">{tax.payment_id.receipt_no}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Amount Paid</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">৳ {tax.payment_id.amount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Method</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 capitalize">{tax.payment_id.payment_method}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Date</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {new Date(tax.payment_id.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </div>
            {tax.payment_id.collected_by && (
              <div>
                <dt className="text-xs text-gray-500">Collected By</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{tax.payment_id.collected_by.name}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
