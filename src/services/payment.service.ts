import mongoose from 'mongoose'
import Payment, { type IPayment } from '@/models/Payment'
import Cashbook from '@/models/Cashbook'
import Tax from '@/models/Tax'
import Citizen from '@/models/Citizen'
import User from '@/models/User'
import { CreatePaymentSchema } from '@/lib/utils/validators'
import { NotFoundError, ValidationError, BadRequestError } from '@/lib/utils/errors'
import { generateReceiptNo, getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import { createAuditLog } from './audit-log.service'
import { getSystemSettings } from './system-settings.service'
import type { JwtAccessPayload } from '@/types/auth.types'

// ── Collect Payment ───────────────────────────────────────────────────────────

export async function collectPayment(dto: unknown, actor: JwtAccessPayload) {
  const parsed = CreatePaymentSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const { payment_type, source_type, reference_id, amount, paid_by_citizen, note } = parsed.data

  const year = new Date().getFullYear()
  const fiscalYear = getCurrentFiscalYear()

  // Generate receipt number atomically
  const receiptNo = await generateReceiptNo(year)

  // Determine cashbook source
  const cashbookSource: 'certificate' | 'tax' | 'other' =
    source_type === 'tax'
      ? 'tax'
      : source_type.startsWith('certificate') || source_type === 'warish' || source_type === 'family_certificate'
        ? 'certificate'
        : 'other'

  // Create payment
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
  const payment = await Payment.create(paymentData)

  // ALWAYS create a cashbook entry
  await Cashbook.create({
    entry_type: 'income',
    source: cashbookSource,
    amount,
    reference_id: payment._id,
    reference_type: 'Payment',
    description: `${source_type} payment, receipt: ${receiptNo}`,
    fiscal_year: fiscalYear,
    recorded_by: new mongoose.Types.ObjectId(actor.sub),
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'payment.collect',
    target_model: 'Payment',
    target_id: payment._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return payment.toObject()
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
  const { payment_type, source_type, collected_by, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (payment_type) filter.payment_type = payment_type
  if (source_type) filter.source_type = source_type
  if (collected_by) filter.collected_by = new mongoose.Types.ObjectId(collected_by)

  // Admin can only see payments they personally collected
  if (actor.role === 'entrepreneur' && !collected_by) {
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

export async function getPaymentById(id: string, _actor: JwtAccessPayload) {
  const payment = await Payment.findById(id)
    .populate('paid_by_citizen', 'name_bn name_en mobile')
    .populate('collected_by', 'name email')
    .lean()
  if (!payment) throw new NotFoundError('Payment not found')
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
  const systemSettings = await getSystemSettings(actor)

  return {
    payment,
    tax,
    systemSettings,
  }
}
