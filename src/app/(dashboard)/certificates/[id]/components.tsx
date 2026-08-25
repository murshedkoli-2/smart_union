'use client'

/** Presentational pieces of the certificate detail screen. */
import CertificateQrCode from '@/components/certificates/CertificateQrCode'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import type { CertificateRecord, PaymentReceipt } from '@/types/certificate.types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  className = 'font-medium text-gray-900',
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  )
}

export function CertificateDetailsCard({
  cert,
  effectiveStatus,
  langLabel,
  langColor,
  typeLabel,
  issuedDate,
}: {
  cert: CertificateRecord
  effectiveStatus?: string
  langLabel: string
  langColor: string
  typeLabel: string
  issuedDate: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Certificate Details</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Field label="Certificate No">
            <p className="font-mono text-sm font-semibold text-gray-900">
              {cert.certificate_no ?? (
                <span className="font-sans font-normal italic text-gray-400">Not generated</span>
              )}
            </p>
          </Field>
        </div>
        <Field label="Language">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${langColor}`}>
            {langLabel}
          </span>
        </Field>
        <Field label="Type">
          <p className="text-sm text-gray-800">{typeLabel}</p>
        </Field>
        <Field label="Status">
          <StatusBadge status={effectiveStatus ?? ''} />
        </Field>
        <Field label="Fiscal Year">
          <p className="text-sm text-gray-800">{cert.fiscal_year}</p>
        </Field>
        <Field label="Issued">
          <p className="text-sm text-gray-800">{issuedDate}</p>
        </Field>
        {cert.citizen_id && (
          <div className="col-span-2 sm:col-span-3">
            <Field label="Citizen">
              <p className="text-sm text-gray-800">
                <span className="font-medium">{cert.citizen_id.name_bn}</span>
                <span className="ml-2 text-gray-400">({cert.citizen_id.name_en})</span>
              </p>
            </Field>
          </div>
        )}
        {cert.template_id?.name && (
          <div className="col-span-2 sm:col-span-1">
            <Field label="Template">
              <p className="text-sm text-gray-800">{cert.template_id.name}</p>
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}

export function VerificationQrCard({
  verificationUrl,
  certificateNo,
  approved,
}: {
  verificationUrl: string
  certificateNo: string | null
  approved: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Verification QR</h3>
      {approved && verificationUrl ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <CertificateQrCode
              value={verificationUrl}
              alt={`QR for ${certificateNo ?? 'certificate'}`}
              size={150}
              className="block rounded bg-white"
            />
          </div>
          <p className="text-center text-xs font-medium text-emerald-700">
            Scan to verify this certificate
          </p>
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full break-all rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs text-gray-500 hover:text-green-700"
          >
            {verificationUrl}
          </a>
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
          <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p className="text-xs text-gray-400">QR code will appear<br />after approval</p>
        </div>
      )}
    </div>
  )
}

export function ApproveModal({
  open,
  cert,
  fee,
  approving,
  onClose,
  onConfirm,
}: {
  open: boolean
  cert: CertificateRecord
  fee: number
  approving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={() => { if (!approving) onClose() }}
      title="Approve Certificate"
      size="sm"
    >
      <div className="space-y-4">
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 px-4">
          <SummaryRow
            label="Certificate No"
            value={cert.certificate_no ?? '—'}
            className="font-mono font-medium text-gray-900"
          />
          <SummaryRow
            label="Citizen"
            value={cert.citizen_id?.name_bn || cert.citizen_id?.name_en || '—'}
          />
          <SummaryRow label="Payment Method" value="Cash" />
          <SummaryRow
            label="Amount"
            value={`৳ ${fee.toLocaleString()}`}
            className="font-bold text-green-700"
          />
        </div>
        <p className="text-sm text-gray-500">
          This will approve the certificate and record a cash payment receipt.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={approving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={approving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {approving ? 'Processing...' : 'Confirm & Approve'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function ReceiptModal({
  payment,
  certificateNo,
  onClose,
  onPrint,
}: {
  payment: PaymentReceipt | null
  certificateNo: string | null
  onClose: () => void
  onPrint: () => void
}) {
  return (
    <Modal open={!!payment} onClose={onClose} title="Payment Receipt" size="sm">
      {payment && (
        <div className="space-y-4">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 px-4">
            <SummaryRow
              label="Receipt No"
              value={payment.receipt_no}
              className="font-semibold text-gray-900"
            />
            <SummaryRow
              label="Certificate No"
              value={certificateNo ?? '—'}
              className="font-mono font-medium text-gray-900"
            />
            <SummaryRow
              label="Amount"
              value={`৳ ${Number(payment.amount).toLocaleString()}`}
              className="font-bold text-green-700"
            />
            <SummaryRow
              label="Method"
              value={payment.payment_method}
              className="font-medium capitalize text-gray-900"
            />
            <SummaryRow
              label="Paid At"
              value={new Date(payment.createdAt).toLocaleString('en-BD')}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onPrint}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
