import mongoose, { Schema, Document, Model } from 'mongoose'

export type PaymentType = 'tax' | 'certificate'
export type PaymentSource = 'tax' | 'certificate_bn' | 'certificate_en' | 'warish' | 'family_certificate'

export interface IPayment extends Document {
  receipt_no: string
  payment_type: PaymentType
  source_type: PaymentSource
  reference_id: mongoose.Types.ObjectId
  amount: number
  payment_method: 'cash'
  paid_by_citizen: mongoose.Types.ObjectId
  collected_by: mongoose.Types.ObjectId
  note?: string
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    receipt_no: { type: String, required: true, unique: true },
    payment_type: { type: String, enum: ['tax', 'certificate'], required: true },
    source_type: {
      type: String,
      enum: ['tax', 'certificate_bn', 'certificate_en', 'warish', 'family_certificate'],
      required: true,
    },
    reference_id: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, enum: ['cash'], default: 'cash' },
    paid_by_citizen: { type: Schema.Types.ObjectId, ref: 'Citizen', required: true },
    collected_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: null, trim: true },
  },
  { timestamps: true },
)

PaymentSchema.index({ reference_id: 1 })
PaymentSchema.index({ payment_type: 1, createdAt: -1 })
PaymentSchema.index({ collected_by: 1 })

const Payment: Model<IPayment> =
  mongoose.models.Payment ?? mongoose.model<IPayment>('Payment', PaymentSchema)

export default Payment
