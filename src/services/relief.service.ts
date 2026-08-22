import mongoose from 'mongoose'
import ReliefProgram, { type IReliefProgram } from '@/models/ReliefProgram'
import ReliefList, { type IReliefList } from '@/models/ReliefList'
import ReliefBeneficiary, { type IReliefBeneficiary } from '@/models/ReliefBeneficiary'
import Citizen from '@/models/Citizen'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
  ConflictError,
} from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import type { JwtAccessPayload } from '@/types/auth.types'

// ── Create Program ────────────────────────────────────────────────────────────

export async function createProgram(dto: unknown, actor: JwtAccessPayload) {
  const body = dto as Record<string, unknown>

  if (!body.name || !body.program_type || !body.fiscal_year) {
    throw new ValidationError('name, program_type, and fiscal_year are required')
  }

  const programData: Partial<IReliefProgram> = {
    name: body.name as string,
    program_type: body.program_type as IReliefProgram['program_type'],
    fiscal_year: body.fiscal_year as string,
    is_active: body.is_active !== undefined ? (body.is_active as boolean) : true,
    created_by: new mongoose.Types.ObjectId(actor.sub),
  }
  if (body.description) programData.description = body.description as string
  if (body.total_budget !== undefined && body.total_budget !== null) {
    programData.total_budget = body.total_budget as number
  }
  const program = await ReliefProgram.create(programData)

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.program.create',
    target_model: 'ReliefProgram',
    target_id: program._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return program.toObject()
}

// ── List Programs ─────────────────────────────────────────────────────────────

export async function listPrograms(
  query: {
    fiscal_year?: string
    program_type?: string
    is_active?: boolean
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  const { fiscal_year, program_type, is_active, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (fiscal_year) filter.fiscal_year = fiscal_year
  if (program_type) filter.program_type = program_type
  if (is_active !== undefined) filter.is_active = is_active

  const skip = (page - 1) * limit
  const [programs, total] = await Promise.all([
    ReliefProgram.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ReliefProgram.countDocuments(filter),
  ])

  return { programs, total, page, limit }
}

// ── Get Program By ID ─────────────────────────────────────────────────────────

export async function getProgramById(id: string, _actor: JwtAccessPayload) {
  const program = await ReliefProgram.findById(id).lean()
  if (!program) throw new NotFoundError('Relief program not found')
  return program
}

// ── Update Program ────────────────────────────────────────────────────────────

export async function updateProgram(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  const program = await ReliefProgram.findById(id)
  if (!program) throw new NotFoundError('Relief program not found')

  const allowedFields = ['name', 'description', 'total_budget', 'is_active']
  const body = dto as Record<string, unknown>
  const before = program.toObject()

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (program as unknown as Record<string, unknown>)[field] = body[field]
    }
  }

  await program.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.program.update',
    target_model: 'ReliefProgram',
    target_id: program._id as mongoose.Types.ObjectId,
    changes: { before, after: program.toObject() },
    status: 'success',
  })

  return program.toObject()
}

// ── Create List ───────────────────────────────────────────────────────────────

export async function createList(dto: unknown, actor: JwtAccessPayload) {
  const body = dto as Record<string, unknown>

  if (!body.program_id || !body.list_name) {
    throw new ValidationError('program_id and list_name are required')
  }

  const program = await ReliefProgram.findById(body.program_id).lean()
  if (!program) throw new NotFoundError('Relief program not found')

  const listData: Partial<IReliefList> = {
    program_id: new mongoose.Types.ObjectId(body.program_id as string),
    list_name: body.list_name as string,
    status: 'draft',
    created_by: new mongoose.Types.ObjectId(actor.sub),
  }
  if (body.ward_no !== undefined && body.ward_no !== null) {
    listData.ward_no = body.ward_no as number
  }
  if (body.max_beneficiaries !== undefined && body.max_beneficiaries !== null) {
    listData.max_beneficiaries = body.max_beneficiaries as number
  }
  const list = await ReliefList.create(listData)

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.list.create',
    target_model: 'ReliefList',
    target_id: list._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return list.toObject()
}

