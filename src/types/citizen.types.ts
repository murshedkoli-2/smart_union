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
