/**
 * The unapproved certificate as the issue dialog previews it.
 *
 * Deliberately separate from the approved renderer in
 * `(dashboard)/certificates/[id]/preview-html.ts`: this one has no certificate
 * number, no QR and no verification URL, because none of those exist until an
 * admin approves. Keeping them apart stops "not issued yet" from being
 * expressed as a pile of empty-string arguments in the middle of a component.
 */
import {
  renderCertificateTemplate,
  renderOfficialCertificateLayout,
  type CitizenInfo,
} from '@/lib/utils/certificate-render'
import type {
  CertificateTemplate,
  CitizenForCert,
  EditableCertificateInfo,
  UnionSettings,
} from '@/types/certificate.types'

interface DraftInput {
  template: CertificateTemplate | null
  citizen: CitizenForCert
  info: EditableCertificateInfo
  dynamicData: Record<string, string>
  settings: UnionSettings | null
  language: string
}

/** "name, designation, mobile" per member, one per line. */
function membersText(settings: UnionSettings | null, language: 'bn' | 'en'): string {
  if (!settings?.members?.length) return ''
  return settings.members
    .map((member) =>
      [
        language === 'bn' ? member.name_bn : member.name_en,
        language === 'bn' ? member.designation_bn : member.designation_en,
        member.mobile,
      ]
        .filter(Boolean)
        .join(', '),
    )
    .join('\n')
}

export function buildDraftCertificateHtml({
  template,
  citizen,
  info,
  dynamicData,
  settings,
  language,
}: DraftInput): string {
  if (!template) return ''

  const isBn = language === 'bn'
  const today = new Date()
  const issueDate = today.toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const unionNameBn = settings?.union_name_bn || 'ইউনিয়ন পরিষদ'
  const unionNameEn = settings?.union_name_en || 'Union Parishad'
  const chairmanNameBn = settings?.chairman_name_bn || ''
  const chairmanNameEn = settings?.chairman_name_en || ''
  const unionAddressBn = settings?.address_bn || ''
  const unionAddressEn = settings?.address_en || ''
  const membersBn = membersText(settings, 'bn')
  const membersEn = membersText(settings, 'en')

  const address = citizen.address

  const citizenInfo: CitizenInfo = {
    name: info.person_name,
    fatherName: info.father_name,
    motherName: info.mother_name,
    dateOfBirth: citizen.date_of_birth
      ? new Date(citizen.date_of_birth).toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : undefined,
    nidNo: citizen.nid_no || undefined,
    wardNo: address?.ward_no !== undefined ? String(address.ward_no) : undefined,
    presentAddress: info.address || undefined,
    mobile: citizen.mobile || undefined,
  }

  const replacements: Record<string, string> = {
    // The edited value wins for the certificate's own language; the other
    // language keeps the citizen record's spelling.
    citizen_name_bn: isBn ? info.person_name : citizen.name_bn || '',
    citizen_name_en: isBn ? citizen.name_en || '' : info.person_name,
    father_name_bn: isBn ? info.father_name : citizen.father_name_bn || '',
    father_name_en: isBn ? citizen.father_name_en || '' : info.father_name,
    mother_name_bn: isBn ? info.mother_name : citizen.mother_name_bn || '',
    mother_name_en: isBn ? citizen.mother_name_en || '' : info.mother_name,
    nid_no: citizen.nid_no || '',
    mobile: citizen.mobile || '',
    village_bn: address?.village_bn || '',
    village_en: address?.village_en || '',
    post_office_bn: address?.post_office_bn || '',
    post_office_en: address?.post_office_en || '',
    thana_bn: address?.thana_bn || '',
    thana_en: address?.thana_en || '',
    district_bn: address?.district_bn || '',
    district_en: address?.district_en || '',
    ward_no: String(address?.ward_no || ''),
    issue_date: issueDate,
    certificate_no: '',
    union_name: isBn ? unionNameBn : unionNameEn,
    union_name_bn: unionNameBn,
    union_name_en: unionNameEn,
    chairman_name: isBn ? chairmanNameBn : chairmanNameEn,
    chairman_name_bn: chairmanNameBn,
    chairman_name_en: chairmanNameEn,
    union_address: isBn ? unionAddressBn : unionAddressEn,
    union_address_bn: unionAddressBn,
    union_address_en: unionAddressEn,
    union_logo_url: settings?.union_logo || '',
    union_members_text: isBn ? membersBn : membersEn,
    union_members_text_bn: membersBn,
    union_members_text_en: membersEn,
    upazila_name: '',
    district_name: '',
    verification_url: '',
  }

  const contentHtml = renderCertificateTemplate({
    templateHtml: template.body_template,
    replacements,
    dynamicData,
    rawReplacements: { verification_qr: '', verification_qr_html: '' },
    certificateNo: '',
  })

  return renderOfficialCertificateLayout({
    contentHtml,
    citizenInfo,
    language: isBn ? 'bn' : 'en',
    status: 'draft',
    unionName: replacements.union_name,
    unionAddress: replacements.union_address,
    chairmanName: replacements.chairman_name,
    unionLogoUrl: replacements.union_logo_url,
    certificateTitle: template.name,
    certificateNo: '',
    issueDate,
    verificationUrl: '',
    qrHtml: '',
  })
}