// ── List Lists ────────────────────────────────────────────────────────────────

export async function listLists(
  query: {
    program_id?: string
    status?: string
    ward_no?: number
    page?: number
    limit?: number
  },
  _actor: JwtAccessPayload,
) {
  const { program_id, status, ward_no, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (program_id) filter.program_id = new mongoose.Types.ObjectId(program_id)
  if (status) filter.status = status
  if (ward_no) filter.ward_no = ward_no

  const skip = (page - 1) * limit
  const [lists, total] = await Promise.all([
    ReliefList.find(filter)
      .populate('program_id', 'name program_type fiscal_year')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReliefList.countDocuments(filter),
  ])

  return { lists, total, page, limit }
}

// ── Get List By ID ────────────────────────────────────────────────────────────

export async function getListById(id: string, _actor: JwtAccessPayload) {
  const list = await ReliefList.findById(id)
    .populate('program_id', 'name program_type fiscal_year')
    .populate('approved_by', 'name email')
    .lean()
  if (!list) throw new NotFoundError('Relief list not found')
  return list
}

// ── Update List ───────────────────────────────────────────────────────────────

export async function updateList(
  id: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  const list = await ReliefList.findById(id)
  if (!list) throw new NotFoundError('Relief list not found')

  if (list.status === 'locked') {
    throw new BadRequestError('Cannot edit a locked relief list')
  }

  const allowedFields = ['list_name', 'ward_no', 'max_beneficiaries']
  const body = dto as Record<string, unknown>
  const before = list.toObject()

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (list as unknown as Record<string, unknown>)[field] = body[field]
    }
  }

  await list.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.list.update',
    target_model: 'ReliefList',
    target_id: list._id as mongoose.Types.ObjectId,
    changes: { before, after: list.toObject() },
    status: 'success',
  })

  return list.toObject()
}

// ── Approve List ──────────────────────────────────────────────────────────────

export async function approveList(id: string, actor: JwtAccessPayload) {
  const list = await ReliefList.findById(id)
  if (!list) throw new NotFoundError('Relief list not found')

  if (list.status !== 'draft') {
    throw new BadRequestError('Relief list must be in draft status to approve')
  }

  list.status = 'approved'
  list.approved_by = new mongoose.Types.ObjectId(actor.sub)
  list.approved_at = new Date()
  await list.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.list.approve',
    target_model: 'ReliefList',
    target_id: list._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return list.toObject()
}

// ── Lock List ─────────────────────────────────────────────────────────────────

export async function lockList(id: string, actor: JwtAccessPayload) {
  const list = await ReliefList.findById(id)
  if (!list) throw new NotFoundError('Relief list not found')

  if (list.status !== 'approved') {
    throw new BadRequestError('Relief list must be approved before it can be locked')
  }

  list.status = 'locked'
  list.locked_at = new Date()
  await list.save()

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.list.lock',
    target_model: 'ReliefList',
    target_id: list._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return list.toObject()
}

// ── Add Beneficiary ───────────────────────────────────────────────────────────

