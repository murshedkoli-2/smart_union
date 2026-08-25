/** Shared shape, filter vocabulary and colouring for the audit log screen. */

export interface AuditLogEntry {
  _id: string
  action: string
  target_model: string
  target_id?: string
  user_id: { _id: string; name: string; role: string } | null
  user_role: string
  status: string
  ip_address: string
  user_agent?: string
  changes?: { before: unknown; after: unknown }
  error_message?: string
  createdAt: string
}

export const TARGET_MODELS = [
  'User',
  'Citizen',
  'Certificate',
  'CertificateTemplate',
  'Tax',
  'Payment',
  'Cashbook',
  'WarishApplication',
  'ReliefProgram',
  'ReliefList',
  'ReliefBeneficiary',
]

export const ACTION_TYPES = [
  'login',
  'logout',
  'register',
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'lock',
  'pay',
]

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  register: 'bg-blue-100 text-blue-700',
  create: 'bg-purple-100 text-purple-700',
  approve: 'bg-teal-100 text-teal-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  reject: 'bg-red-100 text-red-700',
  lock: 'bg-blue-100 text-blue-700',
  pay: 'bg-emerald-100 text-emerald-700',
}

/** Actions are dotted paths like "citizen.approve"; colour by the verb. */
export function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((verb) => String(action).includes(verb)) ?? 'create'
  return ACTION_COLORS[key]
}

export function statusColor(status: string): string {
  return status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}

export interface AuditLogFilters {
  action: string
  target_model: string
  status: string
  date_from: string
  date_to: string
}

export const emptyFilters = (): AuditLogFilters => ({
  action: '',
  target_model: '',
  status: '',
  date_from: '',
  date_to: '',
})

export function countActiveFilters(filters: AuditLogFilters): number {
  return Object.values(filters).filter(Boolean).length
}
