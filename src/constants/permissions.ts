export const PERMISSIONS = {
  // Citizen
  CITIZEN_CREATE: 'citizen.create',
  CITIZEN_APPROVE: 'citizen.approve',
  CITIZEN_VIEW: 'citizen.view',
  CITIZEN_EDIT: 'citizen.edit',

  // Certificate
  CERTIFICATE_CREATE: 'certificate.create',
  CERTIFICATE_APPROVE: 'certificate.approve',
  CERTIFICATE_VIEW: 'certificate.view',

  // Tax
  TAX_CREATE: 'tax.create',
  TAX_COLLECT: 'tax.collect',
  TAX_VIEW: 'tax.view',

  // Payment
  PAYMENT_COLLECT: 'payment.collect',
  PAYMENT_VIEW: 'payment.view',

  // Relief
  RELIEF_MANAGE: 'relief.manage',
  RELIEF_VIEW: 'relief.view',

  // Cashbook
  CASHBOOK_VIEW: 'cashbook.view',

  // Warish
  WARISH_CREATE: 'warish.create',
  WARISH_APPROVE: 'warish.approve',
  WARISH_VIEW: 'warish.view',

  // Admin management
  USER_MANAGE: 'user.manage',

  // System
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
  TEMPLATE_MANAGE: 'template.manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)
