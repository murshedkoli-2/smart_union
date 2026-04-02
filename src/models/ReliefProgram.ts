import mongoose, { Schema, Document, Model } from 'mongoose'

export type ReliefProgramType = 'vgd' | 'vgf' | 'tr' | 'kabikha' | 'other'

export interface IReliefProgram extends Document {
  name: string
  description?: string
  program_type: ReliefProgramType
  fiscal_year: string
  total_budget?: number
  is_active: boolean
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ReliefProgramSchema = new Schema<IReliefProgram>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    program_type: {
      type: String,
      enum: ['vgd', 'vgf', 'tr', 'kabikha', 'other'],
      required: true,
    },
    fiscal_year: { type: String, required: true },
    total_budget: { type: Number, default: null, min: 0 },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

ReliefProgramSchema.index({ fiscal_year: 1, is_active: 1 })

const ReliefProgram: Model<IReliefProgram> =
  mongoose.models.ReliefProgram ??
  mongoose.model<IReliefProgram>('ReliefProgram', ReliefProgramSchema)

export default ReliefProgram
