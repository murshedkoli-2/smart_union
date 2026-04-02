import mongoose, { Schema, Document, Model } from 'mongoose'
import type { CertificateLanguage } from '@/constants/certificate-types'

export type TemplateType = 'standard' | 'custom' | 'warish'
export type DynamicFieldType = 'text' | 'date' | 'number' | 'select'

export interface IDynamicField {
  field_key: string
  field_label: string
  field_type: DynamicFieldType
  options: string[]
  required: boolean
  default_value?: string
}

export interface ICertificateTemplate extends Document {
  name: string
  template_type: TemplateType
  certificate_category: string
  language: CertificateLanguage
  body_template: string
  dynamic_fields: IDynamicField[]
  fee: number
  is_active: boolean
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DynamicFieldSchema = new Schema<IDynamicField>(
  {
    field_key: { type: String, required: true },
    field_label: { type: String, required: true },
    field_type: {
      type: String,
      enum: ['text', 'date', 'number', 'select'],
      required: true,
    },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    default_value: { type: String, default: null },
  },
  { _id: false },
)

const CertificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    name: { type: String, required: true, trim: true },
    template_type: {
      type: String,
      enum: ['standard', 'custom', 'warish'],
      required: true,
    },
    certificate_category: { type: String, required: true, trim: true },
    language: { type: String, enum: ['bn', 'en'], required: true },
    body_template: { type: String, required: true },
    dynamic_fields: { type: [DynamicFieldSchema], default: [] },
    fee: { type: Number, required: true, default: 0, min: 0 },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

CertificateTemplateSchema.index({ template_type: 1, language: 1, is_active: 1 })

const CertificateTemplate: Model<ICertificateTemplate> =
  mongoose.models.CertificateTemplate ??
  mongoose.model<ICertificateTemplate>('CertificateTemplate', CertificateTemplateSchema)

export default CertificateTemplate
