import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICashbook extends Document {
  entry_type: 'income' | 'expense'
  source: 'certificate' | 'tax' | 'other'
  amount: number
  reference_id: mongoose.Types.ObjectId
  reference_type: 'Payment' | 'Tax' | 'Certificate'
  description: string
  fiscal_year: string
  recorded_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CashbookSchema = new Schema<ICashbook>(
  {
    entry_type: { type: String, enum: ['income', 'expense'], required: true },
    source: { type: String, enum: ['certificate', 'tax', 'other'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reference_id: { type: Schema.Types.ObjectId, required: true },
    reference_type: {
      type: String,
      enum: ['Payment', 'Tax', 'Certificate'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    fiscal_year: { type: String, required: true },
    recorded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

CashbookSchema.index({ fiscal_year: 1, entry_type: 1 })
CashbookSchema.index({ source: 1 })
CashbookSchema.index({ reference_id: 1 })
CashbookSchema.index({ createdAt: -1 })

const Cashbook: Model<ICashbook> =
  mongoose.models.Cashbook ?? mongoose.model<ICashbook>('Cashbook', CashbookSchema)

export default Cashbook
