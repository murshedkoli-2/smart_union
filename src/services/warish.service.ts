import mongoose from 'mongoose'
import WarishApplication, {
  type IHeir,
  type IWarishApplication,
  type WarishApplicationType,
  type WarishStatus,
} from '@/models/WarishApplication'
import Payment from '@/models/Payment'
import Cashbook from '@/models/Cashbook'
import Citizen from '@/models/Citizen'
import Certificate from '@/models/Certificate'
import { getCurrentFiscalYear, generateCertificateNo } from '@/lib/utils/serial-generator'
import { buildCertificateVerificationUrl } from '@/lib/utils/certificate-verification'
import { generateVerificationToken } from '@/lib/utils/verification-token'
import { withTransaction } from '@/lib/db/transaction'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import type { JwtAccessPayload } from '@/types/auth.types'
import type { CertificateLanguage, CertificateTypeCode } from '@/constants/certificate-types'
import { clampPagination } from '@/lib/utils/pagination'

function normalizeApplicationType(value: unknown): WarishApplicationType {
  return value === 'family_certificate' ? 'family_certificate' : 'warish'
}

function getEntryCollectionKey(type: WarishApplicationType): 'heirs' | 'family_members' {
  return type === 'family_certificate' ? 'family_members' : 'heirs'
}

function getApplicationLabel(type: WarishApplicationType): string {
  return type === 'family_certificate' ? 'Family certificate' : 'Warish application'
}

function getPaymentSource(type: WarishApplicationType): 'warish' | 'family_certificate' {
  return type === 'family_certificate' ? 'family_certificate' : 'warish'
}

function getCertificateType(type: WarishApplicationType): CertificateTypeCode {
  return type === 'family_certificate' ? 'FAM' : 'WAR'
}

function normalizeMembers(rawValue: unknown, label: string): IHeir[] {
  if (!Array.isArray(rawValue) || rawValue.length === 0) {
    throw new ValidationError(`At least one ${label} is required`)
  }

  return rawValue.map((entry, index) => {
    const item = entry as Record<string, unknown>
    if (!item?.name_bn || !item?.name_en || !item?.relation || !item?.birth_date) {
      throw new ValidationError(`${label} #${index + 1} is missing required fields`)
    }

    return {
      name_bn: String(item.name_bn),
      name_en: String(item.name_en),
      relation: String(item.relation),
      birth_date: new Date(String(item.birth_date)),
      nid_no: item.nid_no ? String(item.nid_no) : undefined,
      is_alive: item.is_alive === undefined ? true : Boolean(item.is_alive),
      share_fraction: item.share_fraction ? String(item.share_fraction) : undefined,
    }
  })
}

function buildCreatePayload(body: Record<string, unknown>, actor: JwtAccessPayload): Partial<IWarishApplication> {
  const applicationType = normalizeApplicationType(body.application_type)
  const memberKey = getEntryCollectionKey(applicationType)

  if (!body.applicant_citizen_id) {
    throw new ValidationError('applicant_citizen_id is required')
  }

  const basePayload: Partial<IWarishApplication> = {
    application_type: applicationType,
    applicant_citizen_id: new mongoose.Types.ObjectId(String(body.applicant_citizen_id)),
    status: (body.status as WarishStatus) || 'pending',
    created_by: new mongoose.Types.ObjectId(actor.sub),
    heirs: [],
    family_members: [],
  }

  if (applicationType === 'warish') {
    if (!body.deceased_name_bn || !body.deceased_name_en) {
      throw new ValidationError('deceased_name_bn and deceased_name_en are required')
    }
    if (!body.deceased_father_name_bn || !body.deceased_father_name_en) {
      throw new ValidationError('deceased_father_name_bn and deceased_father_name_en are required')
    }
    if (!body.date_of_death) {
      throw new ValidationError('date_of_death is required')
    }

    basePayload.deceased_name_bn = String(body.deceased_name_bn)
    basePayload.deceased_name_en = String(body.deceased_name_en)
    basePayload.deceased_father_name_bn = String(body.deceased_father_name_bn)
    basePayload.deceased_father_name_en = String(body.deceased_father_name_en)
    basePayload.deceased_mother_name_bn = body.deceased_mother_name_bn ? String(body.deceased_mother_name_bn) : undefined
    basePayload.deceased_mother_name_en = body.deceased_mother_name_en ? String(body.deceased_mother_name_en) : undefined
    basePayload.deceased_nid = body.deceased_nid ? String(body.deceased_nid) : undefined
    basePayload.date_of_death = new Date(String(body.date_of_death))
  }

  basePayload[memberKey] = normalizeMembers(
    body[memberKey],
    applicationType === 'family_certificate' ? 'family member' : 'heir',
  ) as IWarishApplication[typeof memberKey]

  return basePayload
}

