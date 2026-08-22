import mongoose, { Schema, Document, Model } from 'mongoose'
import { softDeletePlugin } from './plugins/soft-delete'

export interface IReliefBeneficiary extends Document {
  relief_list_id: mongoose.Types.ObjectId
  program_id: mongoose.Types.ObjectId
  citizen_id: mongoose.Types.ObjectId
  ward_no: number
  allocation_amount?: number
  notes?: string
  added_by: mongoose.Types.ObjectId
  /** Set when soft-deleted; null on live records. See plugins/soft-delete. */
  deleted_at?: Date | null
  createdAt: Date
  updatedAt: Date
}

const ReliefBeneficiarySchema = new Schema<IReliefBeneficiary>(
  {
    relief_list_id: { type: Schema.Types.ObjectId, ref: 'ReliefList', required: true },
    program_id: { type: Schema.Types.ObjectId, ref: 'ReliefProgram', required: true },
    citizen_id: { type: Schema.Types.ObjectId, ref: 'Citizen', required: true },
    ward_no: { type: Number, required: true, min: 1, max: 9 },
    allocation_amount: { type: Number, default: null, min: 0 },
    notes: { type: String, default: null, trim: true },
    added_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

// Third soft-delete pattern in the codebase (a `deleted: boolean`) replaced by
// the shared one, so removal behaves the same everywhere.
ReliefBeneficiarySchema.plugin(softDeletePlugin)

/**
 * CRITICAL: no duplicate citizen per list, and none per program across lists.
 *
 * Partial on `deleted_at: null` because these were previously plain unique
 * indexes that counted removed rows. The service excluded removed rows from
 * its own duplicate check but the index did not, so removing a beneficiary and
 * adding them back passed validation and then failed with E11000 — the citizen
 * was locked out of that programme permanently, with a raw duplicate-key error
 * as the only symptom.
 *
 * Existing databases must run `npm run migrate-soft-delete`.
 */
ReliefBeneficiarySchema.index(
  { relief_list_id: 1, citizen_id: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } },
)
ReliefBeneficiarySchema.index(
  { program_id: 1, citizen_id: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } },
)
ReliefBeneficiarySchema.index({ citizen_id: 1 })
ReliefBeneficiarySchema.index({ ward_no: 1 })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.ReliefBeneficiary
}

const ReliefBeneficiary: Model<IReliefBeneficiary> =
  mongoose.models.ReliefBeneficiary ??
  mongoose.model<IReliefBeneficiary>('ReliefBeneficiary', ReliefBeneficiarySchema)

export default ReliefBeneficiary
