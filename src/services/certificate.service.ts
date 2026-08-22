import mongoose from 'mongoose'
import Certificate from '@/models/Certificate'
import CertificateTemplate from '@/models/CertificateTemplate'
import Citizen from '@/models/Citizen'
import '@/models/Payment'
import { CreateCertificateSchema } from '@/lib/utils/validators'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/utils/errors'
import { generateCertificateNo, getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import { buildCertificateVerificationUrl } from '@/lib/utils/certificate-verification'
import { generateVerificationToken } from '@/lib/utils/verification-token'
import { normalizeCertificateTemplateBody } from '@/lib/utils/certificate-render'
import { withTransaction } from '@/lib/db/transaction'
import { createAuditLog } from './audit-log.service'
import { collectPayment } from './payment.service'
import type { JwtAccessPayload } from '@/types/auth.types'
import type { CertificateLanguage, CertificateTypeCode } from '@/constants/certificate-types'

function deriveTemplateCategory(name: string): string {
  const normalized = name.trim().toLowerCase()

  if (/নাগরিকত্ব|citizenship/.test(normalized)) return 'CIT'
  if (/জাতীয়তা|জাতিয়তা|nationality/.test(normalized)) return 'NAT'
  if (/আয়|আয়|income/.test(normalized)) return 'INC'
  if (/বাসিন্দা|residence|resident/.test(normalized)) return 'RES'
  if (/চারিত্রিক|character/.test(normalized)) return 'CHR'
  if (/ওয়ারিশ|ওয়ারিশ|warish|inheritance/.test(normalized)) return 'WAR'
  if (/অবিবাহিত|unmarried/.test(normalized)) return 'UNM'
  if (/মৃত্যু|death/.test(normalized)) return 'DTH'
  if (/বিবাহিত|married/.test(normalized)) return 'MRD'
  if (/পুনর্বিবাহ|non remarriage|non-remarriage/.test(normalized)) return 'NRM'
  if (/বেকারত্ব|unemployment/.test(normalized)) return 'UEM'
  if (/সম্পত্তি|property/.test(normalized)) return 'PRP'
  if (/ভূমিহীন|landless/.test(normalized)) return 'LDL'

  return 'OTH'
}

function generateDraftCertificateRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `DRAFT-${timestamp}-${random}`
}

// ── Create Certificate ────────────────────────────────────────────────────────

