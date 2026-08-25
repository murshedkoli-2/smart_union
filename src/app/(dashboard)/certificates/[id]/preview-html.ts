/**
 * Turns a certificate record into the printable HTML the page previews and
 * downloads.
 *
 * Three shapes share one entry point: warish and family certificates have
 * their own dedicated renderers, and everything else fills in an admin-authored
 * template. This was a 180-line useMemo body inside the page component, which
 * made both the branching and the page's own layout hard to read.
 */
import {
  renderCertificateTemplate,
  renderOfficialCertificateLayout,
  type CitizenInfo,
} from '@/lib/utils/certificate-render'
import {
  generateFamilyCertificateBnHtml,
  generateFamilyCertificateEnHtml,
  type FamilyCertificateData,
} from '@/lib/utils/family-certificate-render'
import {
  generateWarishCertificateBnHtml,
  generateWarishCertificateEnHtml,
  type WarishCertificateData,
} from '@/lib/utils/warish-certificate-render'
import { CERTIFICATE_TYPE_LABELS } from '@/constants/certificate-types'
import type {
  CertificateAddress,
  CertificateRecord,
  UnionSettings,
} from '@/types/certificate.types'

export function certificateTypeLabel(type: string): string {
  return (
    CERTIFICATE_TYPE_LABELS[type as keyof typeof CERTIFICATE_TYPE_LABELS] ||
    type.replace(/_/g, ' ')
  )
}

/** 'locked' is 'approved' that can no longer be edited. */
export function effectiveCertificateStatus(status?: string): string | undefined {
  return status === 'locked' ? 'approved' : status
}

const ADDRESS_LABELS = {
  bn: { village: 'গ্রাম', postOffice: 'ডাকঘর', thana: 'উপজেলা', district: 'জেলা' },
  en: { village: 'Village', postOffice: 'Post Office', thana: 'Upazila', district: 'District' },
}

