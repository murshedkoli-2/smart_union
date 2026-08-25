import mongoose from 'mongoose'
import Payment, { type IPayment } from '@/models/Payment'
import Cashbook from '@/models/Cashbook'
import Tax from '@/models/Tax'
import { CreatePaymentSchema } from '@/lib/utils/validators'
import { NotFoundError, ValidationError, BadRequestError } from '@/lib/utils/errors'
import { generateReceiptNo, getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import { inTransaction } from '@/lib/db/transaction'
import { createAuditLog } from './audit-log.service'
import { getSystemSettings } from './system-settings.service'
import type { JwtAccessPayload } from '@/types/auth.types'
import { clampPagination } from '@/lib/utils/pagination'

// ── Collect Payment ───────────────────────────────────────────────────────────

/**
 * Records a cash payment and its matching cashbook entry.
 *
 * Payment, ledger entry and audit record are written in one transaction: a
 * receipt without a ledger line silently unbalances the books, and nobody
 * notices until a manual reconciliation.
 *
 * Pass `session` to join a larger atomic operation (certificate approval
 * collects a payment and approves the certificate as a single unit).
 */
export async function collectPayment(
  dto: unknown,
  actor: JwtAccessPayload,
  session?: mongoose.ClientSession,
) {
  const parsed = CreatePaymentSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const { payment_type, source_type, reference_id, amount, paid_by_citizen, note } = parsed.data

  const year = new Date().getFullYear()
  const fiscalYear = getCurrentFiscalYear()

  // Outside the transaction on purpose — see withTransaction. A rolled-back
  // payment burns a receipt number rather than risking a duplicate.
  const receiptNo = await generateReceiptNo(year)

  // Determine cashbook source
  const cashbookSource: 'certificate' | 'tax' | 'other' =
    source_type === 'tax'
      ? 'tax'
      : source_type.startsWith('certificate') || source_type === 'warish' || source_type === 'family_certificate'
        ? 'certificate'
        : 'other'

  return inTransaction(session, async (txn) => {
    const paymentData: Partial<IPayment> = {
      receipt_no: receiptNo,
      payment_type,
      source_type,
      reference_id: new mongoose.Types.ObjectId(reference_id),
      amount,
      payment_method: 'cash',
      paid_by_citizen: new mongoose.Types.ObjectId(paid_by_citizen),
      collected_by: new mongoose.Types.ObjectId(actor.sub),
    }
    if (note) paymentData.note = note

    const [payment] = await Payment.create([paymentData], txn ? { session: txn } : {})

    // ALWAYS create a cashbook entry
    await Cashbook.create(
      [
        {
          entry_type: 'income',
          source: cashbookSource,
          amount,
          reference_id: payment._id,
          reference_type: 'Payment',
          description: `${source_type} payment, receipt: ${receiptNo}`,
          fiscal_year: fiscalYear,
          recorded_by: new mongoose.Types.ObjectId(actor.sub),
        },
      ],
      txn ? { session: txn } : {},
    )

    await createAuditLog(
      {
        user_id: actor.sub,
        user_role: actor.role,
        action: 'payment.collect',
        target_model: 'Payment',
        target_id: payment._id as mongoose.Types.ObjectId,
        status: 'success',
      },
      txn,
    )

    return payment.toObject()
  })
}

// ── List Payments ─────────────────────────────────────────────────────────────

export async function listPayments(
  query: {
    payment_type?: string
    source_type?: string
    collected_by?: string
    page?: number
    limit?: number
  },
  actor: JwtAccessPayload,
) {
  const { payment_type, source_type, collected_by } = query
  const { page, limit } = clampPagination(query)

  const filter: Record<string, unknown> = {}
  if (payment_type) filter.payment_type = payment_type
  if (source_type) filter.source_type = source_type
  if (collected_by) filter.collected_by = new mongoose.Types.ObjectId(collected_by)

  // An entrepreneur may only see payments they personally collected.
  //
  // This assignment must be unconditional and must come AFTER the caller's
  // `collected_by` filter. Previously it was skipped whenever the caller
  // supplied `collected_by`, so `?collected_by=<someone else's id>` read
  // another collector's payment history.
  if (actor.role === 'entrepreneur') {
    filter.collected_by = new mongoose.Types.ObjectId(actor.sub)
  }

  const skip = (page - 1) * limit
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('paid_by_citizen', 'name_bn name_en mobile')
      .populate('collected_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ])

  return { payments, total, page, limit }
}

// ── Get Payment By ID ─────────────────────────────────────────────────────────

/**
 * Applies the same visibility rule as listPayments to a single record.
 *
 * An entrepreneur sees only what they collected. Without this, the ownership
 * filter in listPayments was decorative: the ids it withholds were still
 * readable one at a time through GET /api/payments/[id].
 *
 * Not-found rather than forbidden on purpose — a 403 confirms the id exists,
 * which is the fact being withheld.
 */
function assertCanReadPayment(
  payment: { collected_by?: unknown },
  actor: JwtAccessPayload,
): void {
  if (actor.role !== 'entrepreneur') return

  // collected_by is populated, so read the id off the populated document.
  const collector = payment.collected_by as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId | undefined
  const collectorId = String(
    (collector as { _id?: mongoose.Types.ObjectId })?._id ?? collector ?? '',
  )

  if (collectorId !== actor.sub) throw new NotFoundError('Payment not found')
}

export async function getPaymentById(id: string, actor: JwtAccessPayload) {
  const payment = await Payment.findById(id)
    .populate('paid_by_citizen', 'name_bn name_en mobile')
    .populate('collected_by', 'name email')
    .lean()
  if (!payment) throw new NotFoundError('Payment not found')
  assertCanReadPayment(payment, actor)
  return payment
}

// ── Get Tax Payment Receipt Data ──────────────────────────────────────────────

export async function getTaxPaymentReceiptData(paymentId: string, actor: JwtAccessPayload) {
  // Get payment with populated fields
  const payment = await Payment.findById(paymentId)
    .populate('paid_by_citizen', 'name_bn name_en mobile nid_no')
    .populate('collected_by', 'name')
    .lean()

  if (!payment) throw new NotFoundError('Payment not found')
  assertCanReadPayment(payment, actor)

  // Verify it's a tax payment
  if (payment.payment_type !== 'tax') {
    throw new BadRequestError('This payment is not a tax payment')
  }

  // Get the tax record
  const tax = await Tax.findById(payment.reference_id)
    .populate('citizen_id', 'address ward_no')
    .lean()

  if (!tax) throw new NotFoundError('Tax record not found')

  // Get system settings
  const systemSettings = await getSystemSettings()

  return {
    payment,
    tax,
    systemSettings,
  }
}
