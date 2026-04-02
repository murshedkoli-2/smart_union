import mongoose, { Schema, Document, Model } from 'mongoose'
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
  status: CitizenStatus | 'deleted'
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
    holding_no: { type: String, unique: true, sparse: true },
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
    nid_no: { type: String, unique: true, sparse: true, trim: true },
    birth_cert_no: { type: String, unique: true, sparse: true, trim: true },
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
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deleted'],
      default: 'pending',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

CitizenSchema.index({ ward_no: 1 })
CitizenSchema.index({ 'address.ward_no': 1 })
CitizenSchema.index({ status: 1 })
CitizenSchema.index({ mobile: 1 })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Citizen
}

const Citizen: Model<ICitizen> =
  mongoose.models.Citizen ?? mongoose.model<ICitizen>('Citizen', CitizenSchema)

export default Citizen
