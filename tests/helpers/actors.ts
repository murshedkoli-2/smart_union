import mongoose from 'mongoose'
import type { JwtAccessPayload } from '@/types/auth.types'
import type { Role } from '@/constants/roles'
import type { Permission } from '@/constants/permissions'

/**
 * Builds the decoded-JWT payload that services receive as `actor`.
 *
 * iat/exp are part of the type because services get a verified token, so the
 * factory fills them in rather than making every test restate them.
 */
export function makeActor(role: Role, permissions: Permission[] = []): JwtAccessPayload {
  const now = Math.floor(Date.now() / 1000)
  return {
    sub: new mongoose.Types.ObjectId().toString(),
    role,
    permissions,
    iat: now,
    exp: now + 900,
  }
}
