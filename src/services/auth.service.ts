import mongoose from 'mongoose'
import User, { IUser } from '@/models/User'
import Citizen from '@/models/Citizen'
import { hashPassword, comparePassword, hashToken, compareToken } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { LoginSchema, RegisterSchema, CreateCitizenSchema } from '@/lib/utils/validators'
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import type { AuthResponse, AuthTokens, LoginDto, RegisterDto } from '@/types/auth.types'
import type { JwtAccessPayload } from '@/types/auth.types'

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(dto: RegisterDto & { citizen_data?: unknown }, actor?: JwtAccessPayload) {
  // 1. Validate user credentials
  const parsed = RegisterSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }
  const { name, email, password, mobile } = parsed.data

  // 2. Validate citizen data if provided
  let citizenParsed: ReturnType<typeof CreateCitizenSchema.safeParse> | null = null
  if (dto.citizen_data) {
    citizenParsed = CreateCitizenSchema.safeParse(dto.citizen_data)
    if (!citizenParsed.success) {
      throw new ValidationError('Citizen data validation failed', citizenParsed.error.flatten().fieldErrors)
    }
  }

  // 3. Email uniqueness
  const existing = await User.findOne({ email })
  if (existing) {
    throw new ConflictError('An account with this email already exists')
  }

  // 4. Check mobile uniqueness for citizen data
  if (citizenParsed?.success) {
    const existingCitizen = await Citizen.findOne({ mobile: citizenParsed.data.mobile })
    if (existingCitizen) {
      throw new ConflictError('A citizen with this mobile number already exists')
    }
  }

  // 5. Hash password
  const hashedPassword = await hashPassword(password)

  // 6. Determine status — admin/secretary creates active; self-register = pending
  const isCreatedByAdmin =
    actor?.role === 'secretary' || actor?.role === 'entrepreneur'
  const status = isCreatedByAdmin ? 'active' : 'pending'

  // 7. Create user
  const createData: Partial<IUser> = {
    name,
    email,
    password: hashedPassword,
    role: 'citizen' as 'citizen',
    permissions: [],
    status,
    mobile,
  }
  if (actor?.sub) {
    createData.created_by = new mongoose.Types.ObjectId(actor.sub)
  }

  const user = await User.create(createData)
  const userId = user._id as mongoose.Types.ObjectId

  // 8. Create citizen record if citizen_data provided
  let citizen = null
  if (citizenParsed?.success) {
    const cData = citizenParsed.data
    const citizenDoc: Record<string, unknown> = {
      ...cData,
      date_of_birth: new Date(cData.date_of_birth),
      ward_no: cData.address.ward_no,
      status: 'pending',
      user_id: userId,
      created_by: userId,
    }
    if (!citizenDoc.holding_no) delete citizenDoc.holding_no
    if (!citizenDoc.nid_no) delete citizenDoc.nid_no
    if (!citizenDoc.birth_cert_no) delete citizenDoc.birth_cert_no

    citizen = await Citizen.create(citizenDoc)

    await createAuditLog({
      user_id: userId,
      user_role: 'citizen',
      action: 'citizen.create',
      target_model: 'Citizen',
      target_id: citizen._id as mongoose.Types.ObjectId,
      status: 'success',
    })
  }

  // 9. Audit log for user registration
  await createAuditLog({
    user_id: actor?.sub ?? userId,
    user_role: actor?.role ?? 'citizen',
    action: 'user.register',
    target_model: 'User',
    target_id: userId,
    status: 'success',
  })

  // 10. Return user without sensitive fields
  const userObj = user.toObject() as unknown as Record<string, unknown>
  delete userObj.password
  delete userObj.refresh_token
  return { user: userObj, citizen: citizen?.toObject() ?? null }
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string }> {
  // 1. Validate
  const parsed = LoginSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }
  const { email, password } = parsed.data

  // 2. Find user — use generic error message to prevent email oracle
  const user = await User.findOne({ email }).select('+password +refresh_token')
  const genericError = new UnauthorizedError('Invalid email or password')

  if (!user) throw genericError
  if (user.status === 'pending') {
    throw new UnauthorizedError('Your account is pending approval')
  }
  if (user.status === 'inactive') {
    throw new UnauthorizedError('Your account has been deactivated')
  }

  // 3. Password check
  const isMatch = await comparePassword(password, user.password)
  if (!isMatch) throw genericError

  // 4. Update last_login
  user.last_login = new Date()

  // 5. Sign tokens
  const userId = (user._id as mongoose.Types.ObjectId).toString()
  const tokenPayload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
    sub: userId,
    role: user.role,
    permissions: user.permissions,
  }
  const accessToken = signAccessToken(tokenPayload)
  const refreshToken = signRefreshToken({ sub: userId })

  // 6. Hash and store refresh token
  user.refresh_token = await hashToken(refreshToken)
  await user.save()

  // 7. Audit log
  const userObjId = user._id as mongoose.Types.ObjectId
  await createAuditLog({
    user_id: userObjId,
    user_role: user.role,
    action: 'user.login',
    target_model: 'User',
    target_id: userObjId,
    status: 'success',
  })

  return {
    accessToken,
    refreshToken,
    user: {
      _id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
    },
  }
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export async function refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
  // 1. Verify JWT signature
  const payload = verifyRefreshToken(rawRefreshToken)

  // 2. Find user
  const user = await User.findById(payload.sub).select('+refresh_token')
  if (!user || !user.refresh_token) {
    throw new UnauthorizedError('Invalid refresh token')
  }
  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active')
  }

  // 3. Revocation check
  const isValid = await compareToken(rawRefreshToken, user.refresh_token)
  if (!isValid) {
    // Possible token theft — invalidate stored token
    user.refresh_token = undefined
    await user.save()
    throw new UnauthorizedError('Refresh token has been revoked')
  }

  // 4. Rotate tokens
  const userId = (user._id as mongoose.Types.ObjectId).toString()
  const newAccessToken = signAccessToken({
    sub: userId,
    role: user.role,
    permissions: user.permissions,
  })
  const newRefreshToken = signRefreshToken({ sub: userId })

  user.refresh_token = await hashToken(newRefreshToken)
  await user.save()

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function logout(userId: string): Promise<void> {
  const user = await User.findById(userId)
  if (!user) throw new NotFoundError('User not found')

  user.refresh_token = undefined
  await user.save()

  await createAuditLog({
    user_id: userId,
    user_role: user.role,
    action: 'user.logout',
    target_model: 'User',
    target_id: user._id as mongoose.Types.ObjectId,
    status: 'success',
  })
}
