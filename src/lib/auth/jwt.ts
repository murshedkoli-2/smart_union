import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '@/lib/utils/errors'
import type { JwtAccessPayload, JwtRefreshPayload } from '@/types/auth.types'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn']
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ?? '7d') as jwt.SignOptions['expiresIn']

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined')
}

export function signAccessToken(
  payload: Omit<JwtAccessPayload, 'iat' | 'exp'>,
): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY })
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY })
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtAccessPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtRefreshPayload
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }
}

export function decodeWithoutVerify(token: string): JwtAccessPayload | null {
  try {
    return jwt.decode(token) as JwtAccessPayload
  } catch {
    return null
  }
}
