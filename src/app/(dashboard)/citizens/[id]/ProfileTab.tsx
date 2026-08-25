'use client'

/**
 * The read-only citizen profile.
 *
 * Every section was the same shape — a heading and a grid of label/value pairs
 * — written out longhand eight times, three of them with per-field `{cond &&
 * <div>…}` blocks around identical markup. Here a section is a list of fields
 * and `FieldGrid` draws it; a field with no value drops out on its own.
 */
import StatusBadge from '@/components/ui/StatusBadge'
import type { AddressDto, CitizenRecord } from '@/types/citizen.types'

interface Field {
  label: string
  value?: string | number | null
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-BD') : '—'

/** Renders the fields that have a value; nothing at all when none do. */
function FieldGrid({
  title,
  fields,
  /** Fields kept even when empty, shown as an em dash. */
  showEmpty = false,
  children,
}: {
  title: string
  fields: Field[]
  showEmpty?: boolean
  children?: React.ReactNode
}) {
  const visible = showEmpty ? fields : fields.filter((f) => f.value !== undefined && f.value !== null && f.value !== '')
  if (visible.length === 0 && !children) return null

  return (
    <div>
      <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {children}
        {visible.map(({ label, value }) => (
          <div key={label}>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-sm text-gray-800">{value === undefined || value === null || value === '' ? '—' : value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const addressFields = (address?: AddressDto): Field[] => [
  { label: 'গ্রাম (বাংলা)', value: address?.village_bn },
  { label: 'Village (EN)', value: address?.village_en },
  { label: 'ডাকঘর (বাংলা)', value: address?.post_office_bn },
  { label: 'Post Office (EN)', value: address?.post_office_en },
  { label: 'থানা (বাংলা)', value: address?.thana_bn },
  { label: 'Thana (EN)', value: address?.thana_en },
  { label: 'জেলা (বাংলা)', value: address?.district_bn },
  { label: 'District (EN)', value: address?.district_en },
  { label: 'ওয়ার্ড নং / Ward No', value: address?.ward_no },
]

const GENDER_LABEL: Record<string, string> = {
  male: 'পুরুষ / Male',
  female: 'মহিলা / Female',
}

export default function ProfileTab({ citizen }: { citizen: CitizenRecord }) {
  const hasSpouse = Boolean(citizen.spouse_name_bn || citizen.spouse_name_en)

  return (
    <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <FieldGrid
        title="ব্যক্তিগত তথ্য / Personal Information"
        showEmpty
        fields={[
          { label: 'নাম (বাংলা)', value: citizen.name_bn },
          { label: 'Name (English)', value: citizen.name_en },
          { label: 'পিতার নাম (বাংলা)', value: citizen.father_name_bn },
          { label: 'Father Name (EN)', value: citizen.father_name_en },
          { label: 'মাতার নাম (বাংলা)', value: citizen.mother_name_bn },
          { label: 'Mother Name (EN)', value: citizen.mother_name_en },
          ...(hasSpouse
            ? [
                { label: 'স্বামী/স্ত্রী (বাংলা)', value: citizen.spouse_name_bn },
                { label: 'Spouse (EN)', value: citizen.spouse_name_en },
              ]
            : []),
          { label: 'জন্ম তারিখ / DOB', value: formatDate(citizen.date_of_birth) },
          { label: 'লিঙ্গ / Gender', value: GENDER_LABEL[citizen.gender] ?? 'অন্যান্য / Other' },
          { label: 'মোবাইল / Mobile', value: citizen.mobile },
        ]}
      />

      <FieldGrid
        title="পরিচয়পত্র / Identification"
        fields={[
          { label: 'জাতীয় পরিচয়পত্র / NID', value: citizen.nid_no },
          { label: 'জন্ম নিবন্ধন / Birth Cert', value: citizen.birth_cert_no },
        ]}
      />

      <FieldGrid
        title="বর্তমান ঠিকানা / Present Address"
        showEmpty
        fields={addressFields(citizen.address)}
      />

      {citizen.permanent_address?.village_bn && (
        <FieldGrid
          title="স্থায়ী ঠিকানা / Permanent Address"
          showEmpty
          fields={addressFields(citizen.permanent_address)}
        />
      )}

      <FieldGrid
        title="বাসস্থানের তথ্য / Housing Information"
        fields={[
          { label: 'ঘরের ধরন / House Type', value: citizen.housing_info?.house_type },
          { label: 'মালিকানা / Ownership', value: citizen.housing_info?.ownership_type },
          { label: 'কক্ষ সংখ্যা / Rooms', value: citizen.housing_info?.total_rooms },
        ]}
      />

      <FieldGrid
        title="আর্থিক তথ্য / Financial Information"
        fields={[
          {
            label: 'বার্ষিক আয় / Annual Income',
            value: citizen.financial_info?.annual_income
              ? `৳ ${citizen.financial_info.annual_income.toLocaleString()}`
              : undefined,
          },
          { label: 'পেশা / Occupation', value: citizen.financial_info?.occupation },
          {
            label: 'জমির পরিমাণ / Land',
            value: citizen.financial_info?.land_owned_dec
              ? `${citizen.financial_info.land_owned_dec} শতক`
              : undefined,
          },
        ]}
      />

      <FieldGrid
        title="অন্যান্য তথ্য / Other Information"
        fields={[
          { label: 'নিবন্ধনের তারিখ / Registered', value: formatDate(citizen.createdAt) },
          { label: 'অনুমোদনকারী / Approved By', value: citizen.approved_by?.name },
          {
            label: 'অনুমোদনের তারিখ / Approved At',
            value: citizen.approved_at ? formatDate(citizen.approved_at) : undefined,
          },
        ]}
      >
        {/* Status is a badge rather than text, so it does not fit the field list. */}
        <div>
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">অবস্থা / Status</p>
          <StatusBadge status={citizen.status} />
        </div>
      </FieldGrid>
    </div>
  )
}
