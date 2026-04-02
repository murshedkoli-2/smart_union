export const CERTIFICATE_TYPES = {
  CITIZENSHIP: 'CIT',
  INCOME: 'INC',
  RESIDENCE: 'RES',
  CHARACTER: 'CHR',
  WARISH: 'WAR',
  FAMILY: 'FAM',
  UNMARRIED: 'UNM',
  NATIONALITY: 'NAT',
  DEATH: 'DTH',
  MARRIED: 'MRD',
  NON_REMARRIAGE: 'NRM',
  UNEMPLOYMENT: 'UEM',
  PROPERTY: 'PRP',
  LANDLESS: 'LDL',
  OTHER: 'OTH',
} as const

export type CertificateTypeCode = (typeof CERTIFICATE_TYPES)[keyof typeof CERTIFICATE_TYPES]

export const CERTIFICATE_TYPE_LABELS: Record<CertificateTypeCode, string> = {
  CIT: 'Citizenship',
  INC: 'Income',
  RES: 'Residence',
  CHR: 'Character',
  WAR: 'Warish',
  FAM: 'Family',
  UNM: 'Unmarried',
  NAT: 'Nationality',
  DTH: 'Death',
  MRD: 'Married',
  NRM: 'Non-Remarriage',
  UEM: 'Unemployment',
  PRP: 'Property',
  LDL: 'Landless',
  OTH: 'Other',
}

export const CERTIFICATE_LANGUAGES = {
  BN: 'bn',
  EN: 'en',
} as const

export type CertificateLanguage = (typeof CERTIFICATE_LANGUAGES)[keyof typeof CERTIFICATE_LANGUAGES]
