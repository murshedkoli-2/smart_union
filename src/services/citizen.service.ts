import mongoose from 'mongoose'
import Citizen from '@/models/Citizen'
import { CreateCitizenSchema } from '@/lib/utils/validators'
import { escapeRegex } from '@/lib/utils/mongo-query'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  ForbiddenError
} from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import type { JwtAccessPayload } from '@/types/auth.types'

// ── Create Citizen ────────────────────────────────────────────────────────────

export async function createCitizen(dto: unknown, actor: JwtAccessPayload) {
  const parsed = CreateCitizenSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data
  // Admin/secretary creates citizens as approved; others are pending
  const isAdmin = actor.role === 'secretary' || actor.role === 'entrepreneur'
  const status = isAdmin ? 'approved' : 'pending'

  const citizenData: Record<string, unknown> = {
    ...data,
    date_of_birth: new Date(data.date_of_birth),
    ward_no: data.address.ward_no,
    status,
    created_by: new mongoose.Types.ObjectId(actor.sub),
  }

  if (isAdmin) {
    citizenData.approved_by = new mongoose.Types.ObjectId(actor.sub)
    citizenData.approved_at = new Date()
  } else if (actor.role === 'citizen') {
    citizenData.user_id = new mongoose.Types.ObjectId(actor.sub)
  }

  if (!citizenData.holding_no) delete citizenData.holding_no
  if (!citizenData.nid_no) delete citizenData.nid_no
  if (!citizenData.birth_cert_no) delete citizenData.birth_cert_no

  const citizen = await Citizen.create(citizenData)

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'citizen.create',
    target_model: 'Citizen',
    target_id: citizen._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return citizen.toObject()
}

// ── List Citizens ─────────────────────────────────────────────────────────────

/**
 * Builds an index-usable filter for the citizen search box.
 *
 * The old filter was an unanchored `$regex` with `$options: 'i'` across four
 * fields, which forces a full collection scan on every keystroke — MongoDB
 * cannot use an index for a case-insensitive or unanchored pattern.
 *
 * Two branches replace it, split on what the operator actually typed:
 *
 *  - Digits (a mobile number or NID) become an anchored prefix match. Case
 *    folding is meaningless for digits, so dropping `'i'` lets the mobile and
 *    nid_no indexes serve the query.
 *  - Anything else goes to the `citizen_name_text` text index on the two name
 *    fields.
 *
 * Input is still escaped in the regex branch: it reaches a regex engine, so
 * metacharacters would otherwise let a caller match records they never named
 * and stall the query thread (ReDoS).
 */
function buildCitizenSearchFilter(search: string | undefined): Record<string, unknown> {
  const term = search?.trim()
  if (!term) return {}

  if (/^\d+$/.test(term)) {
    const prefix = { $regex: `^${escapeRegex(term)}` }
    return { $or: [{ mobile: prefix }, { nid_no: prefix }] }
  }

  return { $text: { $search: term } }
}