export async function addBeneficiary(
  listId: string,
  dto: unknown,
  actor: JwtAccessPayload,
) {
  const list = await ReliefList.findById(listId).lean()
  if (!list) throw new NotFoundError('Relief list not found')

  // Cannot add to locked list
  if (list.status === 'locked') {
    throw new BadRequestError('Cannot add beneficiaries to a locked relief list')
  }

  const body = dto as Record<string, unknown>
  if (!body.citizen_id || !body.ward_no) {
    throw new ValidationError('citizen_id and ward_no are required')
  }

  const citizenId = body.citizen_id as string
  const programId = list.program_id.toString()

  // Verify citizen exists
  const citizen = await Citizen.findById(citizenId).lean()
  if (!citizen) throw new NotFoundError('Citizen not found')

  // Check duplicate: citizen cannot appear twice in same program.
  // Removed beneficiaries are excluded by the soft-delete query hooks, so a
  // citizen who was removed can be added back.
  const duplicate = await ReliefBeneficiary.findOne({
    program_id: new mongoose.Types.ObjectId(programId),
    citizen_id: new mongoose.Types.ObjectId(citizenId),
  }).lean()
  if (duplicate) {
    throw new ConflictError('This citizen is already a beneficiary in this program')
  }

  const beneficiaryData: Partial<IReliefBeneficiary> = {
    relief_list_id: new mongoose.Types.ObjectId(listId),
    program_id: new mongoose.Types.ObjectId(programId),
    citizen_id: new mongoose.Types.ObjectId(citizenId),
    ward_no: body.ward_no as number,
    added_by: new mongoose.Types.ObjectId(actor.sub),
  }
  if (body.allocation_amount !== undefined && body.allocation_amount !== null) {
    beneficiaryData.allocation_amount = body.allocation_amount as number
  }
  if (body.notes) beneficiaryData.notes = body.notes as string
  const beneficiary = await ReliefBeneficiary.create(beneficiaryData)

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.beneficiary.add',
    target_model: 'ReliefBeneficiary',
    target_id: beneficiary._id as mongoose.Types.ObjectId,
    status: 'success',
  })

  return beneficiary.toObject()
}

// ── Remove Beneficiary ────────────────────────────────────────────────────────

export async function removeBeneficiary(
  beneficiaryId: string,
  actor: JwtAccessPayload,
) {
  const beneficiary = await ReliefBeneficiary.findById(beneficiaryId)
  if (!beneficiary) throw new NotFoundError('Beneficiary not found')

  // Check if list is locked
  const list = await ReliefList.findById(beneficiary.relief_list_id).lean()
  if (!list) throw new NotFoundError('Relief list not found')
  if (list.status === 'locked') {
    throw new BadRequestError('Cannot remove beneficiaries from a locked relief list')
  }

  await ReliefBeneficiary.findByIdAndUpdate(beneficiaryId, { deleted_at: new Date() })

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'relief.beneficiary.remove',
    target_model: 'ReliefBeneficiary',
    target_id: new mongoose.Types.ObjectId(beneficiaryId),
    status: 'success',
  })

  return { deleted: true }
}

// ── List Beneficiaries ────────────────────────────────────────────────────────

export async function listBeneficiaries(
  listId: string,
  query: { ward_no?: number; page?: number; limit?: number },
  _actor: JwtAccessPayload,
) {
  const list = await ReliefList.findById(listId).lean()
  if (!list) throw new NotFoundError('Relief list not found')

  const { ward_no, page = 1, limit = 20 } = query
  const filter: Record<string, unknown> = {
    relief_list_id: new mongoose.Types.ObjectId(listId),
  }
  if (ward_no) filter.ward_no = ward_no

  const skip = (page - 1) * limit

  // withDeleted on purpose: this listing shows removed beneficiaries greyed
  // out so an officer can see who was taken off a list and when. Everywhere
  // else — duplicate checks, counts — removed rows stay hidden.
  const [beneficiaries, total] = await Promise.all([
    ReliefBeneficiary.find(filter)
      .setOptions({ withDeleted: true })
      .populate('citizen_id', 'name_bn name_en mobile address holding_no')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReliefBeneficiary.countDocuments(filter).setOptions({ withDeleted: true }),
  ])

  return {
    // The UI renders an Active/Removed badge off `deleted`; keep that contract
    // rather than leaking the timestamp field name into the client.
    beneficiaries: beneficiaries.map((b) => ({ ...b, deleted: b.deleted_at != null })),
    total,
    page,
    limit,
  }
}
