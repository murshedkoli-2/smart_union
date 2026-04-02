import mongoose, { Schema, Document, Model } from 'mongoose'

export type ReliefListStatus = 'draft' | 'approved' | 'locked'

export interface IReliefList extends Document {
  program_id: mongoose.Types.ObjectId
  list_name: string
  ward_no?: number
  max_beneficiaries?: number
  status: ReliefListStatus
  approved_by?: mongoose.Types.ObjectId
  approved_at?: Date
  locked_at?: Date
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ReliefListSchema = new Schema<IReliefList>(
  {
    program_id: { type: Schema.Types.ObjectId, ref: 'ReliefProgram', required: true },
    list_name: { type: String, required: true, trim: true },
    ward_no: { type: Number, default: null, min: 1, max: 9 },
    max_beneficiaries: { type: Number, default: null, min: 1 },
    status: {
      type: String,
      enum: ['draft', 'approved', 'locked'],
      default: 'draft',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    locked_at: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

ReliefListSchema.index({ program_id: 1 })
ReliefListSchema.index({ status: 1 })

const ReliefList: Model<IReliefList> =
  mongoose.models.ReliefList ??
  mongoose.model<IReliefList>('ReliefList', ReliefListSchema)

export default ReliefList
