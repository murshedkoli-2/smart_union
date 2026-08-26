'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import FormSection from '@/components/forms/FormSection'
import AddressFields from '@/components/forms/AddressFields'
import { SelectField, TextField } from '@/components/forms/Field'
import CitizenFormPreview from '@/components/forms/CitizenFormPreview'
import { filterBangla, filterEnglish } from '@/lib/utils/input-filters'
import {
  SELECT_OPTIONS,
  buildCitizenPayload,
  defaultCitizenForm,
  validateCitizenForm,
  type CitizenFormData,
} from '@/components/forms/citizen-form-model'
import type {
  BloodGroup,
  EducationLevel,
  Gender,
  HouseType,
  MaritalStatus,
  OwnershipType,
  Religion,
} from '@/types/citizen.types'

interface AccountFormData {
  email: string
  password: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

const STEPS = [
  { titleBn: 'লগইন তথ্য', titleEn: 'Login' },
  { titleBn: 'নাম (বাংলা)', titleEn: 'Names (Bangla)' },
  { titleBn: 'নাম (ইংরেজি)', titleEn: 'Names (English)' },
  { titleBn: 'ব্যক্তিগত বিবরণ', titleEn: 'Personal Details' },
  { titleBn: 'পরিচয়পত্র', titleEn: 'Identification' },
  { titleBn: 'বর্তমান ঠিকানা (বাংলা)', titleEn: 'Present Address (Bangla)' },
  { titleBn: 'বর্তমান ঠিকানা (ইংরেজি)', titleEn: 'Present Address (English)' },
  { titleBn: 'স্থায়ী ঠিকানা (বাংলা)', titleEn: 'Permanent Address (Bangla)' },
  { titleBn: 'স্থায়ী ঠিকানা (ইংরেজি)', titleEn: 'Permanent Address (English)' },
  { titleBn: 'বাসস্থান', titleEn: 'Housing' },
  { titleBn: 'আর্থিক তথ্য', titleEn: 'Financial' },
  { titleBn: 'পর্যালোচনা', titleEn: 'Preview' },
] as const

const LAST_STEP = STEPS.length - 1

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [account, setAccount] = useState<AccountFormData>({ email: '', password: '' })
  const [citizen, setCitizen] = useState<CitizenFormData>(defaultCitizenForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Keep the permanent address mirroring the present one while the box is
  // ticked, including edits made to the present address afterwards.
  useEffect(() => {
    if (citizen.same_as_present) {
      setCitizen((prev) => ({ ...prev, permanent_address: { ...prev.address } }))
    }
  }, [citizen.same_as_present, citizen.address])

  const updateCitizen = <K extends keyof CitizenFormData>(field: K, value: CitizenFormData[K]) => {
    setCitizen((prev) => ({ ...prev, [field]: value }))
  }

  const updateHousing = (patch: Partial<CitizenFormData['housing_info']>) =>
    updateCitizen('housing_info', { ...citizen.housing_info, ...patch })

  const updateFinancial = (patch: Partial<CitizenFormData['financial_info']>) =>
    updateCitizen('financial_info', { ...citizen.financial_info, ...patch })

  /** Each step validates only the fields it shows, so the walk forward is incremental. */
  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!EMAIL_RE.test(account.email)) return 'সঠিক ইমেইল দিন / Enter a valid email address'
      if (account.password.length < 8) return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে / Password must be at least 8 characters'
      if (!PASSWORD_RE.test(account.password)) {
        return 'পাসওয়ার্ডে বড় হাতের, ছোট হাতের অক্ষর এবং সংখ্যা থাকতে হবে / Password must contain uppercase, lowercase, and a number'
      }
      return null
    }
    if (index === 1) {
      const required: Array<[string, string]> = [
        [citizen.name_bn.trim(), 'নাম (বাংলা) আবশ্যক / Name (Bangla) is required'],
        [citizen.father_name_bn.trim(), 'পিতার নাম (বাংলা) আবশ্যক'],
        [citizen.mother_name_bn.trim(), 'মাতার নাম (বাংলা) আবশ্যক'],
      ]
      const failed = required.find(([value]) => !value)
      return failed ? failed[1] : null
    }
    if (index === 2) {
      const required: Array<[string, string]> = [
        [citizen.name_en.trim(), 'Name (English) is required'],
        [citizen.father_name_en.trim(), "Father's Name (English) is required"],
        [citizen.mother_name_en.trim(), "Mother's Name (English) is required"],
      ]
      const failed = required.find(([value]) => !value)
      return failed ? failed[1] : null
    }
    if (index === 3) {
      const required: Array<[string, string]> = [
        [citizen.date_of_birth, 'জন্ম তারিখ আবশ্যক / Date of birth is required'],
        [citizen.mobile.trim(), 'মোবাইল নম্বর আবশ্যক / Mobile number is required'],
      ]
      const failed = required.find(([value]) => !value)
      return failed ? failed[1] : null
    }
    if (index === 5) {
      const required: Array<[string, string]> = [
        [citizen.address.village_bn.trim(), 'গ্রাম (বাংলা) আবশ্যক / Village (Bangla) is required'],
        [citizen.address.post_office_bn.trim(), 'ডাকঘর (বাংলা) আবশ্যক / Post office (Bangla) is required'],
        [citizen.address.thana_bn.trim(), 'থানা (বাংলা) আবশ্যক / Thana (Bangla) is required'],
        [citizen.address.district_bn.trim(), 'জেলা (বাংলা) আবশ্যক / District (Bangla) is required'],
      ]
      const failed = required.find(([value]) => !value)
      return failed ? failed[1] : null
    }
    if (index === 6) {
      const required: Array<[string, string]> = [
        [citizen.address.village_en.trim(), 'Village (English) is required'],
        [citizen.address.post_office_en.trim(), 'Post office (English) is required'],
        [citizen.address.thana_en.trim(), 'Thana (English) is required'],
        [citizen.address.district_en.trim(), 'District (English) is required'],
        [String(citizen.address.ward_no), 'ওয়ার্ড নম্বর আবশ্যক / Ward number is required'],
      ]
      const failed = required.find(([value]) => !value)
      return failed ? failed[1] : null
    }
    return null
  }

  const goNext = () => {
    const stepError = validateStep(step)
    if (stepError) {
      setError(stepError)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, LAST_STEP))
  }

  const goBack = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    setError(null)

    const citizenError = validateCitizenForm(citizen)
    if (citizenError) {
      setError(citizenError)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: citizen.name_en.trim(),
          email: account.email,
          password: account.password,
          mobile: citizen.mobile.trim(),
          citizen_data: buildCitizenPayload(citizen),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg =
          typeof data.errors === 'object'
            ? Object.values(data.errors).flat().join(', ')
            : data.message
        setError(msg ?? 'Registration failed')
        return
      }

      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('registrationSubmitted')}</h2>
          <p className="text-sm text-gray-600 mb-6">
            {t('registrationSubmittedMsg')}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="text-green-700 hover:underline text-sm font-medium"
          >
            {t('backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image src="/logo.svg" alt={t('appName')} width={64} height={64} priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('appName')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('appSubtitle')}</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('citizenRegistration')}</h2>
          <p className="text-xs text-gray-500 mb-6">
            {t('accountPendingNote')}
          </p>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, index) => (
              <div key={s.titleEn} className="flex items-center gap-1 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${index === step
                      ? 'bg-green-700 text-white'
                      : index < step
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'}`}
                  title={`${s.titleBn} / ${s.titleEn}`}
                >
                  {index < step ? '✓' : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-4 h-0.5 ${index < step ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            ধাপ / Step {step + 1}/{STEPS.length} — {STEPS[step].titleBn} / {STEPS[step].titleEn}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {step === 0 && (
            <FormSection titleBn="লগইন তথ্য" titleEn="Login Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label={t('emailAddress')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={account.email}
                  onChange={(v) => setAccount((f) => ({ ...f, email: v }))}
                  placeholder="you@example.com"
                />
                <TextField
                  label={t('password')}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={account.password}
                  onChange={(v) => setAccount((f) => ({ ...f, password: v }))}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('passwordHint')}</p>
            </FormSection>
          )}

          {step === 1 && (
            <FormSection titleBn="নাম (বাংলা)" titleEn="Names (Bangla)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="নাম (বাংলা)"
                  name="name_bn"
                  required
                  value={citizen.name_bn}
                  onChange={(v) => updateCitizen('name_bn', filterBangla(v))}
                  placeholder="পূর্ণ নাম বাংলায়"
                />
                <TextField
                  label="পিতার নাম (বাংলা)"
                  name="father_name_bn"
                  required
                  value={citizen.father_name_bn}
                  onChange={(v) => updateCitizen('father_name_bn', filterBangla(v))}
                  placeholder="পিতার নাম বাংলায়"
                />
                <TextField
                  label="মাতার নাম (বাংলা)"
                  name="mother_name_bn"
                  required
                  value={citizen.mother_name_bn}
                  onChange={(v) => updateCitizen('mother_name_bn', filterBangla(v))}
                  placeholder="মাতার নাম বাংলায়"
                />
                <TextField
                  label="স্বামী/স্ত্রীর নাম (বাংলা)"
                  name="spouse_name_bn"
                  value={citizen.spouse_name_bn}
                  onChange={(v) => updateCitizen('spouse_name_bn', filterBangla(v))}
                  placeholder="স্বামী/স্ত্রীর নাম বাংলায়"
                />
              </div>
            </FormSection>
          )}

          {step === 2 && (
            <FormSection titleBn="নাম (ইংরেজি)" titleEn="Names (English)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Name (English)"
                  name="name_en"
                  autoComplete="name"
                  required
                  value={citizen.name_en}
                  onChange={(v) => updateCitizen('name_en', filterEnglish(v))}
                  placeholder="Full name in English"
                />
                <TextField
                  label="Father's Name (English)"
                  name="father_name_en"
                  required
                  value={citizen.father_name_en}
                  onChange={(v) => updateCitizen('father_name_en', filterEnglish(v))}
                  placeholder="Father's name in English"
                />
                <TextField
                  label="Mother's Name (English)"
                  name="mother_name_en"
                  required
                  value={citizen.mother_name_en}
                  onChange={(v) => updateCitizen('mother_name_en', filterEnglish(v))}
                  placeholder="Mother's name in English"
                />
                <TextField
                  label="Spouse Name (English)"
                  name="spouse_name_en"
                  value={citizen.spouse_name_en}
                  onChange={(v) => updateCitizen('spouse_name_en', filterEnglish(v))}
                  placeholder="Spouse name in English"
                />
              </div>
            </FormSection>
          )}

          {step === 3 && (
            <FormSection titleBn="ব্যক্তিগত বিবরণ" titleEn="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="জন্ম তারিখ / Date of Birth"
                  name="date_of_birth"
                  type="date"
                  autoComplete="bday"
                  required
                  value={citizen.date_of_birth}
                  onChange={(v) => updateCitizen('date_of_birth', v)}
                />
                <SelectField
                  label="লিঙ্গ / Gender"
                  name="gender"
                  autoComplete="sex"
                  required
                  value={citizen.gender}
                  onChange={(v) => updateCitizen('gender', v as Gender)}
                  options={SELECT_OPTIONS.gender}
                />
                <TextField
                  label="মোবাইল নম্বর / Mobile"
                  name="mobile"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={citizen.mobile}
                  onChange={(v) => updateCitizen('mobile', v)}
                  placeholder="01XXXXXXXXX"
                />
                <SelectField
                  label="রক্তের গ্রুপ / Blood Group"
                  name="blood_group"
                  value={citizen.blood_group}
                  onChange={(v) => updateCitizen('blood_group', v as BloodGroup | '')}
                  options={SELECT_OPTIONS.blood_group}
                />
                <SelectField
                  label="ধর্ম / Religion"
                  name="religion"
                  value={citizen.religion}
                  onChange={(v) => updateCitizen('religion', v as Religion | '')}
                  options={SELECT_OPTIONS.religion}
                />
                <SelectField
                  label="বৈবাহিক অবস্থা / Marital Status"
                  name="marital_status"
                  value={citizen.marital_status}
                  onChange={(v) => updateCitizen('marital_status', v as MaritalStatus | '')}
                  options={SELECT_OPTIONS.marital_status}
                />
                <SelectField
                  label="শিক্ষাগত যোগ্যতা / Education Level"
                  name="education_level"
                  value={citizen.education_level}
                  onChange={(v) => updateCitizen('education_level', v as EducationLevel | '')}
                  options={SELECT_OPTIONS.education_level}
                />
              </div>
            </FormSection>
          )}

          {step === 4 && (
            <FormSection titleBn="পরিচয়পত্র" titleEn="Identification" optional>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="জাতীয় পরিচয়পত্র নম্বর / NID Number"
                  name="nid_no"
                  value={citizen.nid_no}
                  onChange={(v) => updateCitizen('nid_no', v)}
                  placeholder="জাতীয় পরিচয়পত্র নম্বর"
                />
                <TextField
                  label="জন্ম নিবন্ধন নম্বর / Birth Certificate No"
                  name="birth_cert_no"
                  value={citizen.birth_cert_no}
                  onChange={(v) => updateCitizen('birth_cert_no', v)}
                  placeholder="জন্ম নিবন্ধন নম্বর"
                />
              </div>
            </FormSection>
          )}

          {step === 5 && (
            <FormSection titleBn="বর্তমান ঠিকানা (বাংলা)" titleEn="Present Address (Bangla)">
              <AddressFields
                value={citizen.address}
                onChange={(addr) => updateCitizen('address', addr)}
                required
                lang="bn"
              />
            </FormSection>
          )}

          {step === 6 && (
            <FormSection titleBn="বর্তমান ঠিকানা (ইংরেজি)" titleEn="Present Address (English)">
              <AddressFields
                value={citizen.address}
                onChange={(addr) => updateCitizen('address', addr)}
                required
                lang="en"
              />
            </FormSection>
          )}

          {step === 7 && (
            <FormSection titleBn="স্থায়ী ঠিকানা (বাংলা)" titleEn="Permanent Address (Bangla)" optional>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="same_as_present"
                    checked={citizen.same_as_present}
                    onChange={(e) => updateCitizen('same_as_present', e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="same_as_present" className="text-sm text-gray-700">
                    বর্তমান ঠিকানার অনুরূপ / Same as present address
                  </label>
                </div>
                <AddressFields
                  value={citizen.same_as_present ? citizen.address : citizen.permanent_address}
                  onChange={(addr) => updateCitizen('permanent_address', addr)}
                  disabled={citizen.same_as_present}
                  lang="bn"
                />
              </div>
            </FormSection>
          )}

          {step === 8 && (
            <FormSection titleBn="স্থায়ী ঠিকানা (ইংরেজি)" titleEn="Permanent Address (English)" optional>
              <AddressFields
                value={citizen.same_as_present ? citizen.address : citizen.permanent_address}
                onChange={(addr) => updateCitizen('permanent_address', addr)}
                disabled={citizen.same_as_present}
                lang="en"
              />
            </FormSection>
          )}

          {step === 9 && (
            <FormSection titleBn="বাসস্থানের তথ্য" titleEn="Housing Information" optional>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SelectField
                  label="ঘরের ধরন / House Type"
                  name="house_type"
                  placeholder="নির্বাচন করুন"
                  value={citizen.housing_info.house_type}
                  onChange={(v) => updateHousing({ house_type: v as HouseType | '' })}
                  options={SELECT_OPTIONS.house_type}
                />
                <SelectField
                  label="মালিকানার ধরন / Ownership Type"
                  name="ownership_type"
                  placeholder="নির্বাচন করুন"
                  value={citizen.housing_info.ownership_type}
                  onChange={(v) => updateHousing({ ownership_type: v as OwnershipType | '' })}
                  options={SELECT_OPTIONS.ownership_type}
                />
                <TextField
                  label="মোট কক্ষ সংখ্যা / Total Rooms"
                  name="total_rooms"
                  type="number"
                  min="0"
                  value={citizen.housing_info.total_rooms}
                  onChange={(v) => updateHousing({ total_rooms: v })}
                  placeholder="0"
                />
              </div>
            </FormSection>
          )}

          {step === 10 && (
            <FormSection titleBn="আর্থিক তথ্য" titleEn="Financial Information" optional>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  label="বার্ষিক আয় (টাকা) / Annual Income (BDT)"
                  name="annual_income"
                  type="number"
                  min="0"
                  value={citizen.financial_info.annual_income}
                  onChange={(v) => updateFinancial({ annual_income: v })}
                  placeholder="0"
                />
                <TextField
                  label="পেশা / Occupation"
                  name="occupation"
                  autoComplete="organization-title"
                  value={citizen.financial_info.occupation}
                  onChange={(v) => updateFinancial({ occupation: v })}
                  placeholder="পেশার নাম"
                />
                <TextField
                  label="জমির পরিমাণ (শতক) / Land Owned (Dec)"
                  name="land_owned_dec"
                  type="number"
                  min="0"
                  step="0.01"
                  value={citizen.financial_info.land_owned_dec}
                  onChange={(v) => updateFinancial({ land_owned_dec: v })}
                  placeholder="0.00"
                />
              </div>
            </FormSection>
          )}

          {step === LAST_STEP && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg bg-gray-50/50 px-4 py-3">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">লগইন তথ্য / Login Information</h4>
                <p className="text-sm text-gray-900">{account.email}</p>
              </div>
              <CitizenFormPreview
                data={citizen}
                onEdit={() => setStep(0)}
                onSubmit={handleSubmit}
                saving={loading}
                errorMsg=""
              />
            </div>
          )}

          {step !== LAST_STEP && (
            <div className="flex justify-between gap-3 pt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                পূর্ববর্তী / Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800"
              >
                পরবর্তী / Next
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-green-700 hover:underline font-medium">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
