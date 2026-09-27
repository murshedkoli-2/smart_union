import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '@/lib/utils/errors'
import type { JwtAccessPayload, JwtRefreshPayload } from '@/types/auth.types'

const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn']
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ?? '7d') as jwt.SignOptions['expiresIn']

function requireJwtSecrets(): { access: string; refresh: string } {
  const access = process.env.JWT_ACCESS_SECRET
  const refresh = process.env.JWT_REFRESH_SECRET
  if (!access || !refresh) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined')
  }
  return { access, refresh }
}

export function signAccessToken(
  payload: Omit<JwtAccessPayload, 'iat' | 'exp'>,
): string {
  return jwt.sign(payload, requireJwtSecrets().access, { expiresIn: ACCESS_EXPIRY })
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, requireJwtSecrets().refresh, { expiresIn: REFRESH_EXPIRY })
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  const { access } = requireJwtSecrets()
  try {
    return jwt.verify(token, access) as JwtAccessPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const { refresh } = requireJwtSecrets()
  try {
    return jwt.verify(token, refresh) as JwtRefreshPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }
}
