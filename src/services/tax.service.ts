import mongoose from 'mongoose'
import Tax from '@/models/Tax'
import Citizen from '@/models/Citizen'
import Cashbook from '@/models/Cashbook'
import { CreateTaxSchema } from '@/lib/utils/validators'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  ConflictError,
} from '@/lib/utils/errors'
import { generateHoldingNo, generateReceiptNo, getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import { withTransaction } from '@/lib/db/transaction'
import { createAuditLog } from './audit-log.service'
import type { JwtAccessPayload } from '@/types/auth.types'
import Payment, { type IPayment } from '@/models/Payment'

// ── Create Tax ────────────────────────────────────────────────────────────────

export async function createTax(dto: unknown, actor: JwtAccessPayload) {
  const parsed = CreateTaxSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const { citizen_id, fiscal_year, amount } = parsed.data
  
  // Verify citizen exists
  const citizen = await Citizen.findById(citizen_id)
  if (!citizen) throw new NotFoundError('Citizen not found')

  // ONE tax record per citizen per fiscal year
  const existing = await Tax.findOne({ citizen_id, fiscal_year }).lean()
  if (existing) {
    throw new ConflictError(`Tax record already exists for this citizen in fiscal year ${fiscal_year}`)
  }

  // holding_no on tax record uses citizen's existing holding_no or placeholder
  const tax = await Tax.create({
    citizen_id: new mongoose.Types.ObjectId(citizen_id),
    holding_no: citizen.holding_no ?? 'PENDING',
    fiscal_year,
    amount,
    status: 'unpaid',
    assessed_by: new mongoose.Types.ObjectId(actor.sub),
    created_by: new mongoose.Types.ObjectId(actor.sub),
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'tax.create',
    target_model: 'Tax',
    target_id: tax._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return tax.toObject()
}

// ── List Tax ──────────────────────────────────────────────────────────────────

export async function listTax(
  query: {
    fiscal_year?: string
    status?: string
    citizen_id?: string
    page?: number
    limit?: number
  },
  actor: JwtAccessPayload,
) {
  const { fiscal_year, status, citizen_id, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (fiscal_year) filter.fiscal_year = fiscal_year
  if (status) filter.status = status

  if (actor.role === 'citizen') {
    const citizenDoc = await Citizen.findOne({ user_id: actor.sub }).lean()
    if (!citizenDoc) return { records: [], total: 0, page, limit }
    filter.citizen_id = citizenDoc._id
  } else if (citizen_id) {
    filter.citizen_id = new mongoose.Types.ObjectId(citizen_id)
  }

  // Admin can only see tax records they personally created
  if (actor.role === 'entrepreneur') {
    filter.created_by = new mongoose.Types.ObjectId(actor.sub)
  }

  const skip = (page - 1) * limit
  const [taxRecords, total] = await Promise.all([
    Tax.find(filter)
      .populate('citizen_id', 'name_bn name_en mobile holding_no ward_no')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Tax.countDocuments(filter),
  ])

  // citizen_id is an ObjectId on the schema but a document here because of the
  // .populate() above, so it needs a cast — a narrow one naming the fields
  // actually selected, not `any`.
  type PopulatedCitizen = { name_bn?: string; ward_no?: number }

  const records = taxRecords.map((tax) => {
    const citizen = tax.citizen_id as unknown as PopulatedCitizen | null
    return {
      ...tax,
      citizen_name: citizen?.name_bn,
      ward_no: citizen?.ward_no,
    }
  })

  return { records, total, page, limit }
}

// ── Get Tax By ID ─────────────────────────────────────────────────────────────

export async function getTaxById(id: string, _actor: JwtAccessPayload) {
  const tax = await Tax.findById(id)
    .populate('citizen_id', 'name_bn name_en mobile holding_no ward_no address')
    .populate('payment_id')
    .lean()
  if (!tax) throw new NotFoundError('Tax record not found')
  return tax
}

// ── Pay Tax ───────────────────────────────────────────────────────────────────

export async function payTax(
  id: string,
  dto: { paid_by_citizen: string; note?: string },
  actor: JwtAccessPayload,
) {
  const tax = await Tax.findById(id)
  if (!tax) throw new NotFoundError('Tax record not found')
  if (tax.status === 'paid') throw new BadRequestError('Tax has already been paid')

  const citizen = await Citizen.findById(tax.citizen_id)
  if (!citizen) throw new NotFoundError('Citizen not found')

  const year = new Date().getFullYear()
  const fiscalYear = getCurrentFiscalYear()

  // Sequence generators run outside the transaction on purpose — see
  // withTransaction. A rollback burns a number instead of risking a duplicate.
  const receiptNo = await generateReceiptNo(year)
  const needsHoldingNo = !citizen.holding_no
  const holdingNo = needsHoldingNo
    ? await generateHoldingNo(citizen.ward_no)
    : (citizen.holding_no as string)

  // Payment, holding number, tax status, ledger entry and audit record are one
  // atomic unit. Split across separate writes, a mid-flight failure could mark
  // tax paid with no payment behind it, or bank money with no ledger line.
  const payment = await withTransaction(async (txn) => {
    const paymentData: Partial<IPayment> = {
      receipt_no: receiptNo,
      payment_type: 'tax',
      source_type: 'tax',
      reference_id: tax._id as mongoose.Types.ObjectId,
      amount: tax.amount,
      payment_method: 'cash',
      paid_by_citizen: new mongoose.Types.ObjectId(dto.paid_by_citizen),
      collected_by: new mongoose.Types.ObjectId(actor.sub),
    }
    if (dto.note) paymentData.note = dto.note

    const [createdPayment] = await Payment.create([paymentData], txn ? { session: txn } : {})

    // Assign holding_no on first tax payment.
    if (needsHoldingNo) {
      await Citizen.updateOne(
        { _id: citizen._id },
        { $set: { holding_no: holdingNo } },
        txn ? { session: txn } : {},
      )
    }

    tax.status = 'paid'
    tax.payment_id = createdPayment._id as mongoose.Types.ObjectId
    tax.paid_at = new Date()
    tax.holding_no = holdingNo
    await tax.save(txn ? { session: txn } : {})

    await Cashbook.create(
      [
        {
          entry_type: 'income',
          source: 'tax',
          amount: tax.amount,
          reference_id: createdPayment._id,
          reference_type: 'Payment',
          description: `Tax payment for holding ${holdingNo}, fiscal year ${tax.fiscal_year}`,
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
        action: 'tax.pay',
        target_model: 'Tax',
        target_id: tax._id as mongoose.Types.ObjectId,
        changes: {
          before: { status: 'unpaid' },
          after: { status: 'paid', payment_id: createdPayment._id },
        },
        status: 'success',
      },
      txn,
    )

    return createdPayment
  })

  const taxObject = tax.toObject()
  const paymentObject = payment.toObject()

  return {
    tax: {
      ...taxObject,
      _id: taxObject._id.toString(),
      payment_id: paymentObject._id.toString(),
    },
    payment: {
      ...paymentObject,
      _id: paymentObject._id.toString(),
    },
  }
}

// ── Tax Summary ──────────────────────────────────────────────────────────────

export async function getTaxSummary(_actor: JwtAccessPayload) {
  const currentFY = getCurrentFiscalYear()

  const [paidStats, dueStats, nearDueCount] = await Promise.all([
    Tax.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Tax.aggregate([
      { $match: { status: 'unpaid' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Tax.countDocuments({ status: 'unpaid', fiscal_year: currentFY }),
  ])

  return {
    total_paid: paidStats[0]?.count ?? 0,
    total_due: dueStats[0]?.count ?? 0,
    total_near_due: nearDueCount,
    paid_amount: paidStats[0]?.total ?? 0,
    due_amount: dueStats[0]?.total ?? 0,
  }
}

// ── Get Tax By Citizen ───────────────────────────────────────────────────────

export async function getTaxByCitizen(citizenId: string, _actor: JwtAccessPayload) {
  // Get the citizen
  const citizen = await Citizen.findById(citizenId).lean()
  if (!citizen) throw new NotFoundError('Citizen not found')

  // Get all tax records for this citizen
  const taxes = await Tax.find({ citizen_id: new mongoose.Types.ObjectId(citizenId) })
    .sort({ createdAt: -1 })
    .lean()

  // Convert ObjectId fields to strings for frontend
  const taxesFormatted = taxes.map(tax => ({
    ...tax,
    _id: tax._id.toString(),
    payment_id: tax.payment_id?.toString() ?? undefined,
  }))

  // Check current fiscal year payment status
  const currentFiscalYear = getCurrentFiscalYear()
  const currentYearTax = taxesFormatted.find(tax => tax.fiscal_year === currentFiscalYear)

  // Payment is allowed only if:
  // 1. There's a tax record for current fiscal year
  // 2. The tax is unpaid
  const canPayCurrentYear = currentYearTax !== undefined && currentYearTax.status === 'unpaid'
  const hasPaidCurrentYear = currentYearTax?.status === 'paid'

  // Assessment (creating new tax) is NOT allowed if:
  // - Tax record already exists for current fiscal year (regardless of status)
  const canAssessCurrentYear = currentYearTax === undefined

  return {
    citizen_id: citizenId,
    holding_no: citizen.holding_no ?? null,
    current_fiscal_year: currentFiscalYear,
    can_pay_current_year: canPayCurrentYear,
    has_paid_current_year: hasPaidCurrentYear,
    can_assess_current_year: canAssessCurrentYear,
    current_year_tax_id: currentYearTax?._id ?? null,
    taxes: taxesFormatted,
  }
}

// ── Create Tax for Citizen ───────────────────────────────────────────────────

export async function createTaxForCitizen(
  citizenId: string,
  dto: { fiscal_year: string; amount: number },
  actor: JwtAccessPayload,
) {
  // Get citizen
  const citizen = await Citizen.findById(citizenId)
  if (!citizen) throw new NotFoundError('Citizen not found')
  if (citizen.status !== 'approved') throw new BadRequestError('Citizen must be approved')

  // Check if tax already exists for this fiscal year
  const existing = await Tax.findOne({
    citizen_id: new mongoose.Types.ObjectId(citizenId),
    fiscal_year: dto.fiscal_year,
  }).lean()

  if (existing) {
    const status = existing.status === 'paid' ? 'paid' : 'unpaid'
    throw new ConflictError(
      `Holding tax record already exists for fiscal year ${dto.fiscal_year} (status: ${status}). ` +
      `Cannot create duplicate assessment.`
    )
  }

  // Create tax record
  const tax = await Tax.create({
    citizen_id: new mongoose.Types.ObjectId(citizenId),
    holding_no: citizen.holding_no ?? 'PENDING',
    fiscal_year: dto.fiscal_year,
    amount: dto.amount,
    status: 'unpaid',
    assessed_by: new mongoose.Types.ObjectId(actor.sub),
    created_by: new mongoose.Types.ObjectId(actor.sub),
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'tax.create',
    target_model: 'Tax',
    target_id: tax._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return tax.toObject()
}

// ── Pay Tax for Citizen ──────────────────────────────────────────────────────

export async function payTaxForCitizen(
  citizenId: string,
  taxId: string,
  actor: JwtAccessPayload,
) {
  // Get citizen
  const citizen = await Citizen.findById(citizenId)
  if (!citizen) throw new NotFoundError('Citizen not found')

  // Get the tax record first to validate fiscal year
  const tax = await Tax.findById(taxId)
  if (!tax) throw new NotFoundError('Tax record not found')

  // Ensure the tax belongs to this citizen
  if (tax.citizen_id.toString() !== citizenId) {
    throw new BadRequestError('Tax record does not belong to this citizen')
  }

  // Check if already paid
  if (tax.status === 'paid') {
    throw new BadRequestError('Tax has already been paid for this fiscal year')
  }

  // Only allow payment for current fiscal year
  const currentFiscalYear = getCurrentFiscalYear()
  if (tax.fiscal_year !== currentFiscalYear) {
    throw new BadRequestError(
      `Can only pay tax for current fiscal year (${currentFiscalYear}). This tax is for ${tax.fiscal_year}`
    )
  }

  // Pay tax using existing function
  return payTax(taxId, { paid_by_citizen: citizenId }, actor)
}

// ── Create Tax Records for New Fiscal Year ───────────────────────────────────

/**
 * Creates tax records for all property-owning citizens for a new fiscal year.
 *
 * @param fiscalYear - The new fiscal year (e.g., "2026-2027")
 * @param defaultAmount - Default tax amount if previous year's amount is not found
 * @param actor - The user performing this action
 * @returns Summary of created tax records
 */
export async function createTaxForNewFiscalYear(
  fiscalYear: string,
  defaultAmount: number,
  actor: JwtAccessPayload,
) {
  // Get all citizens who have a holding_no
  const citizens = await Citizen.find({ holding_no: { $ne: null } }).lean()

  const results = {
    total_citizens: citizens.length,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const citizen of citizens) {
    try {
      // Check if tax already exists for this citizen in this fiscal year
      const existing = await Tax.findOne({
        citizen_id: citizen._id,
        fiscal_year: fiscalYear,
      }).lean()

      if (existing) {
        results.skipped++
        continue
      }

      // Get the most recent tax record to copy the amount
      const lastTax = await Tax.findOne({ citizen_id: citizen._id })
        .sort({ createdAt: -1 })
        .lean()

      const amount = lastTax?.amount ?? defaultAmount

      // Create new tax record for the new fiscal year
      await Tax.create({
        citizen_id: citizen._id,
        holding_no: citizen.holding_no,
        fiscal_year: fiscalYear,
        amount,
        status: 'unpaid',
        assessed_by: new mongoose.Types.ObjectId(actor.sub),
        created_by: new mongoose.Types.ObjectId(actor.sub),
      })

      results.created++

      await createAuditLog({
        user_id: actor.sub,
        user_role: actor.role,
        action: 'tax.create',
        target_model: 'Tax',
        target_id: citizen._id as mongoose.Types.ObjectId,
        status: 'success',
      })
    } catch (error) {
      results.errors.push(`Citizen ${citizen._id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}
