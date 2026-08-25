import type mongoose from 'mongoose'
import type { ClientSession } from 'mongoose'
import AuditLog from '@/models/AuditLog'
import { containsFilter } from '@/lib/utils/mongo-query'
import { getRequestContext } from '@/lib/observability/request-context'
import type { Role } from '@/constants/roles'
import { clampPagination } from '@/lib/utils/pagination'

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
 *
 * IP and user agent are taken from the ambient request context when the caller
 * does not supply them, so every entry made on the request path is attributable
 * without each service having to accept a request object.
 *
 * Failure handling depends on whether a transaction is in play:
 *
 * - With a `session`, the entry is part of the atomic unit and failures
 *   propagate. A committed change that lost its audit record is exactly what
 *   an accountability system must not produce, so the whole operation rolls
 *   back instead.
 *
 * - Without a session there is nothing to roll back to, so a failure is
 *   swallowed rather than turning a completed write into a 500 for the user.
 *   It is logged under a grep-able marker — wire AUDIT_WRITE_FAILED into
 *   whatever alerting the deployment has, because silent audit loss is the
 *   failure mode this whole subsystem exists to prevent.
 */
export async function createAuditLog(
  params: AuditLogParams,
  session?: ClientSession,
): Promise<void> {
  const context = getRequestContext()

  const doc: Record<string, unknown> = {
    user_id: params.user_id,
    user_role: params.user_role,
    action: params.action,
    target_model: params.target_model,
    status: params.status ?? 'success',
  }
  if (params.target_id != null) doc.target_id = params.target_id
  if (params.changes != null) doc.changes = params.changes

  const ipAddress = params.ip_address ?? context?.ip
  const userAgent = params.user_agent ?? context?.userAgent
  if (ipAddress) doc.ip_address = ipAddress
  if (userAgent) doc.user_agent = userAgent
  if (params.error_message) doc.error_message = params.error_message

  try {
    await AuditLog.create([doc], session ? { session } : {})
  } catch (err) {
    if (session) throw err
    console.error(
      `AUDIT_WRITE_FAILED action=${params.action} target=${params.target_model}:${String(params.target_id)} actor=${String(params.user_id)}`,
      err,
    )
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
  } = query
  const { page, limit } = clampPagination(query)

  const filter: Record<string, unknown> = {}
  if (user_id) filter.user_id = user_id
  // Escaped so the filter cannot be turned into an attacker-supplied regex.
  const actionFilter = containsFilter(action)
  if (actionFilter) filter.action = actionFilter
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
