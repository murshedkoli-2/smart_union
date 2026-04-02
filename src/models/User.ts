import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Role } from '@/constants/roles'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: Role
  permissions: string[]
  status: 'active' | 'inactive' | 'pending'
  mobile?: string
  refresh_token?: string
  created_by?: mongoose.Types.ObjectId
  last_login?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['secretary', 'entrepreneur', 'citizen'],
      required: true,
      default: 'citizen',
    },
    permissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'pending',
    },
    mobile: { type: String, trim: true },
    refresh_token: { type: String, select: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    last_login: { type: Date, default: null },
  },
  { timestamps: true },
)

UserSchema.index({ role: 1, status: 1 })

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)

export default User
