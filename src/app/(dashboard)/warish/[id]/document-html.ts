/**
 * Builds the printable HTML for a warish / family application.
 *
 * The same four render calls (family BN, family EN, warish BN, warish EN) were
 * written out twice in the page — once for issuing a certificate and once for
 * re-downloading one — with every field of the payload repeated in each. Eight
 * copies of the same mapping meant a field added to the certificate had to be
 * added in eight places, and the two re-download copies had already drifted
 * into a different formatting style.
 *
 * One mapping, one place to change.
 */
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
import { generateFamilyApplicationHtml } from '@/lib/utils/family-application-render'
import { generateWarishApplicationHtml } from '@/lib/utils/warish-application-render'
import type { Heir, WarishApplication, WarishPageSettings } from '@/types/warish.types'

export type CertificateLanguage = 'bn' | 'en'

interface DocumentInput {
  application: WarishApplication
  settings: WarishPageSettings
  /** family_members for a family certificate, heirs for a warish one. */
  members: Heir[]
}

interface CertificateInput extends DocumentInput {
  language: CertificateLanguage
  certificateNo: string
  /** Data-URL QR image, absent when the certificate carries no verification URL. */
  qrDataUrl?: string
}

const isFamily = (application: WarishApplication) =>
  application.application_type === 'family_certificate'

function familyCertificateData({
  application,
  settings,
  members,
  certificateNo,
  qrDataUrl,
}: CertificateInput): FamilyCertificateData {
  const applicant = application.applicant_citizen_id
  return {
    isDraft: false,
    certificateNo,
    qr_code_url: qrDataUrl,
    applicant_name_bn: applicant?.name_bn || '',
    applicant_name_en: applicant?.name_en || '',
    father_name_bn: applicant?.father_name_bn || '',
    father_name_en: applicant?.father_name_en || '',
    mother_name_bn: applicant?.mother_name_bn || '',
    mother_name_en: applicant?.mother_name_en || '',
    nid_no: applicant?.nid_no || '',
    present_address_bn: '',
    present_address_en: '',
    family_members: members,
    union_name_bn: settings.union_name_bn || '',
    union_name_en: settings.union_name_en,
    union_address_bn: settings.address_bn,
    union_address_en: settings.address_en,
    chairman_name_bn: settings.chairman_name_bn,
    chairman_name_en: settings.chairman_name_en,
    union_logo: settings.union_logo,
  }
}

function warishCertificateData({
  application,
  settings,
  members,
  certificateNo,
  qrDataUrl,
}: CertificateInput): WarishCertificateData {
  const applicant = application.applicant_citizen_id
  return {
    isDraft: false,
    certificateNo,
    qr_code_url: qrDataUrl,
    deceased_name_bn: application.deceased_name_bn,
    deceased_name_en: application.deceased_name_en,
    deceased_father_name_bn: application.deceased_father_name_bn,
    deceased_father_name_en: application.deceased_father_name_en,
    deceased_mother_name_bn: application.deceased_mother_name_bn,
    deceased_mother_name_en: application.deceased_mother_name_en,
    deceased_nid: application.deceased_nid,
    date_of_death: application.date_of_death,
    applicant_name_bn: applicant?.name_bn,
    applicant_name_en: applicant?.name_en,
    heirs: members,
    union_name_bn: settings.union_name_bn || '',
    union_name_en: settings.union_name_en,
    union_address_bn: settings.address_bn,
    union_address_en: settings.address_en,
    chairman_name_bn: settings.chairman_name_bn,
    chairman_name_en: settings.chairman_name_en,
    union_logo: settings.union_logo,
  }
}

/** The issued certificate, in the requested language and application type. */
export function buildCertificateHtml(input: CertificateInput): string {
  const bengali = input.language === 'bn'

  if (isFamily(input.application)) {
    const data = familyCertificateData(input)
    return bengali
      ? generateFamilyCertificateBnHtml(data)
      : generateFamilyCertificateEnHtml(data)
  }

  const data = warishCertificateData(input)
  return bengali
    ? generateWarishCertificateBnHtml(data)
    : generateWarishCertificateEnHtml(data)
}

/** The application form itself, printed before approval. */
export function buildApplicationHtml({
  application,
  settings,
  members,
}: DocumentInput): string {
  const applicant = application.applicant_citizen_id
  const systemSettings = {
    union_name_bn: settings.union_name_bn || '',
    union_name_en: settings.union_name_en || '',
    address_bn: settings.address_bn || '',
    chairman_name_bn: settings.chairman_name_bn || '',
    union_logo: settings.union_logo,
  }
  const applicationId = application._id.slice(-8).toUpperCase()

  if (isFamily(application)) {
    return generateFamilyApplicationHtml({
      applicant: {
        name_bn: applicant?.name_bn || '',
        name_en: applicant?.name_en || '',
        father_name_bn: applicant?.father_name_bn || '',
        father_name_en: applicant?.father_name_en || '',
        mother_name_bn: applicant?.mother_name_bn || '',
        mother_name_en: applicant?.mother_name_en || '',
        mobile: applicant?.mobile || '',
        nid_no: applicant?.nid_no,
        address_bn: '',
      },
      family_members: members,
      applicationId,
      systemSettings,
    })
  }

  return generateWarishApplicationHtml({
    deceased_name_bn: application.deceased_name_bn,
    deceased_name_en: application.deceased_name_en,
    deceased_father_name_bn: application.deceased_father_name_bn,
    deceased_father_name_en: application.deceased_father_name_en,
    deceased_mother_name_bn: application.deceased_mother_name_bn,
    deceased_mother_name_en: application.deceased_mother_name_en,
    deceased_nid: application.deceased_nid,
    date_of_death: application.date_of_death,
    applicant: {
      name_bn: applicant?.name_bn || '',
      name_en: applicant?.name_en || '',
      mobile: applicant?.mobile || '',
      nid_no: applicant?.nid_no,
    },
    heirs: members,
    applicationId,
    submittedAt: application.createdAt,
    status: application.status,
    systemSettings,
  })
}

/** Download filenames, kept identical to what the page produced before. */
export function certificateFileName(
  application: WarishApplication,
  language: CertificateLanguage,
  id: string,
): string {
  const kind = isFamily(application) ? 'family_certificate' : 'warish_certificate'
  return `${kind}_${language === 'bn' ? 'bangla' : 'english'}_${id.slice(-6)}.pdf`
}

export function applicationFileName(application: WarishApplication): string {
  const kind = isFamily(application) ? 'family_certificate' : 'warish_application'
  return `${kind}_${application._id.slice(-8)}.pdf`
}
