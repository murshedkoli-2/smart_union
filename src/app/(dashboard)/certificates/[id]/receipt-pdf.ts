/**
 * A5 cash-payment receipt for a certificate approval.
 *
 * The receipt is built as HTML and rasterised, so every value interpolated
 * into it must be escaped: a citizen name or a payment note carrying markup
 * would otherwise rewrite the receipt it appears on.
 */
import { escapeHtml } from '@/lib/utils/html'
import type { CertificateRecord, PaymentReceipt } from '@/types/certificate.types'

function receiptRow(label: string, value: string, emphasis = false): string {
  const valueStyle = emphasis
    ? 'padding: 10px 0; font-weight: 700; text-align: right; font-size: 16px;'
    : 'padding: 8px 0; font-weight: 600; text-align: right;'
  const labelStyle = emphasis
    ? 'padding: 10px 0; color: #6b7280; font-weight: 600;'
    : 'padding: 8px 0; color: #6b7280;'
  const rowStyle = emphasis ? ' style="border-top: 1px solid #e5e7eb;"' : ''

  return `<tr${rowStyle}><td style="${labelStyle}">${escapeHtml(label)}</td><td style="${valueStyle}">${escapeHtml(value)}</td></tr>`
}

export function buildReceiptHtml(payment: PaymentReceipt, cert: CertificateRecord): string {
  const citizenName = cert.citizen_id?.name_bn || cert.citizen_id?.name_en || 'Citizen'

  const rows = [
    receiptRow('Receipt No', payment.receipt_no),
    receiptRow('Certificate No', cert.certificate_no ?? 'Generated on approval'),
    receiptRow('Citizen', citizenName),
    receiptRow('Payment Method', payment.payment_method),
    receiptRow('Amount', `৳ ${Number(payment.amount).toLocaleString()}`, true),
    receiptRow('Paid At', new Date(payment.createdAt).toLocaleString('en-BD')),
    payment.note ? receiptRow('Note', payment.note) : '',
  ].join('')

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; padding: 32px; width: 420px; box-sizing: border-box;">
      <div style="border: 1.5px solid #d1d5db; border-radius: 12px; padding: 28px;">
        <h2 style="margin: 0 0 4px; font-size: 20px;">Payment Receipt</h2>
        <p style="margin: 0 0 20px; color: #6b7280; font-size: 13px;">Certificate cash payment record</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table>
      </div>
    </div>
  `
}

/**
 * Rasterises the receipt onto an A5 page and saves it.
 *
 * Not downloadHtmlAsPdf: that helper is built around A4 width-fitted
 * documents, and a receipt printed on A5 is what the office files.
 */
export async function downloadReceiptPdf(
  payment: PaymentReceipt,
  cert: CertificateRecord,
): Promise<void> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; left:-9999px; top:0; background:#fff;'
  container.innerHTML = buildReceiptHtml(payment, cert)
  document.body.appendChild(container)

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Let fonts and layout settle before the snapshot.
    await new Promise((resolve) => setTimeout(resolve, 300))

    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const A5_WIDTH_MM = 148
    const A5_HEIGHT_MM = 210
    const ratio = Math.min(A5_WIDTH_MM / canvas.width, A5_HEIGHT_MM / canvas.height)
    const width = canvas.width * ratio
    const height = canvas.height * ratio

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (A5_WIDTH_MM - width) / 2, 10, width, height)
    pdf.save(`receipt-${payment.receipt_no}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
