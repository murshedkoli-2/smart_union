'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import FormSection from './FormSection'
import AddressFields from './AddressFields'
import CitizenFormPreview from './CitizenFormPreview'
import { apiCall } from '@/lib/utils/api-client'
import { filterBangla, filterEnglish } from '@/lib/utils/input-filters'
import type { Gender, HouseType, OwnershipType, BloodGroup, Religion, MaritalStatus, EducationLevel } from '@/types/citizen.types'

interface AddressData {
  village_bn: string
  village_en: string
  post_office_bn: string
  post_office_en: string
  thana_bn: string
  thana_en: string
  district_bn: string
  district_en: string
  ward_no: number | string
}

export interface CitizenFormData {
  // Personal Information
  name_bn: string
  name_en: string
  father_name_bn: string
  father_name_en: string
  mother_name_bn: string
  mother_name_en: string
  spouse_name_bn: string
  spouse_name_en: string
  date_of_birth: string
  gender: Gender
  mobile: string
  blood_group: BloodGroup | ''
  religion: Religion | ''
  marital_status: MaritalStatus | ''
  education_level: EducationLevel | ''

  // Identification
  nid_no: string
  birth_cert_no: string

  // Addresses
  address: AddressData
  same_as_present: boolean
  permanent_address: AddressData

  // Housing Info
  housing_info: {
    house_type: HouseType | ''
    ownership_type: OwnershipType | ''
    total_rooms: number | string
  }

  // Financial Info
  financial_info: {
    annual_income: number | string
    occupation: string
    land_owned_dec: number | string
  }
}

const defaultFormData: CitizenFormData = {
  name_bn: '',
  name_en: '',
  father_name_bn: '',
  father_name_en: '',
  mother_name_bn: '',
  mother_name_en: '',
  spouse_name_bn: '',
  spouse_name_en: '',
  date_of_birth: '',
  gender: 'male',
  mobile: '',
  blood_group: '',
  religion: '',
  marital_status: '',
  education_level: '',
  nid_no: '',
  birth_cert_no: '',
  address: {
    village_bn: '',
    village_en: '',
    post_office_bn: '',
    post_office_en: '',
    thana_bn: '',
    thana_en: '',
    district_bn: '',
    district_en: '',
    ward_no: '',
  },
  same_as_present: false,
  permanent_address: {
    village_bn: '',
    village_en: '',
    post_office_bn: '',
    post_office_en: '',
    thana_bn: '',
    thana_en: '',
    district_bn: '',
    district_en: '',
    ward_no: '',
  },
  housing_info: {
    house_type: '',
    ownership_type: '',
    total_rooms: '',
  },
  financial_info: {
    annual_income: '',
    occupation: '',
    land_owned_dec: '',
  },
}

interface CitizenRegistrationFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

const selectClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'

