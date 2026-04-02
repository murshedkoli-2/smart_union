import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IHeir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: Date
  nid_no?: string
  is_alive: boolean
  share_fraction?: string
}

export type WarishApplicationType = 'warish' | 'family_certificate'
export type WarishStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface IWarishApplication extends Document {
  application_type: WarishApplicationType
  certificate_id?: mongoose.Types.ObjectId     // legacy / fallback
  certificate_id_bn?: mongoose.Types.ObjectId   // Bengali certificate
  certificate_id_en?: mongoose.Types.ObjectId   // English certificate
  deceased_name_bn?: string
  deceased_name_en?: string
  deceased_father_name_bn?: string
  deceased_father_name_en?: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  deceased_nid?: string
  date_of_death?: Date
  applicant_citizen_id: mongoose.Types.ObjectId
  heirs: IHeir[]
  family_members: IHeir[]
  status: WarishStatus
  rejection_reason?: string
  approved_by?: mongoose.Types.ObjectId
  approved_at?: Date
  payment_id?: mongoose.Types.ObjectId
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const HeirSchema = new Schema<IHeir>(
  {
    name_bn: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    birth_date: { type: Date, required: true },
    nid_no: { type: String, default: null, trim: true },
    is_alive: { type: Boolean, default: true },
    share_fraction: { type: String, default: null },
  },
  { _id: false },
)

const WarishApplicationSchema = new Schema<IWarishApplication>(
  {
    application_type: {
      type: String,
      enum: ['warish', 'family_certificate'],
      default: 'warish',
    },
    certificate_id:    { type: Schema.Types.ObjectId, ref: 'Certificate', default: null },
    certificate_id_bn: { type: Schema.Types.ObjectId, ref: 'Certificate', default: null },
    certificate_id_en: { type: Schema.Types.ObjectId, ref: 'Certificate', default: null },
    deceased_name_bn: { type: String, default: null, trim: true },
    deceased_name_en: { type: String, default: null, trim: true },
    deceased_father_name_bn: { type: String, default: null, trim: true },
    deceased_father_name_en: { type: String, default: null, trim: true },
    deceased_mother_name_bn: { type: String, default: null, trim: true },
    deceased_mother_name_en: { type: String, default: null, trim: true },
    deceased_nid: { type: String, default: null, trim: true },
    date_of_death: { type: Date, default: null },
    applicant_citizen_id: {
      type: Schema.Types.ObjectId,
      ref: 'Citizen',
      required: true,
    },
    heirs: { type: [HeirSchema], default: [] },
    family_members: { type: [HeirSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejection_reason: { type: String, default: null },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

WarishApplicationSchema.index({ applicant_citizen_id: 1 })
WarishApplicationSchema.index({ status: 1 })
WarishApplicationSchema.index({ application_type: 1 })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.WarishApplication
}

const WarishApplication: Model<IWarishApplication> =
  mongoose.models.WarishApplication ??
  mongoose.model<IWarishApplication>('WarishApplication', WarishApplicationSchema)

export default WarishApplication
