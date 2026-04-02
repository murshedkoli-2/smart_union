import type mongoose from 'mongoose'
import AuditLog from '@/models/AuditLog'
import type { Role } from '@/constants/roles'

export interface AuditLogParams {
  user_id: string | mongoose.Types.ObjectId
  user_role: Role
  action: string
  target_model: string
  target_id?: mongoose.Types.ObjectId | string | null
  changes?: { before: unknown; after: unknown }
  ip_address?: string
  user_agent?: string
  status?: 'success' | 'failure'
  error_message?: string
}

/**
 * Creates an audit log entry.
 * Called at the END of every state-changing service method — NEVER skip.
 * Failures are logged to console but do not throw to avoid killing the main request.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const doc: Record<string, unknown> = {
      user_id: params.user_id,
      user_role: params.user_role,
      action: params.action,
      target_model: params.target_model,
      status: params.status ?? 'success',
    }
    if (params.target_id != null) doc.target_id = params.target_id
    if (params.changes != null) doc.changes = params.changes
    if (params.ip_address) doc.ip_address = params.ip_address
    if (params.user_agent) doc.user_agent = params.user_agent
    if (params.error_message) doc.error_message = params.error_message

    await AuditLog.create(doc)
  } catch (err) {
    // Audit log failure must never crash the application
    console.error('[AuditLog] Failed to write audit log:', err)
  }
}

export interface AuditLogQuery {
  user_id?: string
  action?: string
  target_model?: string
  target_id?: string
  status?: 'success' | 'failure'
  from?: Date
  to?: Date
  page?: number
  limit?: number
}

export async function getAuditLogs(query: AuditLogQuery) {
  const {
    user_id,
    action,
    target_model,
    target_id,
    status,
    from,
    to,
    page = 1,
    limit = 20,
  } = query

  const filter: Record<string, unknown> = {}
  if (user_id) filter.user_id = user_id
  if (action) filter.action = { $regex: action, $options: 'i' }
  if (target_model) filter.target_model = target_model
  if (target_id) filter.target_id = target_id
  if (status) filter.status = status
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.$gte = from
    if (to) dateFilter.$lte = to
    filter.createdAt = dateFilter
  }

  const skip = (page - 1) * limit
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user_id', 'name email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ])

  return { logs, total, page, limit }
}