export async function createWarish(dto: unknown, actor: JwtAccessPayload) {
  const body = dto as Record<string, unknown>
  const applicationType = normalizeApplicationType(body.application_type)
  const application = await WarishApplication.create(buildCreatePayload(body, actor))

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: `${applicationType}.create`,
    target_model: 'WarishApplication',
    target_id: application._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return application.toObject()
}

export async function listWarish(
  query: {
    status?: string
    applicant_citizen_id?: string
    application_type?: string
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  void _actor
  const { status, applicant_citizen_id, application_type } = query
  const { page, limit } = clampPagination(query)

  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (application_type) filter.application_type = normalizeApplicationType(application_type)

  if (_actor.role === 'citizen') {
    const citizenDoc = await Citizen.findOne({ user_id: _actor.sub }).lean()
    if (!citizenDoc) {
      return { 
        applications: [], total: 0, page, limit, 
        stats: { total: 0, pending: 0, approved: 0, draft: 0, rejected: 0 } 
      }
    }
    filter.applicant_citizen_id = citizenDoc._id
  } else if (applicant_citizen_id) {
    filter.applicant_citizen_id = new mongoose.Types.ObjectId(applicant_citizen_id)
  }

  const skip = (page - 1) * limit
  const [applications, total, counts] = await Promise.all([
    WarishApplication.find(filter)
      .populate('applicant_citizen_id', 'name_bn name_en mobile')
      .populate('certificate_id_bn', '_id certificate_no')
      .populate('certificate_id_en', '_id certificate_no')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WarishApplication.countDocuments(filter),
    WarishApplication.aggregate([
      ...(application_type ? [{ $match: { application_type: normalizeApplicationType(application_type) } }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    draft: 0,
    rejected: 0,
  }

  counts.forEach((countEntry: { _id: string; count: number }) => {
    if (countEntry._id in stats) {
      stats[countEntry._id as keyof typeof stats] = countEntry.count
    }
    stats.total += countEntry.count
  })

  return { applications, total, page, limit, stats }
}

export async function getWarishById(id: string, _actor: JwtAccessPayload) {
  void _actor
  const application = await WarishApplication.findById(id)
    .populate('applicant_citizen_id', 'name_bn name_en father_name_bn father_name_en mother_name_bn mother_name_en mobile address nid_no')
    .populate('payment_id')
    .populate('approved_by', 'name email')
    .populate('certificate_id_bn', '_id status')
    .populate('certificate_id_en', '_id status')
    .lean()
  if (!application) throw new NotFoundError('Application not found')
  return application
}

export async function updateWarish(id: string, dto: unknown, actor: JwtAccessPayload) {
  const application = await WarishApplication.findById(id)
  if (!application) throw new NotFoundError('Application not found')

  if (application.status !== 'draft') {
    throw new BadRequestError('Only draft applications can be updated')
  }

  const body = dto as Record<string, unknown>
  const before = application.toObject()
  const applicationType = application.application_type

  if (body.status !== undefined) {
    if (body.status === 'pending') {
      application.status = 'pending'
    } else {
      throw new BadRequestError('Only draft to pending transition is allowed')
    }
  }

  if (applicationType === 'warish') {
    const allowedFields = [
      'deceased_name_bn',
      'deceased_name_en',
      'deceased_father_name_bn',
      'deceased_father_name_en',
      'deceased_mother_name_bn',
      'deceased_mother_name_en',
      'deceased_nid',
    ] as const

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        ;(application as unknown as Record<string, unknown>)[field] = body[field]
      }
    })

    if (body.date_of_death !== undefined) {
      application.date_of_death = new Date(String(body.date_of_death))
    }
    if (body.heirs !== undefined) {
      application.heirs = normalizeMembers(body.heirs, 'heir')
    }
  } else if (body.family_members !== undefined) {
    application.family_members = normalizeMembers(body.family_members, 'family member')
  }

  await application.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: `${applicationType}.update`,
    target_model: 'WarishApplication',
    target_id: application._id as mongoose.Types.ObjectId,
    changes: { before, after: application.toObject() },
    status: 'success',
  })

  return application.toObject()
}

export async function payWarish(id: string, actor: JwtAccessPayload) {
  const application = await WarishApplication.findById(id)
  if (!application) throw new NotFoundError('Application not found')

  if (application.status !== 'pending') {
    throw new BadRequestError('Application must be in pending status to pay')
  }

  if (application.payment_id) {
    throw new BadRequestError('Application is already paid')
  }

  const citizen = await Citizen.findById(application.applicant_citizen_id)
  if (!citizen) throw new NotFoundError('Applicant citizen not found')

  const receiptNo = `W-${Date.now().toString(36).toUpperCase()}`
  const paymentSource = getPaymentSource(application.application_type)
  const fiscalYear = getCurrentFiscalYear()

  // Payment, ledger entry, the application link and the audit record are one
  // atomic unit — a receipt with no cashbook line unbalances the books.
  await withTransaction(async (txn) => {
    const [payment] = await Payment.create(
      [
        {
          receipt_no: receiptNo,
          payment_type: 'certificate',
          source_type: paymentSource,
          reference_id: application._id,
          amount: 100,
          payment_method: 'cash',
          paid_by_citizen: citizen._id as mongoose.Types.ObjectId,
          collected_by: new mongoose.Types.ObjectId(actor.sub),
        },
      ],
      txn ? { session: txn } : {},
    )

    // Record in cashbook as certificate income
    await Cashbook.create(
      [
        {
          entry_type: 'income',
          source: 'certificate',
          amount: 100,
          reference_id: payment._id,
          reference_type: 'Payment',
          description: `${paymentSource} payment, receipt: ${receiptNo}`,
          fiscal_year: fiscalYear,
          recorded_by: new mongoose.Types.ObjectId(actor.sub),
        },
      ],
      txn ? { session: txn } : {},
    )

    application.payment_id = payment._id as mongoose.Types.ObjectId
    await application.save(txn ? { session: txn } : {})

    await createAuditLog(
      {
        user_id: actor.sub,
        user_role: actor.role,
        action: `${application.application_type}.pay`,
        target_model: 'WarishApplication',
        target_id: application._id as mongoose.Types.ObjectId,
        status: 'success',
      },
      txn,
    )
  })

  return application.toObject()
}

export async function approveWarish(id: string, actor: JwtAccessPayload) {
  const application = await WarishApplication.findById(id)
  if (!application) throw new NotFoundError('Application not found')

  if (application.status !== 'pending') {
    throw new BadRequestError(`${getApplicationLabel(application.application_type)} is not in pending status`)
  }

  if (!application.payment_id) {
    throw new BadRequestError('Payment must be completed before the application can be approved')
  }

  application.status = 'approved'
  application.approved_by = new mongoose.Types.ObjectId(actor.sub)
  application.approved_at = new Date()
  await application.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: `${application.application_type}.approve`,
    target_model: 'WarishApplication',
    target_id: application._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return application.toObject()
}

export async function issueWarishCertificate(
  id: string,
  language: 'bn' | 'en',
  actor: JwtAccessPayload,
) {
  const application = await WarishApplication.findById(id)
  if (!application) throw new NotFoundError('Application not found')

  if (application.status !== 'approved') {
    throw new BadRequestError('Application must be approved before issuing a certificate')
  }

  const existingId = language === 'bn' ? application.certificate_id_bn : application.certificate_id_en
  if (existingId) {
    const existing = await Certificate.findById(existingId).lean()
    if (existing) {
      throw new BadRequestError(`A ${language.toUpperCase()} certificate has already been issued for this application`)
    }
  }

  const fiscalYear = getCurrentFiscalYear()
  const year = new Date().getFullYear()
  const certType = getCertificateType(application.application_type)
  const certNo = await generateCertificateNo(language as CertificateLanguage, certType, year)

  const dynamicData =
    application.application_type === 'family_certificate'
      ? {
          application_type: application.application_type,
          family_members: application.family_members,
        }
      : {
          application_type: application.application_type,
          deceased_name_bn: application.deceased_name_bn,
          deceased_name_en: application.deceased_name_en,
          deceased_father_name_bn: application.deceased_father_name_bn,
          deceased_father_name_en: application.deceased_father_name_en,
          deceased_mother_name_bn: application.deceased_mother_name_bn,
          deceased_mother_name_en: application.deceased_mother_name_en,
          deceased_nid: application.deceased_nid,
          date_of_death: application.date_of_death,
          heirs: application.heirs,
        }

  // The QR points at an unguessable token, not the sequential certificate number.
  const verificationToken = generateVerificationToken()
  const qrCodeUrl = buildCertificateVerificationUrl(verificationToken)

  // Issuing the certificate and linking it back to the application are one
  // atomic unit — otherwise a failure here strands an issued certificate that
  // the application never points at, and re-issuing burns a second number.
  const certificate = await withTransaction(async (txn) => {
    const [created] = await Certificate.create(
      [
        {
          certificate_no: certNo,
          certificateNo: certNo,
          referenceNo: certNo,
          verification_token: verificationToken,
          qr_code_url: qrCodeUrl,
          language,
          certificate_type: certType,
          citizen_id: application.applicant_citizen_id,
          payment_id: application.payment_id,
          dynamic_data: dynamicData,
          status: 'approved',
          approved_by: new mongoose.Types.ObjectId(actor.sub),
          approved_at: new Date(),
          fiscal_year: fiscalYear,
          created_by: new mongoose.Types.ObjectId(actor.sub),
        },
      ],
      txn ? { session: txn } : {},
    )

    if (language === 'bn') {
      application.certificate_id_bn = created._id as mongoose.Types.ObjectId
    } else {
      application.certificate_id_en = created._id as mongoose.Types.ObjectId
    }
    application.certificate_id = created._id as mongoose.Types.ObjectId
    await application.save(txn ? { session: txn } : {})

    await createAuditLog(
      {
        user_id: actor.sub,
        user_role: actor.role,
        action: `${application.application_type}.issue_certificate.${language}`,
        target_model: 'WarishApplication',
        target_id: application._id as mongoose.Types.ObjectId,
        status: 'success',
      },
      txn,
    )

    return created
  })

  return certificate.toObject()
}

export async function rejectWarish(
  id: string,
  dto: { rejection_reason?: string },
  actor: JwtAccessPayload,
) {
  const application = await WarishApplication.findById(id)
  if (!application) throw new NotFoundError('Application not found')

  if (application.status !== 'pending') {
    throw new BadRequestError(`${getApplicationLabel(application.application_type)} is not in pending status`)
  }

  application.status = 'rejected'
  if (dto.rejection_reason) {
    application.rejection_reason = dto.rejection_reason
  }
  await application.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: `${application.application_type}.reject`,
    target_model: 'WarishApplication',
    target_id: application._id as mongoose.Types.ObjectId,
    changes: {
      before: { status: 'pending' },
      after: { status: 'rejected', rejection_reason: dto.rejection_reason },
    },
    status: 'success',
  })

  return application.toObject()
}
