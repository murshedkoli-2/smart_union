import mongoose, { Schema, Document, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/soft-delete'
import type { CertificateLanguage } from '@/constants/certificate-types'

// 'deleted' is intentionally absent — deletion is deleted_at, not a status.
export type CertificateStatus = 'draft' | 'pending' | 'approved' | 'locked'

export interface ICertificate extends Document {
  certificate_no: string | null
  certificateNo?: string | null
  referenceNo?: string | null
  language: CertificateLanguage
  certificate_type: string
  template_id?: mongoose.Types.ObjectId
  citizen_id: mongoose.Types.ObjectId
  payment_id?: mongoose.Types.ObjectId
  dynamic_data: Record<string, unknown>
  status: CertificateStatus
  approved_by?: mongoose.Types.ObjectId
  approved_at?: Date
  locked_at?: Date
  /** Set when soft-deleted; null on live records. See plugins/soft-delete. */
  deleted_at?: Date | null
  /** Unguessable public lookup key for /verify — see lib/utils/verification-token. */
  verification_token?: string
  qr_code_url?: string
  pdf_url?: string
  fiscal_year: string
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CertificateSchema = new Schema<ICertificate>(
  {
    // Uniqueness enforced by the partial index below, so a soft-deleted
    // certificate releases its number without having the value rewritten.
    certificate_no: { type: String, required: true },
    certificateNo: { type: String, default: null },
    referenceNo: { type: String, default: null },
    language: { type: String, enum: ['bn', 'en'], required: true },
    certificate_type: { type: String, required: true },
    template_id: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateTemplate',
      default: null,
    },
    citizen_id: { type: Schema.Types.ObjectId, ref: 'Citizen', required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    dynamic_data: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'locked'],
      default: 'draft',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    locked_at: { type: Date, default: null },
    // Drafts have no token until they are approved — see the partial index below.
    verification_token: { type: String, default: null },
    qr_code_url: { type: String, default: null },
    pdf_url: { type: String, default: null },
    fiscal_year: { type: String, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

CertificateSchema.plugin(softDeletePlugin)

/**
 * Unique among live certificates only. Replaces the plain unique indexes —
 * existing databases must run `npm run migrate-soft-delete`.
 */
CertificateSchema.index(
  { certificate_no: 1 },
  {
    unique: true,
    partialFilterExpression: { certificate_no: { $type: 'string' }, deleted_at: null },
  },
)
CertificateSchema.index(
  { verification_token: 1 },
  {
    unique: true,
    partialFilterExpression: { verification_token: { $type: 'string' }, deleted_at: null },
  },
)

CertificateSchema.index({
  citizen_id: 1,
  language: 1,
  certificate_type: 1,
  fiscal_year: 1,
})
CertificateSchema.index({ status: 1 })
CertificateSchema.index({ language: 1, certificate_type: 1, fiscal_year: 1 })

if (mongoose.models.Certificate) {
  delete mongoose.models.Certificate
}

const Certificate: Model<ICertificate> = mongoose.model<ICertificate>('Certificate', CertificateSchema)

export default Certificate
