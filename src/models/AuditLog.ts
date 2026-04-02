import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Role } from '@/constants/roles'

export interface IAuditLog extends Document {
  user_id: mongoose.Types.ObjectId
  user_role: Role
  action: string
  target_model: string
  target_id?: mongoose.Types.ObjectId
  changes?: { before: unknown; after: unknown }
  ip_address?: string
  user_agent?: string
  status: 'success' | 'failure'
  error_message?: string
  createdAt: Date
  updatedAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user_role: {
      type: String,
      enum: ['secretary', 'entrepreneur', 'citizen'],
      required: true,
    },
    action: { type: String, required: true },
    target_model: { type: String, required: true },
    target_id: { type: Schema.Types.ObjectId, default: null },
    changes: { type: Schema.Types.Mixed, default: null },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    error_message: { type: String, default: null },
  },
  {
    timestamps: true,
    // Audit logs are NEVER updated or deleted
  },
)

// TTL: 7 years (government compliance requirement)
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 220_752_000 }, // 7 * 365.25 * 24 * 3600
)
AuditLogSchema.index({ user_id: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })
AuditLogSchema.index({ target_id: 1 })

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

export default AuditLog
