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

/**
 * Human labels for the permission checkboxes.
 *
 * Kept beside the permissions themselves so a new permission and its label are
 * added in one place; a permission with no entry falls back to its key.
 */
export const PERMISSION_LABELS: Record<string, string> = {
  'citizen.create': 'Create Citizens',
  'citizen.approve': 'Approve Citizens',
  'citizen.view': 'View Citizens',
  'citizen.edit': 'Edit Citizens',
  'certificate.create': 'Create Certificates',
  'certificate.approve': 'Approve Certificates',
  'certificate.view': 'View Certificates',
  'tax.create': 'Create Tax',
  'tax.collect': 'Collect Tax',
  'tax.view': 'View Tax',
  'payment.collect': 'Collect Payments',
  'payment.view': 'View Payments',
  'relief.manage': 'Manage Relief',
  'relief.view': 'View Relief',
  'cashbook.view': 'View Cashbook',
  'warish.create': 'Create Warish',
  'warish.approve': 'Approve Warish',
  'user.manage': 'Manage Users',
  'settings.manage': 'Manage System Settings',
  'audit.view': 'View Audit Logs',
  'template.manage': 'Manage Certificate Templates',
}
