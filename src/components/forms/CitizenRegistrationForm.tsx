'use client'

/**
 * Citizen registration: fill in, preview, submit.
 *
 * The form's rules and payload live in ./citizen-form-model (pure, tested);
 * the repeated label-and-input markup lives in ./Field. What is left here is
 * the field list and the two-step edit/preview flow.
 */
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import FormSection from './FormSection'
import AddressFields from './AddressFields'
import CitizenFormPreview from './CitizenFormPreview'
import { SelectField, TextField } from './Field'
import { apiCall } from '@/lib/utils/api-client'
import { filterBangla, filterEnglish } from '@/lib/utils/input-filters'
import {
  SELECT_OPTIONS,
  buildCitizenPayload,
  defaultCitizenForm,
  validateCitizenForm,
  type CitizenFormData,
} from './citizen-form-model'
import type {
  BloodGroup,
  EducationLevel,
  Gender,
  HouseType,
  MaritalStatus,
  OwnershipType,
  Religion,
} from '@/types/citizen.types'

export type { CitizenFormData } from './citizen-form-model'

interface CitizenRegistrationFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function CitizenRegistrationForm({
  onSuccess,
  onCancel,
}: CitizenRegistrationFormProps) {
  const [form, setForm] = useState<CitizenFormData>(defaultCitizenForm)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)

  // Keep the permanent address mirroring the present one while the box is
  // ticked, including edits made to the present address afterwards.
  useEffect(() => {
    if (form.same_as_present) {
      setForm((prev) => ({ ...prev, permanent_address: { ...prev.address } }))
    }
  }, [form.same_as_present, form.address])

  const updateField = <K extends keyof CitizenFormData>(field: K, value: CitizenFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateHousing = (patch: Partial<CitizenFormData['housing_info']>) =>
    updateField('housing_info', { ...form.housing_info, ...patch })

  const updateFinancial = (patch: Partial<CitizenFormData['financial_info']>) =>
    updateField('financial_info', { ...form.financial_info, ...patch })

  const handlePreview = () => {
    const error = validateCitizenForm(form)
    if (error) {
      toast.error(error)
      return
    }
    setMode('preview')
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await apiCall('/api/citizens', {
        method: 'POST',
        body: JSON.stringify(buildCitizenPayload(form)),
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
        onEdit={() => setMode('edit')}
        onSubmit={handleSubmit}
        saving={saving}
        errorMsg=""
      />
    )
  }

  return (
    <div className="space-y-4">
      <FormSection titleBn="ব্যক্তিগত তথ্য" titleEn="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="নাম (বাংলা)"
            name="name_bn"
            autoComplete="name"
            required
            value={form.name_bn}
            onChange={(v) => updateField('name_bn', filterBangla(v))}
            placeholder="পূর্ণ নাম বাংলায়"
          />
          <TextField
            label="Name (English)"
            name="name_en"
            autoComplete="name"
            required
            value={form.name_en}
            onChange={(v) => updateField('name_en', filterEnglish(v))}
            placeholder="Full name in English"
          />
          <TextField
            label="পিতার নাম (বাংলা)"
            name="father_name_bn"
            required
            value={form.father_name_bn}
            onChange={(v) => updateField('father_name_bn', filterBangla(v))}
            placeholder="পিতার নাম বাংলায়"
          />
          <TextField
            label="Father's Name (English)"
            name="father_name_en"
            required
            value={form.father_name_en}
            onChange={(v) => updateField('father_name_en', filterEnglish(v))}
            placeholder="Father's name in English"
          />
          <TextField
            label="মাতার নাম (বাংলা)"
            name="mother_name_bn"
            required
            value={form.mother_name_bn}
            onChange={(v) => updateField('mother_name_bn', filterBangla(v))}
            placeholder="মাতার নাম বাংলায়"
          />
          <TextField
            label="Mother's Name (English)"
            name="mother_name_en"
            required
            value={form.mother_name_en}
            onChange={(v) => updateField('mother_name_en', filterEnglish(v))}
            placeholder="Mother's name in English"
          />
          <TextField
            label="স্বামী/স্ত্রীর নাম (বাংলা)"
            name="spouse_name_bn"
            value={form.spouse_name_bn}
            onChange={(v) => updateField('spouse_name_bn', filterBangla(v))}
            placeholder="স্বামী/স্ত্রীর নাম বাংলায়"
          />
          <TextField
            label="Spouse Name (English)"
            name="spouse_name_en"
            value={form.spouse_name_en}
            onChange={(v) => updateField('spouse_name_en', filterEnglish(v))}
            placeholder="Spouse name in English"
          />
          <TextField
            label="জন্ম তারিখ / Date of Birth"
            name="date_of_birth"
            type="date"
            autoComplete="bday"
            required
            value={form.date_of_birth}
            onChange={(v) => updateField('date_of_birth', v)}
          />
          <SelectField
            label="লিঙ্গ / Gender"
            name="gender"
            autoComplete="sex"
            required
            value={form.gender}
            onChange={(v) => updateField('gender', v as Gender)}
            options={SELECT_OPTIONS.gender}
          />
          <TextField
            label="মোবাইল নম্বর / Mobile"
            name="mobile"
            type="tel"
            autoComplete="tel"
            required
            value={form.mobile}
            onChange={(v) => updateField('mobile', v)}
            placeholder="01XXXXXXXXX"
          />
          <SelectField
            label="রক্তের গ্রুপ / Blood Group"
            name="blood_group"
            value={form.blood_group}
            onChange={(v) => updateField('blood_group', v as BloodGroup | '')}
            options={SELECT_OPTIONS.blood_group}
          />
          <SelectField
            label="ধর্ম / Religion"
            name="religion"
            value={form.religion}
            onChange={(v) => updateField('religion', v as Religion | '')}
            options={SELECT_OPTIONS.religion}
          />
          <SelectField
            label="বৈবাহিক অবস্থা / Marital Status"
            name="marital_status"
            value={form.marital_status}
            onChange={(v) => updateField('marital_status', v as MaritalStatus | '')}
            options={SELECT_OPTIONS.marital_status}
          />
          <SelectField
            label="শিক্ষাগত যোগ্যতা / Education Level"
            name="education_level"
            value={form.education_level}
            onChange={(v) => updateField('education_level', v as EducationLevel | '')}
            options={SELECT_OPTIONS.education_level}
          />
        </div>
      </FormSection>

      <FormSection titleBn="পরিচয়পত্র" titleEn="Identification" optional>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="জাতীয় পরিচয়পত্র নম্বর / NID Number"
            name="nid_no"
            value={form.nid_no}
            onChange={(v) => updateField('nid_no', v)}
            placeholder="জাতীয় পরিচয়পত্র নম্বর"
          />
          <TextField
            label="জন্ম নিবন্ধন নম্বর / Birth Certificate No"
            name="birth_cert_no"
            value={form.birth_cert_no}
            onChange={(v) => updateField('birth_cert_no', v)}
            placeholder="জন্ম নিবন্ধন নম্বর"
          />
        </div>
      </FormSection>

      <FormSection titleBn="বর্তমান ঠিকানা" titleEn="Present Address">
        <AddressFields
          value={form.address}
          onChange={(addr) => updateField('address', addr)}
          required
        />
      </FormSection>

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

      <FormSection titleBn="বাসস্থানের তথ্য" titleEn="Housing Information" optional defaultCollapsed>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="ঘরের ধরন / House Type"
            name="house_type"
            placeholder="নির্বাচন করুন"
            value={form.housing_info.house_type}
            onChange={(v) => updateHousing({ house_type: v as HouseType | '' })}
            options={SELECT_OPTIONS.house_type}
          />
          <SelectField
            label="মালিকানার ধরন / Ownership Type"
            name="ownership_type"
            placeholder="নির্বাচন করুন"
            value={form.housing_info.ownership_type}
            onChange={(v) => updateHousing({ ownership_type: v as OwnershipType | '' })}
            options={SELECT_OPTIONS.ownership_type}
          />
          <TextField
            label="মোট কক্ষ সংখ্যা / Total Rooms"
            name="total_rooms"
            type="number"
            min="0"
            value={form.housing_info.total_rooms}
            onChange={(v) => updateHousing({ total_rooms: v })}
            placeholder="0"
          />
        </div>
      </FormSection>

      <FormSection titleBn="আর্থিক তথ্য" titleEn="Financial Information" optional defaultCollapsed>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField
            label="বার্ষিক আয় (টাকা) / Annual Income (BDT)"
            name="annual_income"
            type="number"
            min="0"
            value={form.financial_info.annual_income}
            onChange={(v) => updateFinancial({ annual_income: v })}
            placeholder="0"
          />
          <TextField
            label="পেশা / Occupation"
            name="occupation"
            autoComplete="organization-title"
            value={form.financial_info.occupation}
            onChange={(v) => updateFinancial({ occupation: v })}
            placeholder="পেশার নাম"
          />
          <TextField
            label="জমির পরিমাণ (শতক) / Land Owned (Dec)"
            name="land_owned_dec"
            type="number"
            min="0"
            step="0.01"
            value={form.financial_info.land_owned_dec}
            onChange={(v) => updateFinancial({ land_owned_dec: v })}
            placeholder="0.00"
          />
        </div>
      </FormSection>

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
