export type CitizenStatus = 'pending' | 'approved' | 'rejected'
export type Gender = 'male' | 'female' | 'other'
export type HouseType = 'pucca' | 'semi_pucca' | 'kutcha' | 'jhupri'
export type OwnershipType = 'own' | 'rented' | 'others'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
export type Religion = 'islam' | 'hinduism' | 'christianity' | 'buddhism' | 'others'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
export type EducationLevel = 'illiterate' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'post_graduate' | 'others'

export interface AddressDto {
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

export interface HousingInfoDto {
  house_type?: HouseType
  ownership_type?: OwnershipType
  total_rooms?: number
}

export interface FinancialInfoDto {
  annual_income?: number
  occupation?: string
  land_owned_dec?: number
}

export interface CreateCitizenDto {
  name_bn: string
  name_en: string
  father_name_bn: string
  father_name_en: string
  mother_name_bn: string
  mother_name_en: string
  spouse_name_bn?: string
  spouse_name_en?: string
  date_of_birth: string
  gender: Gender
  nid_no?: string
  birth_cert_no?: string
  mobile: string
  address: AddressDto
  permanent_address?: AddressDto
  housing_info?: HousingInfoDto
  financial_info?: FinancialInfoDto
  blood_group?: BloodGroup
  religion?: Religion
  marital_status?: MaritalStatus
  education_level?: EducationLevel
}

/**
 * A citizen as the detail screen receives it: the create DTO plus the fields
 * the server adds. Declared here rather than inline in the page so the detail
 * page, the list view and the certificate modal agree on one shape.
 */
export interface CitizenRecord extends CreateCitizenDto {
  _id: string
  status: string
  approved_by?: { name: string }
  approved_at?: string
  createdAt: string
}

export interface CitizenCertificate {
  _id: string
  certificate_no: string
  certificate_type: string
  language: string
  status: string
  fiscal_year: string
  createdAt: string
}

export interface CitizenTaxRecord {
  _id: string
  holding_no: string
  fiscal_year: string
  amount: number
  status: string
  payment_id?: string
  paid_at: string | null
  createdAt: string
}

export interface CitizenTaxData {
  citizen_id: string
  /** Null until the first payment generates one. */
  holding_no: string | null
  taxes: CitizenTaxRecord[]
}

export interface CitizenWarishSummary {
  _id: string
  application_type?: 'warish' | 'family_certificate'
  deceased_name_bn: string
  deceased_name_en: string
  status: string
  createdAt: string
}
