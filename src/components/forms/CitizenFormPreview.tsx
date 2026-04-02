'use client'

import type { CitizenFormData } from './CitizenRegistrationForm'

interface CitizenFormPreviewProps {
  data: CitizenFormData
  onEdit: () => void
  onSubmit: () => void
  saving: boolean
  errorMsg: string
}

const HOUSE_TYPE_LABELS: Record<string, string> = {
  pucca: 'পাকা / Pucca',
  semi_pucca: 'আধা-পাকা / Semi-Pucca',
  kutcha: 'কাঁচা / Kutcha',
  jhupri: 'ঝুপড়ি / Jhupri',
}

const OWNERSHIP_LABELS: Record<string, string> = {
  own: 'নিজস্ব / Own',
  rented: 'ভাড়া / Rented',
  others: 'অন্যান্য / Others',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'পুরুষ / Male',
  female: 'মহিলা / Female',
  other: 'অন্যান্য / Other',
}

const RELIGION_LABELS: Record<string, string> = {
  islam: 'ইসলাম / Islam',
  hinduism: 'হিন্দু / Hinduism',
  christianity: 'খ্রিস্টান / Christianity',
  buddhism: 'বৌদ্ধ / Buddhism',
  others: 'অন্যান্য / Others',
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'অবিবাহিত / Single',
  married: 'বিবাহিত / Married',
  divorced: 'তালাকপ্রাপ্ত / Divorced',
  widowed: 'বিধবা/বিপত্নীক / Widowed',
}

const EDUCATION_LABELS: Record<string, string> = {
  illiterate: 'নিরক্ষর / Illiterate',
  primary: 'প্রাথমিক / Primary',
  secondary: 'মাধ্যমিক / Secondary (SSC)',
  higher_secondary: 'উচ্চ মাধ্যমিক / Higher Secondary (HSC)',
  graduate: 'স্নাতক / Graduate',
  post_graduate: 'স্নাতকোত্তর / Post Graduate',
  others: 'অন্যান্য / Others',
}

