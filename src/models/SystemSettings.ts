import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IUnionMember {
  name_bn: string
  name_en: string
  designation_bn: string
  designation_en: string
  mobile?: string
}

export interface ISystemSettings extends Document {
  key: string
  union_name_bn: string
  union_name_en: string
  chairman_name_bn: string
  chairman_name_en: string
  union_logo?: string | null
  address_bn: string
  address_en: string
  members: IUnionMember[]
  updated_by?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const UnionMemberSchema = new Schema<IUnionMember>(
  {
    name_bn: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },
    designation_bn: { type: String, required: true, trim: true },
    designation_en: { type: String, required: true, trim: true },
    mobile: { type: String, default: '', trim: true },
  },
  { _id: false },
)

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    union_name_bn: { type: String, default: 'ইউনিয়ন পরিষদ', trim: true },
    union_name_en: { type: String, default: 'Union Parishad', trim: true },
    chairman_name_bn: { type: String, default: '', trim: true },
    chairman_name_en: { type: String, default: '', trim: true },
    union_logo: { type: String, default: null },
    address_bn: { type: String, default: '', trim: true },
    address_en: { type: String, default: '', trim: true },
    members: { type: [UnionMemberSchema], default: [] },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

const SystemSettingsName = 'SystemSettings'

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models[SystemSettingsName]
}

const SystemSettings: Model<ISystemSettings> =
  (mongoose.models[SystemSettingsName] as Model<ISystemSettings> | undefined) ??
  mongoose.model<ISystemSettings>(SystemSettingsName, SystemSettingsSchema)

export default SystemSettings