export default function CitizenRegistrationForm({
  onSuccess,
  onCancel,
}: CitizenRegistrationFormProps) {
  const [form, setForm] = useState<CitizenFormData>({ ...defaultFormData })
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)

  // Sync permanent address when "same as present" is checked
  useEffect(() => {
    if (form.same_as_present) {
      setForm((prev) => ({
        ...prev,
        permanent_address: { ...prev.address },
      }))
    }
  }, [form.same_as_present, form.address])

  const updateField = <K extends keyof CitizenFormData>(
    field: K,
    value: CitizenFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    if (!form.name_bn.trim()) return 'নাম (বাংলা) আবশ্যক / Name (Bangla) is required'
    if (!form.name_en.trim()) return 'Name (English) is required'
    if (!form.father_name_bn.trim()) return 'পিতার নাম (বাংলা) আবশ্যক'
    if (!form.father_name_en.trim()) return "Father's Name (English) is required"
    if (!form.mother_name_bn.trim()) return 'মাতার নাম (বাংলা) আবশ্যক'
    if (!form.mother_name_en.trim()) return "Mother's Name (English) is required"
    if (!form.date_of_birth) return 'জন্ম তারিখ আবশ্যক / Date of birth is required'
    if (!form.mobile.trim()) return 'মোবাইল নম্বর আবশ্যক / Mobile number is required'
    if (!form.address.village_bn.trim()) return 'গ্রাম (বাংলা) আবশ্যক / Village (Bangla) is required'
    if (!form.address.village_en.trim()) return 'Village (English) is required'
    if (!form.address.post_office_bn.trim()) return 'ডাকঘর (বাংলা) আবশ্যক / Post office (Bangla) is required'
    if (!form.address.post_office_en.trim()) return 'Post office (English) is required'
    if (!form.address.thana_bn.trim()) return 'থানা (বাংলা) আবশ্যক / Thana (Bangla) is required'
    if (!form.address.thana_en.trim()) return 'Thana (English) is required'
    if (!form.address.district_bn.trim()) return 'জেলা (বাংলা) আবশ্যক / District (Bangla) is required'
    if (!form.address.district_en.trim()) return 'District (English) is required'
    if (!form.address.ward_no) return 'ওয়ার্ড নম্বর আবশ্যক / Ward number is required'
    return null
  }

  const handlePreview = () => {
    const error = validateForm()
    if (error) {
      toast.error(error)
      return
    }
    setMode('preview')
  }

  const handleEdit = () => {
    setMode('edit')
  }

  const preparePayload = () => {
    const payload: Record<string, unknown> = {
      name_bn: form.name_bn.trim(),
      name_en: form.name_en.trim(),
      father_name_bn: form.father_name_bn.trim(),
      father_name_en: form.father_name_en.trim(),
      mother_name_bn: form.mother_name_bn.trim(),
      mother_name_en: form.mother_name_en.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      mobile: form.mobile.trim(),
      address: {
        village_bn: form.address.village_bn.trim(),
        village_en: form.address.village_en.trim(),
        post_office_bn: form.address.post_office_bn.trim(),
        post_office_en: form.address.post_office_en.trim(),
        thana_bn: form.address.thana_bn.trim(),
        thana_en: form.address.thana_en.trim(),
        district_bn: form.address.district_bn.trim(),
        district_en: form.address.district_en.trim(),
        ward_no: Number(form.address.ward_no),
      },
    }

    // Optional fields
    if (form.blood_group) payload.blood_group = form.blood_group
    if (form.religion) payload.religion = form.religion
    if (form.marital_status) payload.marital_status = form.marital_status
    if (form.education_level) payload.education_level = form.education_level
    if (form.spouse_name_bn.trim()) payload.spouse_name_bn = form.spouse_name_bn.trim()
    if (form.spouse_name_en.trim()) payload.spouse_name_en = form.spouse_name_en.trim()
    if (form.nid_no.trim()) payload.nid_no = form.nid_no.trim()
    if (form.birth_cert_no.trim()) payload.birth_cert_no = form.birth_cert_no.trim()

    // Permanent address
    const permAddr = form.same_as_present ? form.address : form.permanent_address
    if (permAddr.village_bn.trim()) {
      payload.permanent_address = {
        village_bn: permAddr.village_bn.trim(),
        village_en: permAddr.village_en.trim(),
        post_office_bn: permAddr.post_office_bn.trim(),
        post_office_en: permAddr.post_office_en.trim(),
        thana_bn: permAddr.thana_bn.trim(),
        thana_en: permAddr.thana_en.trim(),
        district_bn: permAddr.district_bn.trim(),
        district_en: permAddr.district_en.trim(),
        ward_no: Number(permAddr.ward_no),
      }
    }

    // Housing info
    const housing: Record<string, unknown> = {}
    if (form.housing_info.house_type) housing.house_type = form.housing_info.house_type
    if (form.housing_info.ownership_type) housing.ownership_type = form.housing_info.ownership_type
    if (form.housing_info.total_rooms) housing.total_rooms = Number(form.housing_info.total_rooms)
    if (Object.keys(housing).length > 0) payload.housing_info = housing

    // Financial info
    const financial: Record<string, unknown> = {}
    if (form.financial_info.annual_income) financial.annual_income = Number(form.financial_info.annual_income)
    if (form.financial_info.occupation.trim()) financial.occupation = form.financial_info.occupation.trim()
    if (form.financial_info.land_owned_dec) financial.land_owned_dec = Number(form.financial_info.land_owned_dec)
    if (Object.keys(financial).length > 0) payload.financial_info = financial

    return payload
  }

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const payload = preparePayload()
      const res = await apiCall('/api/citizens', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        toast.error(data.message ?? 'নাগরিক তৈরি ব্যর্থ হয়েছে / Failed to create citizen')
        setMode('edit')
      }
    } catch {
      toast.error('নেটওয়ার্ক ত্রুটি / Network error')
      setMode('edit')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'preview') {
    return (
      <CitizenFormPreview
        data={form}
        onEdit={handleEdit}
        onSubmit={handleSubmit}
        saving={saving}
        errorMsg=""
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Personal Information */}
      <FormSection titleBn="ব্যক্তিগত তথ্য" titleEn="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              নাম (বাংলা) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name_bn"
              autoComplete="name"
              value={form.name_bn}
              onChange={(e) => updateField('name_bn', filterBangla(e.target.value))}
              className={inputClass}
              placeholder="পূর্ণ নাম বাংলায়"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name (English) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name_en"
              autoComplete="name"
              value={form.name_en}
              onChange={(e) => updateField('name_en', filterEnglish(e.target.value))}
              className={inputClass}
              placeholder="Full name in English"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              পিতার নাম (বাংলা) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="father_name_bn"
              autoComplete="off"
              value={form.father_name_bn}
              onChange={(e) => updateField('father_name_bn', filterBangla(e.target.value))}
              className={inputClass}
              placeholder="পিতার নাম বাংলায়"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Father&apos;s Name (English) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="father_name_en"
              autoComplete="off"
              value={form.father_name_en}
              onChange={(e) => updateField('father_name_en', filterEnglish(e.target.value))}
              className={inputClass}
              placeholder="Father's name in English"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              মাতার নাম (বাংলা) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="mother_name_bn"
              autoComplete="off"
              value={form.mother_name_bn}
              onChange={(e) => updateField('mother_name_bn', filterBangla(e.target.value))}
              className={inputClass}
              placeholder="মাতার নাম বাংলায়"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mother&apos;s Name (English) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="mother_name_en"
              autoComplete="off"
              value={form.mother_name_en}
              onChange={(e) => updateField('mother_name_en', filterEnglish(e.target.value))}
              className={inputClass}
              placeholder="Mother's name in English"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              স্বামী/স্ত্রীর নাম (বাংলা)
            </label>
            <input
              type="text"
              name="spouse_name_bn"
              autoComplete="off"
              value={form.spouse_name_bn}
              onChange={(e) => updateField('spouse_name_bn', filterBangla(e.target.value))}
              className={inputClass}
              placeholder="স্বামী/স্ত্রীর নাম বাংলায়"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Spouse Name (English)
            </label>
            <input
              type="text"
              name="spouse_name_en"
              autoComplete="off"
              value={form.spouse_name_en}
              onChange={(e) => updateField('spouse_name_en', filterEnglish(e.target.value))}
              className={inputClass}
              placeholder="Spouse name in English"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              জন্ম তারিখ / Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date_of_birth"
              autoComplete="bday"
              value={form.date_of_birth}
              onChange={(e) => updateField('date_of_birth', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              লিঙ্গ / Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              autoComplete="sex"
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value as Gender)}
              className={selectClass}
              required
            >
              <option value="male">পুরুষ / Male</option>
              <option value="female">মহিলা / Female</option>
              <option value="other">অন্যান্য / Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              মোবাইল নম্বর / Mobile <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="mobile"
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => updateField('mobile', e.target.value)}
              className={inputClass}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              রক্তের গ্রুপ / Blood Group
            </label>
            <select
              name="blood_group"
              autoComplete="off"
              value={form.blood_group}
              onChange={(e) => updateField('blood_group', e.target.value as BloodGroup | '')}
              className={selectClass}
            >
              <option value="">নির্বাচন করুন / Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ধর্ম / Religion
            </label>
            <select
              name="religion"
              autoComplete="off"
              value={form.religion}
              onChange={(e) => updateField('religion', e.target.value as Religion | '')}
              className={selectClass}
            >
              <option value="">নির্বাচন করুন / Select</option>
              <option value="islam">ইসলাম / Islam</option>
              <option value="hinduism">হিন্দু / Hinduism</option>
              <option value="christianity">খ্রিস্টান / Christianity</option>
              <option value="buddhism">বৌদ্ধ / Buddhism</option>
              <option value="others">অন্যান্য / Others</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              বৈবাহিক অবস্থা / Marital Status
            </label>
            <select
              name="marital_status"
              autoComplete="off"
              value={form.marital_status}
              onChange={(e) => updateField('marital_status', e.target.value as MaritalStatus | '')}
              className={selectClass}
            >
              <option value="">নির্বাচন করুন / Select</option>
              <option value="single">অবিবাহিত / Single</option>
              <option value="married">বিবাহিত / Married</option>
              <option value="divorced">তালাকপ্রাপ্ত / Divorced</option>
              <option value="widowed">বিধবা/বিপত্নীক / Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              শিক্ষাগত যোগ্যতা / Education Level
            </label>
            <select
              name="education_level"
              autoComplete="off"
              value={form.education_level}
              onChange={(e) => updateField('education_level', e.target.value as EducationLevel | '')}
              className={selectClass}
            >
              <option value="">নির্বাচন করুন / Select</option>
              <option value="illiterate">নিরক্ষর / Illiterate</option>
              <option value="primary">প্রাথমিক / Primary</option>
              <option value="secondary">মাধ্যমিক / Secondary (SSC)</option>
              <option value="higher_secondary">উচ্চ মাধ্যমিক / Higher Secondary (HSC)</option>
              <option value="graduate">স্নাতক / Graduate</option>
              <option value="post_graduate">স্নাতকোত্তর / Post Graduate</option>
              <option value="others">অন্যান্য / Others</option>
            </select>
          </div>
        </div>
      </FormSection>

      {/* Identification */}
      <FormSection titleBn="পরিচয়পত্র" titleEn="Identification" optional>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              জাতীয় পরিচয়পত্র নম্বর / NID Number
            </label>
            <input
              type="text"
              name="nid_no"
              autoComplete="off"
              value={form.nid_no}
              onChange={(e) => updateField('nid_no', e.target.value)}
              className={inputClass}
              placeholder="জাতীয় পরিচয়পত্র নম্বর"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              জন্ম নিবন্ধন নম্বর / Birth Certificate No
            </label>
            <input
              type="text"
              name="birth_cert_no"
              autoComplete="off"
              value={form.birth_cert_no}
              onChange={(e) => updateField('birth_cert_no', e.target.value)}
              className={inputClass}
              placeholder="জন্ম নিবন্ধন নম্বর"
            />
          </div>
        </div>
      </FormSection>

      {/* Present Address */}
      <FormSection titleBn="বর্তমান ঠিকানা" titleEn="Present Address">
        <AddressFields
          value={form.address}
          onChange={(addr) => updateField('address', addr)}
          required
        />
      </FormSection>

      {/* Permanent Address */}
      <FormSection titleBn="স্থায়ী ঠিকানা" titleEn="Permanent Address" optional>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="same_as_present"
              checked={form.same_as_present}
              onChange={(e) => updateField('same_as_present', e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="same_as_present" className="text-sm text-gray-700">
              বর্তমান ঠিকানার অনুরূপ / Same as present address
            </label>
          </div>
          <AddressFields
            value={form.same_as_present ? form.address : form.permanent_address}
            onChange={(addr) => updateField('permanent_address', addr)}
            disabled={form.same_as_present}
          />
        </div>
      </FormSection>

      {/* Housing Information */}
      <FormSection
        titleBn="বাসস্থানের তথ্য"
        titleEn="Housing Information"
        optional
        defaultCollapsed
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ঘরের ধরন / House Type
            </label>
            <select
              name="house_type"
              autoComplete="off"
              value={form.housing_info.house_type}
              onChange={(e) =>
                updateField('housing_info', {
                  ...form.housing_info,
                  house_type: e.target.value as HouseType | '',
                })
              }
              className={selectClass}
            >
              <option value="">নির্বাচন করুন</option>
              <option value="pucca">পাকা / Pucca</option>
              <option value="semi_pucca">আধা-পাকা / Semi-Pucca</option>
              <option value="kutcha">কাঁচা / Kutcha</option>
              <option value="jhupri">ঝুপড়ি / Jhupri</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              মালিকানার ধরন / Ownership Type
            </label>
            <select
              name="ownership_type"
              autoComplete="off"
              value={form.housing_info.ownership_type}
              onChange={(e) =>
                updateField('housing_info', {
                  ...form.housing_info,
                  ownership_type: e.target.value as OwnershipType | '',
                })
              }
              className={selectClass}
            >
              <option value="">নির্বাচন করুন</option>
              <option value="own">নিজস্ব / Own</option>
              <option value="rented">ভাড়া / Rented</option>
              <option value="others">অন্যান্য / Others</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              মোট কক্ষ সংখ্যা / Total Rooms
            </label>
            <input
              type="number"
              name="total_rooms"
              autoComplete="off"
              min="0"
              value={form.housing_info.total_rooms}
              onChange={(e) =>
                updateField('housing_info', {
                  ...form.housing_info,
                  total_rooms: e.target.value,
                })
              }
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>
      </FormSection>

      {/* Financial Information */}
      <FormSection
        titleBn="আর্থিক তথ্য"
        titleEn="Financial Information"
        optional
        defaultCollapsed
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              বার্ষিক আয় (টাকা) / Annual Income (BDT)
            </label>
            <input
              type="number"
              name="annual_income"
              autoComplete="off"
              min="0"
              value={form.financial_info.annual_income}
              onChange={(e) =>
                updateField('financial_info', {
                  ...form.financial_info,
                  annual_income: e.target.value,
                })
              }
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              পেশা / Occupation
            </label>
            <input
              type="text"
              name="occupation"
              autoComplete="organization-title"
              value={form.financial_info.occupation}
              onChange={(e) =>
                updateField('financial_info', {
                  ...form.financial_info,
                  occupation: e.target.value,
                })
              }
              className={inputClass}
              placeholder="পেশার নাম"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              জমির পরিমাণ (শতক) / Land Owned (Dec)
            </label>
            <input
              type="number"
              name="land_owned_dec"
              autoComplete="off"
              min="0"
              step="0.01"
              value={form.financial_info.land_owned_dec}
              onChange={(e) =>
                updateField('financial_info', {
                  ...form.financial_info,
                  land_owned_dec: e.target.value,
                })
              }
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>
      </FormSection>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          বাতিল / Cancel
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800"
        >
          প্রাকদর্শন / Preview
        </button>
      </div>
    </div>
  )
}
