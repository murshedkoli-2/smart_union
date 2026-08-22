import mongoose, { Schema, Document, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/soft-delete'
import type { Gender, HouseType, OwnershipType, CitizenStatus, BloodGroup, Religion, MaritalStatus, EducationLevel } from '@/types/citizen.types'

export interface IAddress {
  village_bn: string
  village_en: string
  post_office_bn: string
  post_office_en: string
  thana_bn: string
  thana_en: string
  district_bn: string
  district_en: string
  ward_no: number
}

export interface IHousingInfo {
  house_type?: HouseType
  ownership_type?: OwnershipType
  total_rooms?: number
}

export interface IFinancialInfo {
  annual_income?: number
  occupation?: string
  land_owned_dec?: number
}

export interface ICitizen extends Document {
  user_id?: mongoose.Types.ObjectId
  holding_no?: string
  ward_no: number
  name_bn: string
  name_en: string
  father_name_bn: string
  father_name_en: string
  mother_name_bn: string
  mother_name_en: string
  spouse_name_bn?: string
  spouse_name_en?: string
  date_of_birth: Date
  gender: Gender
  nid_no?: string
  birth_cert_no?: string
  mobile: string
  address: IAddress
  permanent_address?: IAddress
  housing_info: IHousingInfo
  financial_info: IFinancialInfo
  blood_group?: BloodGroup
  religion?: Religion
  marital_status?: MaritalStatus
  education_level?: EducationLevel
  status: CitizenStatus
  /** Set when soft-deleted; null on live records. See plugins/soft-delete. */
  deleted_at?: Date | null
  approved_by?: mongoose.Types.ObjectId
  approved_at?: Date
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const AddressSchema = new Schema<IAddress>(
  {
    village_bn: { type: String, required: true, trim: true },
    village_en: { type: String, required: true, trim: true },
    post_office_bn: { type: String, required: true, trim: true },
    post_office_en: { type: String, required: true, trim: true },
    thana_bn: { type: String, required: true, trim: true },
    thana_en: { type: String, required: true, trim: true },
    district_bn: { type: String, required: true, trim: true },
    district_en: { type: String, required: true, trim: true },
    ward_no: { type: Number, required: true, min: 1, max: 9 },
  },
  { _id: false },
)

const HousingInfoSchema = new Schema<IHousingInfo>(
  {
    house_type: {
      type: String,
      enum: ['pucca', 'semi_pucca', 'kutcha', 'jhupri'],
      default: null,
    },
    ownership_type: {
      type: String,
      enum: ['own', 'rented', 'others'],
      default: null,
    },
    total_rooms: { type: Number, default: null },
  },
  { _id: false },
)

const FinancialInfoSchema = new Schema<IFinancialInfo>(
  {
    annual_income: { type: Number, default: null },
    occupation: { type: String, default: null, trim: true },
    land_owned_dec: { type: Number, default: null },
  },
  { _id: false },
)

const CitizenSchema = new Schema<ICitizen>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Uniqueness for holding_no / nid_no / birth_cert_no is enforced by the
    // partial indexes below, not here, so a soft-deleted record releases its
    // identifiers without having its values rewritten.
    holding_no: { type: String },
    ward_no: { type: Number, required: true, min: 1, max: 9 },
    name_bn: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },
    father_name_bn: { type: String, required: true, trim: true },
    father_name_en: { type: String, required: true, trim: true },
    mother_name_bn: { type: String, required: true, trim: true },
    mother_name_en: { type: String, required: true, trim: true },
    spouse_name_bn: { type: String, default: null, trim: true },
    spouse_name_en: { type: String, default: null, trim: true },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    nid_no: { type: String, trim: true },
    birth_cert_no: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: AddressSchema, required: true },
    permanent_address: { type: AddressSchema, default: null },
    housing_info: { type: HousingInfoSchema, default: () => ({}) },
    financial_info: { type: FinancialInfoSchema, default: () => ({}) },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
      default: null,
    },
    religion: {
      type: String,
      enum: ['islam', 'hinduism', 'christianity', 'buddhism', 'others'],
      default: null,
    },
    marital_status: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: null,
    },
    education_level: {
      type: String,
      enum: ['illiterate', 'primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate', 'others'],
      default: null,
    },
    status: {
      // 'deleted' is intentionally gone — deletion is deleted_at, not a status.
      // Legacy rows carrying it are converted by npm run migrate-soft-delete.
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

CitizenSchema.plugin(softDeletePlugin)

/**
 * Unique among live records only.
 *
 * `$type: 'string'` keeps documents that never had the identifier out of the
 * index, so many citizens without an NID do not collide on null — the job the
 * old `sparse: true` did. `deleted_at: null` releases the value when a record
 * is soft-deleted, which is what removes the need to mangle it.
 *
 * These replace the old plain unique indexes. Existing databases must run
 * `npm run migrate-soft-delete` to drop the old ones and build these.
 */
CitizenSchema.index(
  { holding_no: 1 },
  {
    unique: true,
    partialFilterExpression: { holding_no: { $type: 'string' }, deleted_at: null },
  },
)
CitizenSchema.index(
  { nid_no: 1 },
  {
    unique: true,
    partialFilterExpression: { nid_no: { $type: 'string' }, deleted_at: null },
  },
)
CitizenSchema.index(
  { birth_cert_no: 1 },
  {
    unique: true,
    partialFilterExpression: { birth_cert_no: { $type: 'string' }, deleted_at: null },
  },
)

CitizenSchema.index({ ward_no: 1 })
CitizenSchema.index({ 'address.ward_no': 1 })
CitizenSchema.index({ status: 1 })
CitizenSchema.index({ mobile: 1 })

/**
 * Supports the citizen search box.
 *
 * The search used to run an unanchored case-insensitive regex across four
 * fields. No index can serve that — `$options: 'i'` rules out the index even
 * for an anchored pattern — so every keystroke scanned the whole collection.
 *
 * Two indexed paths replace it (see listCitizens in services/citizen.service):
 *
 *  - Names go through this text index. `default_language: 'none'` disables
 *    stemming, which has no meaning for Bengali and would mangle proper nouns
 *    in either script; tokens are split on whitespace and matched whole.
 *  - Numbers (mobile, NID) use an anchored prefix regex. Case-insensitivity is
 *    meaningless for digits, so those queries drop it and use the plain
 *    ascending indexes below.
 */
CitizenSchema.index(
  { name_bn: 'text', name_en: 'text' },
  { default_language: 'none', name: 'citizen_name_text' },
)
CitizenSchema.index({ nid_no: 1 })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Citizen
}

const Citizen: Model<ICitizen> =
  mongoose.models.Citizen ?? mongoose.model<ICitizen>('Citizen', CitizenSchema)

export default Citizen