export async function createCertificate(dto: unknown, actor: JwtAccessPayload) {
  const parsed = CreateCertificateSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const { language, certificate_type, template_id, citizen_id, dynamic_data } = parsed.data

  // Citizen must be approved
  const citizen = await Citizen.findById(citizen_id).lean()
  if (!citizen) throw new NotFoundError('Citizen not found')
  if (citizen.status !== 'approved') {
    throw new BadRequestError('Only approved citizens can receive certificates')
  }

  // Template must exist
  const template = await CertificateTemplate.findById(template_id).lean()
  if (!template) throw new NotFoundError('Certificate template not found')
  if (!template.is_active) throw new BadRequestError('Certificate template is not active')

  const fiscalYear = getCurrentFiscalYear()
  const draftRef = generateDraftCertificateRef()

  const certificate = await Certificate.create({
    certificate_no: draftRef,
    certificateNo: draftRef,
    referenceNo: draftRef,
    language,
    certificate_type,
    template_id: new mongoose.Types.ObjectId(template_id),
    citizen_id: new mongoose.Types.ObjectId(citizen_id),
    dynamic_data: dynamic_data ?? {},
    status: 'draft',
    fiscal_year: fiscalYear,
    created_by: new mongoose.Types.ObjectId(actor.sub),
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate.create',
    target_model: 'Certificate',
    target_id: certificate._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return certificate.toObject()
}

// ── List Certificates ─────────────────────────────────────────────────────────

export async function listCertificates(
  query: {
    language?: string
    certificate_type?: string
    status?: string
    citizen_id?: string
    fiscal_year?: string
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  const { language, certificate_type, status, citizen_id, fiscal_year, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (language) filter.language = language
  if (certificate_type) filter.certificate_type = certificate_type
  if (status) filter.status = status === 'approved' ? { $in: ['approved', 'locked'] } : status

  if (_actor.role === 'citizen') {
    const citizenDoc = await Citizen.findOne({ user_id: _actor.sub }).lean()
    if (!citizenDoc) return { certificates: [], total: 0, page, limit }
    filter.citizen_id = citizenDoc._id
  } else if (citizen_id) {
    filter.citizen_id = new mongoose.Types.ObjectId(citizen_id)
  }

  if (fiscal_year) filter.fiscal_year = fiscal_year

  const skip = (page - 1) * limit
  const [certificates, total] = await Promise.all([
    Certificate.find(filter)
      .populate('citizen_id', 'name_bn name_en mobile')
      .populate('template_id', 'name certificate_category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Certificate.countDocuments(filter),
  ])

  const normalizedCertificates = certificates.map((certificate) => {
    const isApproved = certificate.status === 'approved' || certificate.status === 'locked'
    const publicCertificateNo = isApproved ? certificate.certificate_no : null

    return {
      ...certificate,
      status: certificate.status === 'locked' ? 'approved' : certificate.status,
      certificate_no: publicCertificateNo,
      // Falls back to the token, never to the certificate number.
      // A certificate approved before verification tokens existed has neither
      // a stored URL nor a token until `npm run backfill-verification-tokens`
      // has been run; it reports no QR rather than an enumerable one.
      qr_code_url:
        isApproved && certificate.verification_token
          ? certificate.qr_code_url ||
            buildCertificateVerificationUrl(certificate.verification_token)
          : null,
    }
  })

  return { certificates: normalizedCertificates, total, page, limit }
}

// ── Get Certificate By ID ─────────────────────────────────────────────────────

export async function getCertificateById(id: string, _actor: JwtAccessPayload) {
  void _actor
  const certificate = await Certificate.findById(id)
    .populate('citizen_id', 'name_bn name_en father_name_bn father_name_en mother_name_bn mother_name_en nid_no birth_cert_no mobile address permanent_address date_of_birth')
    .populate('template_id')
    .populate('payment_id')
    .populate('approved_by', 'name email')
    .lean()
  if (!certificate) throw new NotFoundError('Certificate not found')
  const isApproved = certificate.status === 'approved' || certificate.status === 'locked'
  const publicCertificateNo = isApproved ? certificate.certificate_no : null

  return {
    ...certificate,
    status: certificate.status === 'locked' ? 'approved' : certificate.status,
    certificate_no: publicCertificateNo,
    qr_code_url:
      isApproved && certificate.verification_token
        ? certificate.qr_code_url ||
          buildCertificateVerificationUrl(certificate.verification_token)
        : null,
  }
}

// ── Update Certificate ────────────────────────────────────────────────────────

export async function updateCertificate(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  const certificate = await Certificate.findById(id)
  if (!certificate) throw new NotFoundError('Certificate not found')

  if (certificate.status === 'approved' || certificate.status === 'locked') {
    throw new ForbiddenError('Cannot edit a certificate after it has been approved')
  }

  const body = dto as Record<string, unknown>
  const before = certificate.toObject()

  // Only allow moving from draft -> pending (submitting for approval)
  if (body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending'],
      pending: ['draft'],
    }
    const current = certificate.status
    const next = body.status as string
    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestError(`Cannot transition from ${current} to ${next}`)
    }
    certificate.status = next as 'draft' | 'pending' | 'approved' | 'locked'
  }

  if (body.dynamic_data !== undefined) {
    certificate.dynamic_data = body.dynamic_data as Record<string, unknown>
  }
  if (body.payment_id !== undefined) {
    certificate.payment_id = new mongoose.Types.ObjectId(body.payment_id as string)
  }

  await certificate.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate.update',
    target_model: 'Certificate',
    target_id: certificate._id as mongoose.Types.ObjectId,
    changes: { before, after: certificate.toObject() },
    status: 'success',
  })

  return certificate.toObject()
}

// ── Approve Certificate ───────────────────────────────────────────────────────

export interface ApproveCertificateOptions {
  /** Collect the fee in cash as part of approval. */
  collect_payment?: boolean
  /** Overrides the template fee when present. */
  amount?: number
  note?: string
}

/**
 * Approves a certificate, collecting the fee in the same atomic unit.
 *
 * This orchestration used to live in the route handler as three independent
 * service calls — collect payment, attach payment_id, approve. A failure after
 * the first one banked the citizen's money against a certificate that was
 * never issued, and the operator had no way to tell from the data whether the
 * fee had been taken. Payment, cashbook entry, payment link, approval and both
 * audit records now commit together or not at all.
 */
export async function approveCertificate(
  id: string,
  actor: JwtAccessPayload,
  options: ApproveCertificateOptions = {},
) {
  const certificate = await Certificate.findById(id).populate('template_id')
  if (!certificate) throw new NotFoundError('Certificate not found')

  if (certificate.status !== 'pending') {
    throw new BadRequestError('Certificate must be in pending status to approve')
  }

  const template = certificate.template_id as unknown as { fee?: number } | null
  const amount = Number(options.amount ?? template?.fee ?? 0)
  const alreadyPaid = Boolean(certificate.payment_id)
  const mustCollect = !alreadyPaid && amount > 0

  if (mustCollect && options.collect_payment !== true) {
    throw new BadRequestError('Cash payment must be collected before approval')
  }

  const citizenId = certificate.citizen_id
  if (mustCollect && !citizenId) {
    throw new BadRequestError('Citizen information is required for payment collection')
  }

  // Outside the transaction on purpose — see withTransaction. A rollback burns
  // a certificate number rather than risking a duplicate.
  const year = new Date().getFullYear()
  const certNo = await generateCertificateNo(
    certificate.language as CertificateLanguage,
    certificate.certificate_type as CertificateTypeCode,
    year,
  )
  const verificationToken = generateVerificationToken()

  return withTransaction(async (txn) => {
    let payment: Awaited<ReturnType<typeof collectPayment>> | null = null

    if (mustCollect) {
      payment = await collectPayment(
        {
          payment_type: 'certificate',
          source_type: certificate.language === 'bn' ? 'certificate_bn' : 'certificate_en',
          reference_id: id,
          amount,
          paid_by_citizen: citizenId.toString(),
          note: options.note ?? `Cash payment for certificate ${certNo}`,
        },
        actor,
        txn,
      )
      certificate.payment_id = payment._id as mongoose.Types.ObjectId
    }

    certificate.status = 'approved'
    certificate.certificate_no = certNo
    certificate.certificateNo = certNo
    certificate.referenceNo = certNo
    certificate.approved_by = new mongoose.Types.ObjectId(actor.sub)
    certificate.approved_at = new Date()

    // The QR points at an unguessable token, not the sequential certificate number.
    certificate.verification_token = verificationToken
    certificate.qr_code_url = buildCertificateVerificationUrl(verificationToken)

    await certificate.save(txn ? { session: txn } : {})

    await createAuditLog(
      {
        user_id: actor.sub,
        user_role: actor.role,
        action: 'certificate.approve',
        target_model: 'Certificate',
        target_id: certificate._id as mongoose.Types.ObjectId,
        status: 'success',
      },
      txn,
    )

    return {
      certificate: certificate.toObject(),
      payment: payment ?? certificate.payment_id ?? null,
    }
  })
}

// ── Delete Certificate ────────────────────────────────────────────────────────

/**
 * Soft-deletes a certificate.
 *
 * Stamps deleted_at and nothing else. The certificate number is preserved as
 * issued — it is the official record locator, and rewriting it to
 * `BN-CIT-2026-0001_del_1719…` destroyed the audit trail for a document that
 * may already be in a citizen's hands. The partial unique index releases the
 * number for reuse; the query hooks hide the row from every read path,
 * including public verification.
 */
export async function deleteCertificate(id: string, actor: JwtAccessPayload) {
  const certificate = await Certificate.findById(id)
  if (!certificate) throw new NotFoundError('Certificate not found')

  const before = certificate.toObject()

  certificate.deleted_at = new Date()
  await certificate.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate.delete',
    target_model: 'Certificate',
    target_id: new mongoose.Types.ObjectId(id),
    changes: { before, after: null },
    status: 'success',
  })
}