function formatAddress(
  address: CertificateAddress | undefined | null,
  locale: 'bn' | 'en',
): string {
  if (!address) return ''
  const label = ADDRESS_LABELS[locale]
  const bengali = locale === 'bn'

  return [
    [label.village, bengali ? address.village_bn : address.village_en],
    [label.postOffice, bengali ? address.post_office_bn : address.post_office_en],
    [label.thana, bengali ? address.thana_bn : address.thana_en],
    [label.district, bengali ? address.district_bn : address.district_en],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}: ${value}`)
    .join(', ')
}

interface PreviewInput {
  cert: CertificateRecord
  settings: UnionSettings
  /** Empty until the certificate is approved and its QR has been rendered. */
  qrDataUrl: string
  verificationUrl: string
  effectiveStatus?: string
}

/**
 * The preview HTML, or an empty string when it is not ready — the caller
 * treats empty as "still loading" and neither renders nor downloads.
 */
export function buildCertificatePreviewHtml({
  cert,
  settings,
  qrDataUrl,
  verificationUrl,
  effectiveStatus,
}: PreviewInput): string {
  const isBn = cert.language === 'bn'
  const approved = effectiveStatus === 'approved'

  // An approved certificate must not print without its QR, so wait for it.
  if (approved && verificationUrl && !qrDataUrl) return ''

  const issueDate = new Date(cert.approved_at || cert.createdAt || new Date()).toLocaleDateString(
    isBn ? 'bn-BD' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )

  const unionName = isBn
    ? settings.union_name_bn || 'ইউনিয়ন পরিষদ'
    : settings.union_name_en || 'Union Parishad'
  const chairmanName = (isBn ? settings.chairman_name_bn : settings.chairman_name_en) || ''
  const unionAddress = (isBn ? settings.address_bn : settings.address_en) || ''
  const unionLogoUrl = settings.union_logo || ''

  /** Header block shared by the two dedicated renderers. */
  const sharedHeader = {
    isDraft: !approved,
    certificateNo: approved ? cert.certificate_no || '' : '',
    qr_code_url: approved && qrDataUrl ? qrDataUrl : undefined,
    issueDate,
    union_name_bn: settings.union_name_bn || '',
    union_name_en: settings.union_name_en,
    union_address_bn: settings.address_bn,
    union_address_en: settings.address_en,
    chairman_name_bn: settings.chairman_name_bn,
    chairman_name_en: settings.chairman_name_en,
    union_logo: settings.union_logo,
  }

  const dynamic = cert.dynamic_data || {}
  const citizen = cert.citizen_id

  if (cert.certificate_type === 'WAR') {
    const data: WarishCertificateData = {
      ...sharedHeader,
      deceased_name_bn: String(dynamic.deceased_name_bn || ''),
      deceased_name_en: String(dynamic.deceased_name_en || ''),
      deceased_father_name_bn: String(dynamic.deceased_father_name_bn || ''),
      deceased_father_name_en: String(dynamic.deceased_father_name_en || ''),
      deceased_mother_name_bn: String(dynamic.deceased_mother_name_bn || ''),
      deceased_mother_name_en: String(dynamic.deceased_mother_name_en || ''),
      deceased_nid: String(dynamic.deceased_nid || ''),
      date_of_death: String(dynamic.date_of_death || ''),
      applicant_name_bn: citizen?.name_bn,
      applicant_name_en: citizen?.name_en,
      heirs: Array.isArray(dynamic.heirs) ? dynamic.heirs : [],
    }
    return isBn ? generateWarishCertificateBnHtml(data) : generateWarishCertificateEnHtml(data)
  }

  if (cert.certificate_type === 'FAM') {
    const data: FamilyCertificateData = {
      ...sharedHeader,
      applicant_name_bn: citizen?.name_bn || '',
      applicant_name_en: citizen?.name_en || '',
      father_name_bn: citizen?.father_name_bn || '',
      father_name_en: citizen?.father_name_en || '',
      mother_name_bn: citizen?.mother_name_bn || '',
      mother_name_en: citizen?.mother_name_en || '',
      nid_no: citizen?.nid_no || '',
      present_address_bn: formatAddress(citizen?.address, 'bn'),
      present_address_en: formatAddress(citizen?.address, 'en'),
      family_members: Array.isArray(dynamic.family_members)
        ? (dynamic.family_members as FamilyCertificateData['family_members'])
        : [],
    }
    return isBn ? generateFamilyCertificateBnHtml(data) : generateFamilyCertificateEnHtml(data)
  }

  if (!cert.template_id?.body_template) return ''

  const locale = isBn ? 'bn' : 'en'
  const address = citizen?.address
  const dateOfBirth = citizen?.date_of_birth
    ? new Date(citizen.date_of_birth).toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : undefined

  /** dynamic_data may override the citizen record for this one certificate. */
  const override = (key: string): string =>
    typeof dynamic[key] === 'string' ? (dynamic[key] as string) : ''

  const citizenInfo: CitizenInfo = {
    name: override('certificate_person_name') || (isBn ? citizen?.name_bn : citizen?.name_en) || '',
    fatherName:
      override('certificate_father_name') ||
      (isBn ? citizen?.father_name_bn : citizen?.father_name_en) ||
      '',
    motherName:
      override('certificate_mother_name') ||
      (isBn ? citizen?.mother_name_bn : citizen?.mother_name_en) ||
      '',
    dateOfBirth,
    nidNo: citizen?.nid_no || citizen?.birth_cert_no || undefined,
    wardNo: address?.ward_no !== undefined ? String(address.ward_no) : undefined,
    presentAddress: override('certificate_address') || formatAddress(address, locale) || undefined,
    permanentAddress: citizen?.permanent_address
      ? formatAddress(citizen.permanent_address, locale)
      : undefined,
    mobile: citizen?.mobile || undefined,
  }

  const certificateNo = approved ? cert.certificate_no || '' : ''

  const replacements: Record<string, unknown> = {
    issue_date: issueDate,
    certificate_no: certificateNo,
    union_name: unionName,
    union_name_bn: settings.union_name_bn || '',
    union_name_en: settings.union_name_en || '',
    chairman_name: chairmanName,
    chairman_name_bn: settings.chairman_name_bn || '',
    chairman_name_en: settings.chairman_name_en || '',
    union_address: unionAddress,
    union_address_bn: settings.address_bn || '',
    union_address_en: settings.address_en || '',
    union_logo_url: unionLogoUrl,
    verification_url: approved ? verificationUrl : '',
    citizen_name_bn: isBn ? citizenInfo.name : citizen?.name_bn || '',
    citizen_name_en: isBn ? citizen?.name_en || '' : citizenInfo.name,
    father_name_bn: isBn ? citizenInfo.fatherName : citizen?.father_name_bn || '',
    father_name_en: isBn ? citizen?.father_name_en || '' : citizenInfo.fatherName,
    mother_name_bn: isBn ? citizenInfo.motherName : citizen?.mother_name_bn || '',
    mother_name_en: isBn ? citizen?.mother_name_en || '' : citizenInfo.motherName,
    present_address: citizenInfo.presentAddress || '',
  }

  // qrDataUrl is a data: URL this app generated, so it needs no escaping.
  const qrHtml =
    approved && qrDataUrl
      ? `<img src="${qrDataUrl}" alt="QR" width="100" height="100" style="display:block; border:1px solid #ccc; padding:3px; background:#fff;" />`
      : ''

  const contentHtml = renderCertificateTemplate({
    templateHtml: cert.template_id.body_template,
    replacements,
    dynamicData: cert.dynamic_data,
    rawReplacements: { verification_qr: '', verification_qr_html: '' },
    certificateNo,
  })

  return renderOfficialCertificateLayout({
    contentHtml,
    citizenInfo,
    language: locale,
    status: effectiveStatus,
    unionName,
    unionAddress,
    chairmanName,
    unionLogoUrl,
    certificateTitle:
      cert.template_id.name || certificateTypeLabel(cert.certificate_type) || 'Certificate',
    certificateNo,
    issueDate,
    verificationUrl,
    qrHtml,
  })
}
