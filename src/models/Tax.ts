import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITax extends Document {
  citizen_id: mongoose.Types.ObjectId
  holding_no: string
  fiscal_year: string
  amount: number
  status: 'unpaid' | 'paid'
  payment_id?: mongoose.Types.ObjectId
  paid_at?: Date
  assessed_by: mongoose.Types.ObjectId
  created_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TaxSchema = new Schema<ITax>(
  {
    citizen_id: { type: Schema.Types.ObjectId, ref: 'Citizen', required: true },
    holding_no: { type: String, required: true },
    fiscal_year: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    paid_at: { type: Date, default: null },
    assessed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

// CRITICAL: ONE tax record per citizen per fiscal year
TaxSchema.index({ citizen_id: 1, fiscal_year: 1 }, { unique: true })
TaxSchema.index({ holding_no: 1, fiscal_year: 1 })
TaxSchema.index({ status: 1 })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Tax
}

const Tax: Model<ITax> =
  mongoose.models.Tax ?? mongoose.model<ITax>('Tax', TaxSchema)

// Drop stale indexes left over from old schema versions
Tax.collection.dropIndex('family_id_1_fiscal_year_1').catch(() => {})

export default Tax
