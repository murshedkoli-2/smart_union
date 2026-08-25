/**
 * Shapes the warish / family-certificate screens read from the API.
 *
 * These lived inline in the detail page, which meant the list page, the detail
 * page and the create modal each carried their own near-copy and drifted.
 */

export interface Heir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: string
  nid_no: string
}

export interface ApplicantCitizen {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  mobile: string
  nid_no?: string
  address?: Record<string, unknown>
}

/** The subset of system settings the certificate and application PDFs need. */
export interface WarishPageSettings {
  union_name_bn?: string
  union_name_en?: string
  address_bn?: string
  address_en?: string
  chairman_name_bn?: string
  chairman_name_en?: string
  union_logo?: string | null
}

export interface WarishApplication {
  _id: string
  application_type: 'warish' | 'family_certificate'
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  deceased_nid?: string
  date_of_death: string
  applicant_citizen_id: ApplicantCitizen | null
  heirs: Heir[]
  family_members?: Heir[]
  status: string
  payment_id?: unknown
  certificate_id?: string | { _id: string }
  certificate_id_bn?: string | { _id: string; status: string }
  certificate_id_en?: string | { _id: string; status: string }
  createdAt: string
  approved_at?: string
  approved_by?: { name: string }
}

/** Editable fields on a draft application. */
export interface WarishEditFormState {
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn: string
  deceased_mother_name_en: string
  deceased_nid: string
  date_of_death: string
  heirs: Heir[]
  family_members: Heir[]
}

/** A certificate reference is populated in some responses and an id in others. */
export function certificateId(
  ref: string | { _id: string } | undefined,
): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref._id
}

/** A row in the warish / family-certificate list. */
export interface WarishListItem {
  _id: string
  application_type: 'warish' | 'family_certificate'
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  date_of_death: string
  applicant_citizen_id: { name_bn: string; name_en: string } | null
  heirs: Heir[]
  family_members?: Heir[]
  status: string
  createdAt: string
  certificate_id_bn?: string | { _id: string; certificate_no?: string } | null
  certificate_id_en?: string | { _id: string; certificate_no?: string } | null
}

export interface WarishListStats {
  total: number
  pending: number
  approved: number
  draft: number
  rejected: number
}

export interface WarishListResponse {
  applications: WarishListItem[]
  total: number
  page: number
  limit: number
  stats: WarishListStats
}

export type WarishApplicationKind = 'warish' | 'family_certificate'

/** Which collection holds the people, per application kind. */
export function memberKeyFor(kind: WarishApplicationKind): 'heirs' | 'family_members' {
  return kind === 'family_certificate' ? 'family_members' : 'heirs'
}

export const emptyHeir = (): Heir => ({
  name_bn: '',
  name_en: '',
  relation: '',
  birth_date: '',
  nid_no: '',
})

/** Relations offered when adding an heir or family member. */
export const MEMBER_RELATIONS = [
  { value: 'Son', label: 'Son (পুত্র)' },
  { value: 'Daughter', label: 'Daughter (কন্যা)' },
  { value: 'Wife', label: 'Wife (স্ত্রী)' },
  { value: 'Husband', label: 'Husband (স্বামী)' },
  { value: 'Father', label: 'Father (পিতা)' },
  { value: 'Mother', label: 'Mother (মাতা)' },
  { value: 'Brother', label: 'Brother (ভাই)' },
  { value: 'Sister', label: 'Sister (বোন)' },
] as const
