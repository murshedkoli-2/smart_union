import type mongoose from 'mongoose'
import User from '@/models/User'
import { hashPassword, comparePassword } from '@/lib/auth/password'
import { CreateAdminSchema, UpdateUserPermissionsSchema, UpdateProfileSchema } from '@/lib/utils/validators'
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import type { JwtAccessPayload } from '@/types/auth.types'
import { ROLES } from '@/constants/roles'

// ── Create Admin ──────────────────────────────────────────────────────────────

export async function createAdmin(dto: unknown, actor: JwtAccessPayload) {
  // Only secretary can create admins
  if (actor.role !== ROLES.SECRETARY) {
    throw new ForbiddenError('Only secretary can create entrepreneur accounts')
  }

  const parsed = CreateAdminSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }
  const { name, email, password, mobile, permissions } = parsed.data

  const existing = await User.findOne({ email })
  if (existing) throw new ConflictError('An account with this email already exists')

  const hashedPassword = await hashPassword(password)

  const admin = await User.create({
    name,
    email,
    password: hashedPassword,
    role: ROLES.ENTREPRENEUR,
    permissions,
    status: 'active',
    mobile,
    created_by: actor.sub,
  })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'user.create_admin',
    target_model: 'User',
    target_id: admin._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  const { password: _p, refresh_token: _rt, ...safeAdmin } = admin.toObject()
  return safeAdmin
}

// ── List Users ────────────────────────────────────────────────────────────────

export async function listUsers(
  query: { role?: string; status?: string; page?: number; limit?: number },
  actor: JwtAccessPayload,
) {
  // Only secretary can list users
  if (actor.role !== ROLES.SECRETARY) {
    throw new ForbiddenError('Access denied')
  }

  const { role, status, page = 1, limit = 20 } = query
  const filter: Record<string, unknown> = { role: { $nin: [ROLES.SECRETARY, ROLES.CITIZEN] } }
  if (role && role !== ROLES.SECRETARY && role !== ROLES.CITIZEN) filter.role = role
  if (status) filter.status = status

  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ])

  return { users, total, page, limit }
}

// ── Get User ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string, actor: JwtAccessPayload) {
  // Users can only view their own profile; admins can view all
  if (actor.role === ROLES.CITIZEN && actor.sub !== id) {
    throw new ForbiddenError('Access denied')
  }

  const user = await User.findById(id).lean()
  if (!user) throw new NotFoundError('User not found')

  return user
}

// ── Update Permissions ────────────────────────────────────────────────────────

export async function updateAdminPermissions(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  if (actor.role !== ROLES.SECRETARY) {
    throw new ForbiddenError('Only secretary can modify permissions')
  }

  const parsed = UpdateUserPermissionsSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const user = await User.findById(id)
  if (!user) throw new NotFoundError('User not found')
  if (user.role !== ROLES.ENTREPRENEUR) {
    throw new ForbiddenError('Can only update permissions for admin users')
  }

  const before = { permissions: user.permissions }
  user.permissions = parsed.data.permissions
  await user.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'user.update_permissions',
    target_model: 'User',
    target_id: user._id as mongoose.Types.ObjectId,
    changes: { before, after: { permissions: user.permissions } },
    status: 'success',
  })

  return user.toObject()
}

// ── Update Profile ────────────────────────────────────────────────────────────

export async function updateProfile(dto: unknown, actor: JwtAccessPayload) {
  const parsed = UpdateProfileSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const user = await User.findById(actor.sub).select('+password')
  if (!user) throw new NotFoundError('User not found')

  const { name, mobile, current_password, new_password } = parsed.data

  if (new_password) {
    if (!current_password) {
      throw new ValidationError('Validation failed', { current_password: ['Current password is required to set a new password'] })
    }
    const isValid = await comparePassword(current_password, user.password)
    if (!isValid) {
      throw new ForbiddenError('Incorrect current password')
    }
    user.password = await hashPassword(new_password)
  }

  user.name = name
  if (mobile !== undefined) user.mobile = mobile

  await user.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'user.update_profile',
    target_model: 'User',
    target_id: user._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  const { password: _p, refresh_token: _rt, ...safeUser } = user.toObject()
  return safeUser
}

// ── Activate / Deactivate ────────────────────────────────────────────────────

export async function updateUserStatus(
  id: string,
  newStatus: 'active' | 'inactive',
  actor: JwtAccessPayload,
) {
  if (actor.role !== ROLES.SECRETARY) {
    throw new ForbiddenError('Only secretary can change user status')
  }

  const user = await User.findById(id)
  if (!user) throw new NotFoundError('User not found')
  if (user.role === ROLES.SECRETARY && newStatus === 'inactive') {
    throw new ForbiddenError('Cannot deactivate secretary')
  }

  const before = { status: user.status }
  user.status = newStatus
  if (newStatus === 'inactive') {
    user.refresh_token = undefined
  }
  await user.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: `user.${newStatus === 'active' ? 'activate' : 'deactivate'}`,
    target_model: 'User',
    target_id: user._id as mongoose.Types.ObjectId,
    changes: { before, after: { status: newStatus } },
    status: 'success',
  })

  return user.toObject()
}

// ── Approve Pending User ──────────────────────────────────────────────────────

export async function approveUser(id: string, actor: JwtAccessPayload) {
  if (actor.role !== ROLES.SECRETARY && actor.role !== ROLES.ENTREPRENEUR) {
    throw new ForbiddenError('Access denied')
  }

  const user = await User.findById(id)
  if (!user) throw new NotFoundError('User not found')
  if (user.status !== 'pending') {
    throw new ForbiddenError('User is not in pending status')
  }

  user.status = 'active'
  await user.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'user.approve',
    target_model: 'User',
    target_id: user._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return user.toObject()
}