export async function listCitizens(
  query: {
    ward_no?: number
    status?: string
    search?: string
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  const { ward_no, status, search, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (ward_no) filter['address.ward_no'] = ward_no
  if (status) filter.status = status
  Object.assign(filter, buildCitizenSearchFilter(search))

  const skip = (page - 1) * limit
  const [citizens, total] = await Promise.all([
    Citizen.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Citizen.countDocuments(filter),
  ])

  return { citizens, total, page, limit }
}

// ── Get Citizen By ID ─────────────────────────────────────────────────────────

export async function getCitizenById(id: string, actor: JwtAccessPayload) {
  let citizen;
  if (id === 'profile' && actor.role === 'citizen') {
    citizen = await Citizen.findOne({ user_id: actor.sub }).lean()
  } else {
    citizen = await Citizen.findById(id).lean()
  }
  if (!citizen) throw new NotFoundError('Citizen not found')

  if (actor.role === 'citizen' && citizen.user_id?.toString() !== actor.sub) {
    throw new ForbiddenError('Access denied')
  }

  return citizen
}

// ── Update Citizen ────────────────────────────────────────────────────────────

export async function updateCitizen(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  let citizen;
  if (id === 'profile' && actor.role === 'citizen') {
    citizen = await Citizen.findOne({ user_id: actor.sub })
  } else {
    citizen = await Citizen.findById(id)
  }
  if (!citizen) throw new NotFoundError('Citizen not found')

  if (actor.role === 'citizen' && citizen.user_id?.toString() !== actor.sub) {
    throw new ForbiddenError('Access denied')
  }

  if (citizen.status === 'approved') {
    // Allow updates only by admin/secretary on approved citizens
    if (actor.role !== 'secretary' && actor.role !== 'entrepreneur') {
      throw new BadRequestError('Cannot edit an approved citizen record')
    }
  }

  const allowedFields = [
    'name_bn', 'name_en', 'father_name_bn', 'father_name_en',
    'mother_name_bn', 'mother_name_en', 'spouse_name_bn', 'spouse_name_en',
    'mobile', 'address', 'housing_info', 'financial_info',
    'nid_no', 'birth_cert_no', 'date_of_birth',
    'blood_group', 'religion', 'marital_status', 'education_level',
  ]

  const before = citizen.toObject()
  const body = dto as Record<string, unknown>

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'date_of_birth') {
        (citizen as unknown as Record<string, unknown>)[field] = new Date(body[field] as string)
      } else {
        const val = body[field]
        if ((field === 'nid_no' || field === 'birth_cert_no' || field === 'holding_no') && !val) {
          (citizen as unknown as Record<string, unknown>)[field] = undefined
        } else {
          (citizen as unknown as Record<string, unknown>)[field] = val
        }
      }
    }
  }

  await citizen.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'citizen.update',
    target_model: 'Citizen',
    target_id: citizen._id as mongoose.Types.ObjectId,
    changes: { before, after: citizen.toObject() },
    status: 'success',
  })

  return citizen.toObject()
}

// ── Approve Citizen ───────────────────────────────────────────────────────────

export async function approveCitizen(id: string, actor: JwtAccessPayload) {
  const citizen = await Citizen.findById(id)
  if (!citizen) throw new NotFoundError('Citizen not found')
  if (citizen.status !== 'pending') {
    throw new BadRequestError('Citizen is not in pending status')
  }

  citizen.status = 'approved'
  citizen.approved_by = new mongoose.Types.ObjectId(actor.sub)
  citizen.approved_at = new Date()
  await citizen.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'citizen.approve',
    target_model: 'Citizen',
    target_id: citizen._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return citizen.toObject()
}

// ── Reject Citizen ────────────────────────────────────────────────────────────

export async function rejectCitizen(
  id: string,
  dto: { reason?: string },
  actor: JwtAccessPayload,
) {
  const citizen = await Citizen.findById(id)
  if (!citizen) throw new NotFoundError('Citizen not found')
  if (citizen.status !== 'pending') {
    throw new BadRequestError('Citizen is not in pending status')
  }

  citizen.status = 'rejected'
  await citizen.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'citizen.reject',
    target_model: 'Citizen',
    target_id: citizen._id as mongoose.Types.ObjectId,
    changes: { before: { status: 'pending' }, after: { status: 'rejected', reason: dto.reason } },
    status: 'success',
  })

  return citizen.toObject()
}

// ── Delete Citizen ────────────────────────────────────────────────────────────

/**
 * Soft-deletes a citizen.
 *
 * Stamps deleted_at and nothing else. The record keeps its real NID, birth
 * certificate number and holding number — the partial unique indexes exclude
 * deleted rows, so those identifiers are free for reuse without the values
 * being rewritten. Query hooks hide the record from every read path.
 */
export async function deleteCitizen(id: string, actor: JwtAccessPayload) {
  const citizen = await Citizen.findById(id)
  if (!citizen) throw new NotFoundError('Citizen not found')

  const before = citizen.toObject()

  citizen.deleted_at = new Date()
  await citizen.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'citizen.delete',
    target_model: 'Citizen',
    target_id: new mongoose.Types.ObjectId(id),
    changes: { before, after: { deleted_at: citizen.deleted_at } },
    status: 'success',
  })
}
