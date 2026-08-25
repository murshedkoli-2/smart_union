'use client'

/**
 * Certificate detail: metadata, verification QR, approval and printing.
 *
 * The preview HTML is built by ./preview-html and the receipt PDF by
 * ./receipt-pdf, so this file is the screen and its workflow only.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import StatusBadge from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import type {
  CertificateRecord,
  PaymentReceipt,
  UnionSettings,
} from '@/types/certificate.types'
import {
  buildCertificatePreviewHtml,
  certificateTypeLabel,
  effectiveCertificateStatus,
} from './preview-html'
import { downloadReceiptPdf } from './receipt-pdf'
import {
  ApproveModal,
  CertificateDetailsCard,
  ReceiptModal,
  VerificationQrCard,
} from './components'

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useUser()
  const canApprove = isSuperAdmin(currentUser)

  const [certificateQrDataUrl, setCertificateQrDataUrl] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [receiptPayment, setReceiptPayment] = useState<PaymentReceipt | null>(null)

  const { data: cert, loading, error, refetch } = useApi<CertificateRecord>(`/api/certificates/${id}`)
  const { data: settings } = useApi<UnionSettings>('/api/system-settings')

  const effectiveStatus = effectiveCertificateStatus(cert?.status)
  const certificateFee = Number(cert?.template_id?.fee ?? 0)

  // Built server-side from the certificate's verification token — the client
  // holds no token, so there is nothing to fall back to.
  const verificationUrl = useMemo(
    () => (cert && effectiveStatus === 'approved' ? cert.qr_code_url || '' : ''),
    [cert, effectiveStatus],
  )

  useEffect(() => {
    if (!verificationUrl) return
    let cancelled = false

    QRCode.toDataURL(verificationUrl, { width: 96, margin: 1, errorCorrectionLevel: 'M' })
      .then((dataUrl) => {
        if (!cancelled) setCertificateQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setCertificateQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [verificationUrl])

  const renderedCertificateHtml = useMemo(() => {
    // Wait for both, so the preview does not shift as settings arrive.
    if (!cert || !settings) return ''
    return buildCertificatePreviewHtml({
      cert,
      settings,
      qrDataUrl: certificateQrDataUrl,
      verificationUrl,
      effectiveStatus,
    })
  }, [cert, settings, certificateQrDataUrl, verificationUrl, effectiveStatus])

  const handleSubmitForApproval = async () => {
    const res = await apiCall(`/api/certificates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pending' }),
    })
    if (res.ok) {
      toast.success('Certificate submitted for approval.')
      refetch()
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to change status.')
    }
  }

  const handleApprove = async () => {
    if (!cert?.citizen_id?._id) {
      toast.error('Citizen information is missing for payment collection.')
      return
    }

    setApproving(true)
    const res = await apiCall(`/api/certificates/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        collect_payment: true,
        amount: certificateFee,
        note: cert.certificate_no
          ? `Cash payment for certificate ${cert.certificate_no}`
          : 'Cash payment for certificate approval',
      }),
    })

    if (res.ok) {
      toast.success('Certificate approved.')
      const payload = await res.json().catch(() => ({}))
      const payment = payload?.data?.payment as PaymentReceipt | undefined
      if (payment) setReceiptPayment(payment)
      setShowApproveModal(false)
      refetch()
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to approve.')
    }
    setApproving(false)
  }

  const handlePrintReceipt = async () => {
    if (!receiptPayment || !cert) return
    try {
      await downloadReceiptPdf(receiptPayment, cert)
    } catch {
      toast.error('Failed to generate receipt PDF.')
    }
  }

  const handleDownloadPdf = async () => {
    if (!cert || !renderedCertificateHtml) {
      toast.error('Certificate preview is not ready yet.')
      return
    }

    try {
      await downloadHtmlAsPdf(
        renderedCertificateHtml,
        `${cert.certificate_no || `certificate-${cert._id}`}.pdf`,
        {
          // Target the .page div — the first child can be a <style> tag,
          // because the certificate templates render a full HTML document.
          selector: '.page',
          settleMs: 700,
          quality: 0.95,
          containerStyle: 'margin:0; padding:0;',
        },
      )
    } catch {
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  // Always points at the latest handleDownloadPdf without making it a
  // dependency. Listing the function directly would re-run the auto-download
  // effect on every render (it is re-created each time); omitting it left the
  // dependency array dishonest and the closure able to go stale. Written in an
  // effect rather than during render, which React does not allow.
  const downloadPdfRef = useRef(handleDownloadPdf)

  useEffect(() => {
    downloadPdfRef.current = handleDownloadPdf
  })

  // Auto-download if ?download=1 is present. The ref guard makes this fire at
  // most once — the effect re-runs as cert/html/loading settle, and without it
  // a slow render could start two PDF generations.
  const autoDownloadStarted = useRef(false)

  useEffect(() => {
    if (autoDownloadStarted.current) return
    if (searchParams.get('download') === '1' && cert && renderedCertificateHtml && !loading) {
      autoDownloadStarted.current = true
      downloadPdfRef.current()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [cert, renderedCertificateHtml, loading, searchParams])

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (error || !cert) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Certificate not found.'}
        </div>
      </div>
    )
  }

  const isWarishOrFamily = cert.certificate_type === 'WAR' || cert.certificate_type === 'FAM'
  const isBn = cert.language === 'bn'
  const langLabel = isBn ? 'বাংলা' : 'English'
  const langColor = isBn ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
  const typeLabel = certificateTypeLabel(cert.certificate_type)
  const issuedDate = new Date(cert.approved_at || cert.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{typeLabel}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${langColor}`}>{langLabel}</span>
            <StatusBadge status={effectiveStatus ?? ''} />
          </div>
          {cert.certificate_no && (
            <p className="mt-0.5 font-mono text-sm text-gray-400">{cert.certificate_no}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cert.payment_id && (
            <button
              onClick={() => setReceiptPayment(cert.payment_id ?? null)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Payment Receipt
            </button>
          )}
          {renderedCertificateHtml && (currentUser?.role !== 'citizen' || effectiveStatus === 'approved') && (
            <button
              onClick={handleDownloadPdf}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Download PDF
            </button>
          )}
          {cert.status === 'draft' && currentUser?.role !== 'citizen' && (
            <button
              onClick={handleSubmitForApproval}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Submit for Review
            </button>
          )}
          {effectiveStatus === 'pending' && canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Approve
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CertificateDetailsCard
          cert={cert}
          effectiveStatus={effectiveStatus}
          langLabel={langLabel}
          langColor={langColor}
          typeLabel={typeLabel}
          issuedDate={issuedDate}
        />
        <VerificationQrCard
          verificationUrl={verificationUrl}
          certificateNo={cert.certificate_no}
          approved={effectiveStatus === 'approved'}
        />
      </div>

      {/* Dynamic Data — only for non-warish/family certs */}
      {!isWarishOrFamily && cert.dynamic_data && Object.keys(cert.dynamic_data).length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Dynamic Data</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Object.entries(cert.dynamic_data).map(([key, value]) => (
              <div key={key}>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-gray-800">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ApproveModal
        open={showApproveModal}
        cert={cert}
        fee={certificateFee}
        approving={approving}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
      />

      <ReceiptModal
        payment={receiptPayment}
        certificateNo={cert.certificate_no}
        onClose={() => setReceiptPayment(null)}
        onPrint={handlePrintReceipt}
      />
    </div>
  )
}
