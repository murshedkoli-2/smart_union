/** Union settings as the admin screen edits them. */
import type { UnionMember, UnionSettings } from '@/types/certificate.types'

export type { UnionMember, UnionSettings } from '@/types/certificate.types'

export const emptySettings = (): UnionSettings => ({
  union_name_bn: '',
  union_name_en: '',
  chairman_name_bn: '',
  chairman_name_en: '',
  union_logo: '',
  address_bn: '',
  address_en: '',
  members: [],
})

export const emptyMember = (): UnionMember => ({
  name_bn: '',
  name_en: '',
  designation_bn: '',
  designation_en: '',
  mobile: '',
})

/**
 * Coerces the API response into the shape the form binds to.
 *
 * Every field becomes a string: settings predate several of these fields, so a
 * stored document can be missing them, and binding an input to undefined turns
 * it into an uncontrolled field that React then complains about on first edit.
 */
export function normalizeSettings(value: unknown): UnionSettings {
  const item = (value ?? {}) as Record<string, unknown>
  const members = Array.isArray(item.members) ? item.members : []

  return {
    union_name_bn: String(item.union_name_bn ?? ''),
    union_name_en: String(item.union_name_en ?? ''),
    chairman_name_bn: String(item.chairman_name_bn ?? ''),
    chairman_name_en: String(item.chairman_name_en ?? ''),
    union_logo: String(item.union_logo ?? ''),
    address_bn: String(item.address_bn ?? ''),
    address_en: String(item.address_en ?? ''),
    members: members.map((member) => {
      const entry = member as Record<string, unknown>
      return {
        name_bn: String(entry.name_bn ?? ''),
        name_en: String(entry.name_en ?? ''),
        designation_bn: String(entry.designation_bn ?? ''),
        designation_en: String(entry.designation_en ?? ''),
        mobile: String(entry.mobile ?? ''),
      }
    }),
  }
}
