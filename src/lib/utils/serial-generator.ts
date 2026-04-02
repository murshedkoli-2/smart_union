import Counter from '@/models/Counter'
import type { CertificateLanguage, CertificateTypeCode } from '@/constants/certificate-types'

/**
 * Atomically increments a counter and returns zero-padded serial.
 * Uses findOneAndUpdate + $inc + upsert — safe under concurrent requests.
 * NEVER use count() + 1 — race condition risk.
 */
async function nextSeq(counterId: string, padLength = 4): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )

  if (!counter) {
    throw new Error(`Failed to generate sequence for counter ${counterId}`)
  }

  return String(counter.seq).padStart(padLength, '0')
}

/**
 * Generate holding number for a citizen.
 * Format: {wardNo}-{0001}
 * Example: 1-0001, 2-0015, 9-0003
 * Generated ONLY on first tax payment — never pre-generated.
 * Number starts from 1 per ward.
 */
export async function generateHoldingNo(wardNo: number): Promise<string> {
  const serial = await nextSeq(`holding_ward_${wardNo}`)
  return `${wardNo}-${serial}`
}

/**
 * Generate certificate number.
 * Format: {LANG}-{TYPE}-{YYYY}-{SERIAL}
 * Example: BN-CIT-2026-0001
 */
export async function generateCertificateNo(
  language: CertificateLanguage,
  type: CertificateTypeCode,
  year: number,
): Promise<string> {
  const lang = language.toUpperCase()
  const serial = await nextSeq(`cert_${lang}_${type}_${year}`)
  return `${lang}-${type}-${year}-${serial}`
}

/**
 * Generate payment receipt number.
 * Format: REC-{YYYY}-{00000001}
 */
export async function generateReceiptNo(year: number): Promise<string> {
  const serial = await nextSeq(`receipt_${year}`, 8)
  return `REC-${year}-${serial}`
}

/**
 * Get current fiscal year string.
 * Bangladesh fiscal year: July 1 – June 30.
 * Example: for any date in FY2025-2026, returns "2025-2026"
 */
export function getCurrentFiscalYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-based
  const year = now.getFullYear()
  // July (7) starts the new fiscal year
  if (month >= 7) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}
