/**
 * The citizen registration form's data, rules and payload — no React.
 *
 * Validation and payload assembly were two long function bodies inside the
 * component, which made the only genuinely testable part of the form the part
 * hardest to reach. They are pure functions here, and `tests/unit` covers them.
 */
import type {
  BloodGroup,
  EducationLevel,
  Gender,
  HouseType,
  MaritalStatus,
  OwnershipType,
  Religion,
} from '@/types/citizen.types'

export interface AddressData {
  village_bn: string
  village_en: string
  post_office_bn: string
  post_office_en: string
  thana_bn: string
  thana_en: string
  district_bn: string
  district_en: string
  ward_no: number | string
}

export interface CitizenFormData {
  // Personal Information
  name_bn: string
  name_en: string
  father_name_bn: string
  father_name_en: string
  mother_name_bn: string
  mother_name_en: string
  spouse_name_bn: string
  spouse_name_en: string
  date_of_birth: string
  gender: Gender
  mobile: string
  blood_group: BloodGroup | ''
  religion: Religion | ''
  marital_status: MaritalStatus | ''
  education_level: EducationLevel | ''

  // Identification
  nid_no: string
  birth_cert_no: string

  // Addresses
  address: AddressData
  same_as_present: boolean
  permanent_address: AddressData

  housing_info: {
    house_type: HouseType | ''
    ownership_type: OwnershipType | ''
    total_rooms: number | string
  }

  financial_info: {
    annual_income: number | string
    occupation: string
    land_owned_dec: number | string
  }
}

const emptyAddress = (): AddressData => ({
  village_bn: '',
  village_en: '',
  post_office_bn: '',
  post_office_en: '',
  thana_bn: '',
  thana_en: '',
  district_bn: '',
  district_en: '',
  ward_no: '',
})

export const defaultCitizenForm = (): CitizenFormData => ({
  name_bn: '',
  name_en: '',
  father_name_bn: '',
  father_name_en: '',
  mother_name_bn: '',
  mother_name_en: '',
  spouse_name_bn: '',
  spouse_name_en: '',
  date_of_birth: '',
  gender: 'male',
  mobile: '',
  blood_group: '',
  religion: '',
  marital_status: '',
  education_level: '',
  nid_no: '',
  birth_cert_no: '',
  address: emptyAddress(),
  same_as_present: false,
  permanent_address: emptyAddress(),
  housing_info: { house_type: '', ownership_type: '', total_rooms: '' },
  financial_info: { annual_income: '', occupation: '', land_owned_dec: '' },
})

/**
 * Required fields, in the order they appear on the form, so the message points
 * at the first thing the user has to go back and fix.
 */
const REQUIRED: Array<[(form: CitizenFormData) => unknown, string]> = [
  [(f) => f.name_bn.trim(), 'নাম (বাংলা) আবশ্যক / Name (Bangla) is required'],
  [(f) => f.name_en.trim(), 'Name (English) is required'],
  [(f) => f.father_name_bn.trim(), 'পিতার নাম (বাংলা) আবশ্যক'],
  [(f) => f.father_name_en.trim(), "Father's Name (English) is required"],
  [(f) => f.mother_name_bn.trim(), 'মাতার নাম (বাংলা) আবশ্যক'],
  [(f) => f.mother_name_en.trim(), "Mother's Name (English) is required"],
  [(f) => f.date_of_birth, 'জন্ম তারিখ আবশ্যক / Date of birth is required'],
  [(f) => f.mobile.trim(), 'মোবাইল নম্বর আবশ্যক / Mobile number is required'],
  [(f) => f.address.village_bn.trim(), 'গ্রাম (বাংলা) আবশ্যক / Village (Bangla) is required'],
  [(f) => f.address.village_en.trim(), 'Village (English) is required'],
  [(f) => f.address.post_office_bn.trim(), 'ডাকঘর (বাংলা) আবশ্যক / Post office (Bangla) is required'],
  [(f) => f.address.post_office_en.trim(), 'Post office (English) is required'],
  [(f) => f.address.thana_bn.trim(), 'থানা (বাংলা) আবশ্যক / Thana (Bangla) is required'],
  [(f) => f.address.thana_en.trim(), 'Thana (English) is required'],
  [(f) => f.address.district_bn.trim(), 'জেলা (বাংলা) আবশ্যক / District (Bangla) is required'],
  [(f) => f.address.district_en.trim(), 'District (English) is required'],
  [(f) => f.address.ward_no, 'ওয়ার্ড নম্বর আবশ্যক / Ward number is required'],
]

/** The first validation failure, or null when the form is complete. */
export function validateCitizenForm(form: CitizenFormData): string | null {
  for (const [read, message] of REQUIRED) {
    if (!read(form)) return message
  }
  return null
}

