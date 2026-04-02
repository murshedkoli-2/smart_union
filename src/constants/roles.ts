export const ROLES = {
  SECRETARY: 'secretary',
  ENTREPRENEUR: 'entrepreneur',
  CITIZEN: 'citizen',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
