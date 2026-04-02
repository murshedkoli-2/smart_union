import type { Role } from '@/constants/roles'

export interface JwtAccessPayload {
  sub: string // user._id as string
  role: Role
  permissions: string[]
  iat: number
  exp: number
}

export interface JwtRefreshPayload {
  sub: string
  iat: number
  exp: number
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  name: string
  email: string
  password: string
  mobile?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  accessToken: string
  user: {
    _id: string
    name: string
    email: string
    role: Role
    permissions: string[]
    status: string
  }
}