const trimmedAddress = (address: AddressData) => ({
  village_bn: address.village_bn.trim(),
  village_en: address.village_en.trim(),
  post_office_bn: address.post_office_bn.trim(),
  post_office_en: address.post_office_en.trim(),
  thana_bn: address.thana_bn.trim(),
  thana_en: address.thana_en.trim(),
  district_bn: address.district_bn.trim(),
  district_en: address.district_en.trim(),
  ward_no: Number(address.ward_no),
})

/**
 * The POST body. Blank optional fields are left out entirely rather than sent
 * as empty strings — the server validates enums, and '' is not a member.
 */
export function buildCitizenPayload(form: CitizenFormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name_bn: form.name_bn.trim(),
    name_en: form.name_en.trim(),
    father_name_bn: form.father_name_bn.trim(),
    father_name_en: form.father_name_en.trim(),
    mother_name_bn: form.mother_name_bn.trim(),
    mother_name_en: form.mother_name_en.trim(),
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    mobile: form.mobile.trim(),
    address: trimmedAddress(form.address),
  }

  const optional: Array<[string, string]> = [
    ['blood_group', form.blood_group],
    ['religion', form.religion],
    ['marital_status', form.marital_status],
    ['education_level', form.education_level],
    ['spouse_name_bn', form.spouse_name_bn.trim()],
    ['spouse_name_en', form.spouse_name_en.trim()],
    ['nid_no', form.nid_no.trim()],
    ['birth_cert_no', form.birth_cert_no.trim()],
  ]
  for (const [key, value] of optional) {
    if (value) payload[key] = value
  }

  const permanent = form.same_as_present ? form.address : form.permanent_address
  if (permanent.village_bn.trim()) {
    payload.permanent_address = trimmedAddress(permanent)
  }

  const housing: Record<string, unknown> = {}
  if (form.housing_info.house_type) housing.house_type = form.housing_info.house_type
  if (form.housing_info.ownership_type) housing.ownership_type = form.housing_info.ownership_type
  if (form.housing_info.total_rooms) housing.total_rooms = Number(form.housing_info.total_rooms)
  if (Object.keys(housing).length > 0) payload.housing_info = housing

  const financial: Record<string, unknown> = {}
  if (form.financial_info.annual_income) {
    financial.annual_income = Number(form.financial_info.annual_income)
  }
  if (form.financial_info.occupation.trim()) {
    financial.occupation = form.financial_info.occupation.trim()
  }
  if (form.financial_info.land_owned_dec) {
    financial.land_owned_dec = Number(form.financial_info.land_owned_dec)
  }
  if (Object.keys(financial).length > 0) payload.financial_info = financial

  return payload
}

/** Select options, paired Bangla/English exactly as the form showed them. */
export const SELECT_OPTIONS = {
  gender: [
    { value: 'male', label: 'পুরুষ / Male' },
    { value: 'female', label: 'মহিলা / Female' },
    { value: 'other', label: 'অন্যান্য / Other' },
  ],
  blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => ({
    value: g,
    label: g,
  })),
  religion: [
    { value: 'islam', label: 'ইসলাম / Islam' },
    { value: 'hinduism', label: 'হিন্দু / Hinduism' },
    { value: 'christianity', label: 'খ্রিস্টান / Christianity' },
    { value: 'buddhism', label: 'বৌদ্ধ / Buddhism' },
    { value: 'others', label: 'অন্যান্য / Others' },
  ],
  marital_status: [
    { value: 'single', label: 'অবিবাহিত / Single' },
    { value: 'married', label: 'বিবাহিত / Married' },
    { value: 'divorced', label: 'তালাকপ্রাপ্ত / Divorced' },
    { value: 'widowed', label: 'বিধবা/বিপত্নীক / Widowed' },
  ],
  education_level: [
    { value: 'illiterate', label: 'নিরক্ষর / Illiterate' },
    { value: 'primary', label: 'প্রাথমিক / Primary' },
    { value: 'secondary', label: 'মাধ্যমিক / Secondary (SSC)' },
    { value: 'higher_secondary', label: 'উচ্চ মাধ্যমিক / Higher Secondary (HSC)' },
    { value: 'graduate', label: 'স্নাতক / Graduate' },
    { value: 'post_graduate', label: 'স্নাতকোত্তর / Post Graduate' },
    { value: 'others', label: 'অন্যান্য / Others' },
  ],
  house_type: [
    { value: 'pucca', label: 'পাকা / Pucca' },
    { value: 'semi_pucca', label: 'আধা-পাকা / Semi-Pucca' },
    { value: 'kutcha', label: 'কাঁচা / Kutcha' },
    { value: 'jhupri', label: 'ঝুপড়ি / Jhupri' },
  ],
  ownership_type: [
    { value: 'own', label: 'নিজস্ব / Own' },
    { value: 'rented', label: 'ভাড়া / Rented' },
    { value: 'others', label: 'অন্যান্য / Others' },
  ],
} as const