function PreviewSection({
  titleBn,
  titleEn,
  children,
}: {
  titleBn: string
  titleEn: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">
        {titleBn} / {titleEn}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function PreviewField({
  labelBn,
  labelEn,
  value,
}: {
  labelBn: string
  labelEn: string
  value: string | number | boolean | null | undefined
}) {
  const displayValue =
    value === true
      ? 'হ্যাঁ / Yes'
      : value === false
        ? 'না / No'
        : value || '—'

  return (
    <div>
      <span className="text-xs text-gray-500">
        {labelBn} / {labelEn}
      </span>
      <p className="text-sm text-gray-900 mt-0.5">{String(displayValue)}</p>
    </div>
  )
}

function AddressPreview({
  titleBn,
  titleEn,
  address,
}: {
  titleBn: string
  titleEn: string
  address: CitizenFormData['address']
}) {
  if (!address.village_bn) return null

  return (
    <div className="border-b border-gray-100 pb-4">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">
        {titleBn} / {titleEn}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PreviewField labelBn="গ্রাম (বাংলা)" labelEn="Village (Bangla)" value={address.village_bn} />
        <PreviewField labelBn="Village (English)" labelEn="গ্রাম (ইংরেজি)" value={address.village_en} />
        <PreviewField labelBn="ডাকঘর (বাংলা)" labelEn="Post Office (Bangla)" value={address.post_office_bn} />
        <PreviewField labelBn="Post Office (English)" labelEn="ডাকঘর (ইংরেজি)" value={address.post_office_en} />
        <PreviewField labelBn="থানা (বাংলা)" labelEn="Thana (Bangla)" value={address.thana_bn} />
        <PreviewField labelBn="Thana (English)" labelEn="থানা (ইংরেজি)" value={address.thana_en} />
        <PreviewField labelBn="জেলা (বাংলা)" labelEn="District (Bangla)" value={address.district_bn} />
        <PreviewField labelBn="District (English)" labelEn="জেলা (ইংরেজি)" value={address.district_en} />
        <PreviewField
          labelBn="ওয়ার্ড নং"
          labelEn="Ward No"
          value={address.ward_no ? `ওয়ার্ড ${address.ward_no} / Ward ${address.ward_no}` : ''}
        />
      </div>
    </div>
  )
}

export default function CitizenFormPreview({
  data,
  onEdit,
  onSubmit,
  saving,
  errorMsg,
}: CitizenFormPreviewProps) {
  const hasHousingInfo =
    data.housing_info.house_type ||
    data.housing_info.ownership_type ||
    data.housing_info.total_rooms

  const hasFinancialInfo =
    data.financial_info.annual_income ||
    data.financial_info.occupation ||
    data.financial_info.land_owned_dec

  const permanentAddress = data.same_as_present ? data.address : data.permanent_address

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <p className="text-sm text-green-800">
          অনুগ্রহ করে তথ্য যাচাই করুন এবং জমা দিন / Please review the information and submit
        </p>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Personal Information */}
        <PreviewSection titleBn="ব্যক্তিগত তথ্য" titleEn="Personal Information">
          <PreviewField labelBn="নাম (বাংলা)" labelEn="Name (Bangla)" value={data.name_bn} />
          <PreviewField labelBn="Name (English)" labelEn="নাম (ইংরেজি)" value={data.name_en} />
          <PreviewField
            labelBn="পিতার নাম (বাংলা)"
            labelEn="Father (Bangla)"
            value={data.father_name_bn}
          />
          <PreviewField
            labelBn="Father (English)"
            labelEn="পিতার নাম (ইংরেজি)"
            value={data.father_name_en}
          />
          <PreviewField
            labelBn="মাতার নাম (বাংলা)"
            labelEn="Mother (Bangla)"
            value={data.mother_name_bn}
          />
          <PreviewField
            labelBn="Mother (English)"
            labelEn="মাতার নাম (ইংরেজি)"
            value={data.mother_name_en}
          />
          {(data.spouse_name_bn || data.spouse_name_en) && (
            <>
              <PreviewField
                labelBn="স্বামী/স্ত্রী (বাংলা)"
                labelEn="Spouse (Bangla)"
                value={data.spouse_name_bn}
              />
              <PreviewField
                labelBn="Spouse (English)"
                labelEn="স্বামী/স্ত্রী (ইংরেজি)"
                value={data.spouse_name_en}
              />
            </>
          )}
          <PreviewField
            labelBn="জন্ম তারিখ"
            labelEn="Date of Birth"
            value={data.date_of_birth}
          />
          <PreviewField
            labelBn="লিঙ্গ"
            labelEn="Gender"
            value={GENDER_LABELS[data.gender]}
          />
          <PreviewField labelBn="মোবাইল" labelEn="Mobile" value={data.mobile} />
          {data.blood_group && (
            <PreviewField labelBn="রক্তের গ্রুপ" labelEn="Blood Group" value={data.blood_group} />
          )}
          {data.religion && (
            <PreviewField labelBn="ধর্ম" labelEn="Religion" value={RELIGION_LABELS[data.religion]} />
          )}
          {data.marital_status && (
            <PreviewField labelBn="বৈবাহিক অবস্থা" labelEn="Marital Status" value={MARITAL_STATUS_LABELS[data.marital_status]} />
          )}
          {data.education_level && (
            <PreviewField labelBn="শিক্ষাগত যোগ্যতা" labelEn="Education Level" value={EDUCATION_LABELS[data.education_level]} />
          )}
        </PreviewSection>

        {/* Identification */}
        {(data.nid_no || data.birth_cert_no) && (
          <PreviewSection titleBn="পরিচয়পত্র" titleEn="Identification">
            {data.nid_no && (
              <PreviewField labelBn="জাতীয় পরিচয়পত্র" labelEn="NID" value={data.nid_no} />
            )}
            {data.birth_cert_no && (
              <PreviewField
                labelBn="জন্ম নিবন্ধন"
                labelEn="Birth Certificate"
                value={data.birth_cert_no}
              />
            )}
          </PreviewSection>
        )}

        {/* Present Address */}
        <AddressPreview
          titleBn="বর্তমান ঠিকানা"
          titleEn="Present Address"
          address={data.address}
        />

        {/* Permanent Address */}
        {permanentAddress.village_bn && (
          <AddressPreview
            titleBn="স্থায়ী ঠিকানা"
            titleEn="Permanent Address"
            address={permanentAddress}
          />
        )}

        {/* Housing Information */}
        {hasHousingInfo && (
          <PreviewSection titleBn="বাসস্থানের তথ্য" titleEn="Housing Information">
            {data.housing_info.house_type && (
              <PreviewField
                labelBn="ঘরের ধরন"
                labelEn="House Type"
                value={HOUSE_TYPE_LABELS[data.housing_info.house_type]}
              />
            )}
            {data.housing_info.ownership_type && (
              <PreviewField
                labelBn="মালিকানা"
                labelEn="Ownership"
                value={OWNERSHIP_LABELS[data.housing_info.ownership_type]}
              />
            )}
            {data.housing_info.total_rooms && (
              <PreviewField
                labelBn="কক্ষ সংখ্যা"
                labelEn="Total Rooms"
                value={data.housing_info.total_rooms}
              />
            )}
          </PreviewSection>
        )}

        {/* Financial Information */}
        {hasFinancialInfo && (
          <PreviewSection titleBn="আর্থিক তথ্য" titleEn="Financial Information">
            {data.financial_info.annual_income && (
              <PreviewField
                labelBn="বার্ষিক আয়"
                labelEn="Annual Income"
                value={`৳ ${Number(data.financial_info.annual_income).toLocaleString()}`}
              />
            )}
            {data.financial_info.occupation && (
              <PreviewField
                labelBn="পেশা"
                labelEn="Occupation"
                value={data.financial_info.occupation}
              />
            )}
            {data.financial_info.land_owned_dec && (
              <PreviewField
                labelBn="জমির পরিমাণ"
                labelEn="Land Owned"
                value={`${data.financial_info.land_owned_dec} শতক / Dec`}
              />
            )}
          </PreviewSection>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onEdit}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          সম্পাদনা / Edit
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'জমা হচ্ছে... / Submitting...' : 'নিশ্চিত করুন ও জমা দিন / Confirm & Submit'}
        </button>
      </div>
    </div>
  )
}
