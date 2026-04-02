import type { Role } from '@/constants/roles'
import type { Permission } from '@/constants/permissions'

export type UserStatus = 'active' | 'inactive' | 'pending'

export interface CreateUserDto {
  name: string
  email: string
  password: string
  role?: Role
  permissions?: Permission[]
  mobile?: string
}

export interface UpdateUserDto {
  name?: string
  mobile?: string
  status?: UserStatus
  permissions?: Permission[]
}