// ── Lock Certificate ──────────────────────────────────────────────────────────

export async function lockCertificate(id: string, actor: JwtAccessPayload) {
  const certificate = await Certificate.findById(id)
  if (!certificate) throw new NotFoundError('Certificate not found')

  if (certificate.status !== 'approved') {
    throw new BadRequestError('Certificate must be approved before finalizing')
  }

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate.finalize',
    target_model: 'Certificate',
    target_id: certificate._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return certificate.toObject()
}

// ── List Templates ────────────────────────────────────────────────────────────

export async function listTemplates(
  query: {
    language?: string
    template_type?: string
    certificate_category?: string
    is_active?: boolean
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  void _actor
  const { language, template_type, certificate_category, is_active, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (language) filter.language = language
  if (template_type) filter.template_type = template_type
  if (certificate_category) filter.certificate_category = certificate_category
  if (is_active !== undefined) filter.is_active = is_active

  const skip = (page - 1) * limit
  const [templates, total] = await Promise.all([
    CertificateTemplate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CertificateTemplate.countDocuments(filter),
  ])

  return {
    templates: templates.map((template) => ({
      ...template,
      body_template: normalizeCertificateTemplateBody(template.body_template),
      dynamic_fields: [],
    })),
    total,
    page,
    limit,
  }
}

// ── Create Template ───────────────────────────────────────────────────────────

export async function createTemplate(dto: unknown, actor: JwtAccessPayload) {
  const body = dto as Record<string, unknown>

  if (!body.name || !body.language || !body.body_template) {
    throw new ValidationError('Missing required fields: name, language, body_template')
  }

  const normalizedBody = normalizeCertificateTemplateBody(String(body.body_template))
  const normalizedName = String(body.name).trim()
  const language = String(body.language) as CertificateLanguage

  // Use explicit category/type from caller, or derive from name
  const category = body.certificate_category
    ? String(body.certificate_category).toUpperCase()
    : deriveTemplateCategory(normalizedName)

  const templateType = body.template_type
    ? String(body.template_type)
    : 'standard'

  const template = await CertificateTemplate.create({
    name: normalizedName,
    template_type: templateType,
    certificate_category: category as CertificateTypeCode,
    language,
    body_template: normalizedBody,
    dynamic_fields: [],
    fee: Number(body.fee ?? 0),
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    created_by: new mongoose.Types.ObjectId(actor.sub),
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate_template.create',
    target_model: 'CertificateTemplate',
    target_id: template._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return template.toObject()
}

// ── Get Template By ID ────────────────────────────────────────────────────────

export async function getTemplateById(id: string, _actor: JwtAccessPayload) {
  void _actor
  const template = await CertificateTemplate.findById(id).lean()
  if (!template) throw new NotFoundError('Certificate template not found')
  return {
    ...template,
    body_template: normalizeCertificateTemplateBody(template.body_template),
    dynamic_fields: [],
  }
}

// ── Update Template ───────────────────────────────────────────────────────────

export async function updateTemplate(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  const template = await CertificateTemplate.findById(id)
  if (!template) throw new NotFoundError('Certificate template not found')

  const allowedFields = [
    'name', 'language', 'body_template', 'dynamic_fields', 'is_active', 'fee',
  ]
  const body = dto as Record<string, unknown>
  const before = template.toObject()

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      ;(template as unknown as Record<string, unknown>)[field] =
        field === 'body_template'
          ? normalizeCertificateTemplateBody(String(body[field]))
          : field === 'fee'
            ? Math.max(0, Number(body[field]) || 0)
            : body[field]
    }
  }

  if (body.name !== undefined) {
    template.certificate_category = deriveTemplateCategory(String(body.name)) as CertificateTypeCode
  }

  template.template_type = 'standard'
  template.dynamic_fields = []

  await template.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'certificate_template.update',
    target_model: 'CertificateTemplate',
    target_id: template._id as mongoose.Types.ObjectId,
    changes: { before, after: template.toObject() },
    status: 'success',
  })

  return template.toObject()
}
