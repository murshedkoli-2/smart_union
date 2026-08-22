import { z } from 'zod'
import { ALL_PERMISSIONS, type Permission } from '@/constants/permissions'

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * The single password policy for the whole system.
 *
 * Every account-creating or password-changing schema must use this. Admin
 * accounts previously accepted a 6-character password with no complexity
 * requirement — a weaker rule for the more privileged account.
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and a number',
  )

/** Permissions must name a real capability — arbitrary strings are rejected. */
export const PermissionSchema = z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]])

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
})

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: PasswordSchema,
  mobile: z.string().trim().optional(),
})

// ── Citizen ──────────────────────────────────────────────────────────────────

const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')

const CoercedObjectIdSchema = z.preprocess((value) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return value.toString()
  }
  return value
}, ObjectIdSchema)

const AddressSchema = z.object({
  village_bn: z.string().min(1).trim(),
  village_en: z.string().min(1).trim(),
  post_office_bn: z.string().min(1).trim(),
  post_office_en: z.string().min(1).trim(),
  thana_bn: z.string().min(1).trim(),
  thana_en: z.string().min(1).trim(),
  district_bn: z.string().min(1).trim(),
  district_en: z.string().min(1).trim(),
  ward_no: z.number().int().min(1).max(9),
})

export const CreateCitizenSchema = z.object({
  name_bn: z.string().min(2).max(100).trim(),
  name_en: z.string().min(2).max(100).trim(),
  father_name_bn: z.string().min(2).trim(),
  father_name_en: z.string().min(2).trim(),
  mother_name_bn: z.string().min(2).trim(),
  mother_name_en: z.string().min(2).trim(),
  spouse_name_bn: z.string().trim().optional(),
  spouse_name_en: z.string().trim().optional(),
  date_of_birth: z
    .string()
    .refine(
      (v) => !isNaN(Date.parse(v)),
      'Invalid date format — use ISO 8601 (e.g., 1990-01-15)',
    ),
  gender: z.enum(['male', 'female', 'other']),
  nid_no: z.string().trim().optional(),
  birth_cert_no: z.string().trim().optional(),
  mobile: z.string().min(11).max(14).trim(),
  address: AddressSchema,
  housing_info: z
    .object({
      house_type: z.enum(['pucca', 'semi_pucca', 'kutcha', 'jhupri']).optional(),
      ownership_type: z.enum(['own', 'rented', 'others']).optional(),
      total_rooms: z.number().int().positive().optional(),
    })
    .optional(),
  financial_info: z
    .object({
      annual_income: z.number().min(0).optional(),
      occupation: z.string().trim().optional(),
      land_owned_dec: z.number().min(0).optional(),
    })
    .optional(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional(),
  religion: z.enum(['islam', 'hinduism', 'christianity', 'buddhism', 'others']).optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  education_level: z.enum(['illiterate', 'primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate', 'others']).optional(),
  permanent_address: AddressSchema.optional(),
})

// ── User management ──────────────────────────────────────────────────────────

export const CreateAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: PasswordSchema,
  mobile: z.string().trim().optional(),
  permissions: z.array(PermissionSchema).default([]),
})

export const UpdateUserPermissionsSchema = z.object({
  permissions: z.array(PermissionSchema),
})

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  mobile: z.string().trim().optional(),
  current_password: z.string().min(1, 'Current password is required').optional().or(z.literal('')),
  new_password: PasswordSchema.optional().or(z.literal('')),
}).refine(data => {
  if (data.new_password && !data.current_password) return false;
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["current_password"]
})

// ── Tax ──────────────────────────────────────────────────────────────────────

export const CreateTaxSchema = z.object({
  citizen_id: ObjectIdSchema,
  fiscal_year: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Fiscal year must be in format YYYY-YYYY'),
  amount: z.number().positive('Tax amount must be positive'),
})

// ── Payment ──────────────────────────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  payment_type: z.enum(['tax', 'certificate']),
  source_type: z.enum(['tax', 'certificate_bn', 'certificate_en', 'warish', 'family_certificate']),
  reference_id: CoercedObjectIdSchema,
  amount: z.coerce.number().positive(),
  paid_by_citizen: CoercedObjectIdSchema,
  note: z.string().trim().optional(),
})

// ── Certificate ──────────────────────────────────────────────────────────────

export const CreateCertificateSchema = z.object({
  language: z.enum(['bn', 'en']),
  certificate_type: z.string().min(1).max(50).trim(),
  template_id: ObjectIdSchema,
  citizen_id: ObjectIdSchema,
  dynamic_data: z.record(z.string(), z.unknown()).optional().default({}),
})
