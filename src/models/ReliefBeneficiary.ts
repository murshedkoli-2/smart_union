import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IReliefBeneficiary extends Document {
  relief_list_id: mongoose.Types.ObjectId
  program_id: mongoose.Types.ObjectId
  citizen_id: mongoose.Types.ObjectId
  ward_no: number
  allocation_amount?: number
  notes?: string
  added_by: mongoose.Types.ObjectId
  deleted?: boolean
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
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// CRITICAL: No duplicate citizen per list
ReliefBeneficiarySchema.index(
  { relief_list_id: 1, citizen_id: 1 },
  { unique: true },
)
// CRITICAL: No duplicate citizen per program across all lists
ReliefBeneficiarySchema.index(
  { program_id: 1, citizen_id: 1 },
  { unique: true },
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
