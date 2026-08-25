/** Shapes the certificate screens read from the API. */

export interface CertificateAddress {
  village_bn?: string
  village_en?: string
  post_office_bn?: string
  post_office_en?: string
  thana_bn?: string
  thana_en?: string
  district_bn?: string
  district_en?: string
  ward_no?: number
}

export interface CertificateCitizen {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  mobile?: string
  nid_no?: string
  birth_cert_no?: string
  date_of_birth?: string
  address?: CertificateAddress
  permanent_address?: CertificateAddress | null
}

export interface PaymentReceipt {
  _id: string
  receipt_no: string
  amount: number
  payment_method: string
  note?: string
  createdAt: string
}

export interface CertificateRecord {
  _id: string
  certificate_no: string | null
  language: string
  certificate_type: string
  citizen_id: CertificateCitizen | null
  template_id: { _id: string; name: string; body_template?: string; fee?: number } | null
  status: string
  fiscal_year: string
  dynamic_data: Record<string, unknown>
  payment_id?: PaymentReceipt | null
  qr_code_url?: string
  approved_at?: string
  createdAt: string
}

export interface UnionMember {
  name_bn: string
  name_en: string
  designation_bn: string
  designation_en: string
  mobile?: string
}

export interface UnionSettings {
  union_name_bn: string
  union_name_en: string
  chairman_name_bn: string
  chairman_name_en: string
  union_logo?: string | null
  address_bn: string
  address_en: string
  members: UnionMember[]
}

export interface DynamicField {
  field_key: string
  field_label: string
  field_type: 'text' | 'date' | 'number' | 'select'
  options: string[]
  required: boolean
  default_value?: string
}

export interface CertificateTemplate {
  _id: string
  name: string
  certificate_category: string
  language: string
  body_template: string
  fee: number
  dynamic_fields: DynamicField[]
}

/** The citizen fields the issue flow reads. */
export interface CitizenForCert {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  nid_no?: string
  date_of_birth?: string
  mobile?: string
  address?: CertificateAddress
}

/**
 * Name and address as they will be printed on this one certificate.
 *
 * Seeded from the citizen record but editable, because a certificate sometimes
 * has to name someone the way a court or an employer spells it.
 */
export interface EditableCertificateInfo {
  person_name: string
  father_name: string
  mother_name: string
  address: string
}
