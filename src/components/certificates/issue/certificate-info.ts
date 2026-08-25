/** Seeding the editable certificate fields from a citizen record. */
import type {
  CertificateAddress,
  CitizenForCert,
  EditableCertificateInfo,
} from '@/types/certificate.types'

const ADDRESS_LABELS = {
  bn: { village: 'গ্রাম', postOffice: 'ডাকঘর', thana: 'উপজেলা', district: 'জেলা' },
  en: { village: 'Village', postOffice: 'Post Office', thana: 'Upazila', district: 'District' },
}

/** "গ্রাম: X, ডাকঘর: Y, …" — parts with no value are dropped. */
export function formatCertificateAddress(
  address: CertificateAddress | undefined,
  language: 'bn' | 'en',
): string {
  if (!address) return ''
  const label = ADDRESS_LABELS[language]
  const bengali = language === 'bn'

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

export function buildEditableCertificateInfo(
  citizen: CitizenForCert,
  language: 'bn' | 'en',
): EditableCertificateInfo {
  const bengali = language === 'bn'
  return {
    person_name: (bengali ? citizen.name_bn : citizen.name_en) || '',
    father_name: (bengali ? citizen.father_name_bn : citizen.father_name_en) || '',
    mother_name: (bengali ? citizen.mother_name_bn : citizen.mother_name_en) || '',
    address: formatCertificateAddress(citizen.address, language),
  }
}
