'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { renderCertificateTemplate, renderOfficialCertificateLayout, type CitizenInfo } from '@/lib/utils/certificate-render'
import { useUser } from '@/hooks/useUser'

interface Address {
  village_bn: string
  village_en: string
  post_office_bn: string
  post_office_en: string
  thana_bn: string
  thana_en: string
  district_bn: string
  district_en: string
  ward_no: number
}

export interface CitizenForCert {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  nid_no?: string
  date_of_birth?: string
  mobile?: string
  address?: Address
}

interface DynamicField {
  field_key: string
  field_label: string
  field_type: 'text' | 'date' | 'number' | 'select'
  options: string[]
  required: boolean
  default_value?: string
}

interface CertificateTemplate {
  _id: string
  name: string
  certificate_category: string
  language: string
  body_template: string
  fee: number
  dynamic_fields: DynamicField[]
}

interface UnionMember {
  name_bn: string
  name_en: string
  designation_bn: string
  designation_en: string
  mobile?: string
}

interface SystemSettings {
  union_name_bn: string
  union_name_en: string
  chairman_name_bn: string
  chairman_name_en: string
  union_logo?: string | null
  address_bn: string
  address_en: string
  members: UnionMember[]
}

interface EditableCertificateInfo {
  person_name: string
  father_name: string
  mother_name: string
  address: string
}

function formatCertificateAddress(address: Address | undefined, language: 'bn' | 'en'): string {
  if (!address) return ''

  const village = language === 'bn' ? address.village_bn : address.village_en
  const postOffice = language === 'bn' ? address.post_office_bn : address.post_office_en
  const thana = language === 'bn' ? address.thana_bn : address.thana_en
  const district = language === 'bn' ? address.district_bn : address.district_en

  return [
    village && `${language === 'bn' ? 'গ্রাম' : 'Village'}: ${village}`,
    postOffice && `${language === 'bn' ? 'ডাকঘর' : 'Post Office'}: ${postOffice}`,
    thana && `${language === 'bn' ? 'উপজেলা' : 'Upazila'}: ${thana}`,
    district && `${language === 'bn' ? 'জেলা' : 'District'}: ${district}`,
  ].filter(Boolean).join(', ')
}

function buildEditableCertificateInfo(citizen: CitizenForCert, language: 'bn' | 'en'): EditableCertificateInfo {
  return {
    person_name: language === 'bn' ? (citizen.name_bn || '') : (citizen.name_en || ''),
    father_name: language === 'bn' ? (citizen.father_name_bn || '') : (citizen.father_name_en || ''),
    mother_name: language === 'bn' ? (citizen.mother_name_bn || '') : (citizen.mother_name_en || ''),
    address: formatCertificateAddress(citizen.address, language),
  }
}

type Step = 'language' | 'template' | 'preview'
const STEPS: Step[] = ['language', 'template', 'preview']
const STEP_LABELS: Record<Step, string> = { language: 'Language', template: 'Template', preview: 'Preview' }

interface Props {
  open: boolean
  onClose: () => void
  citizen: CitizenForCert
  onSuccess: () => void
}

export default function IssueCertificateModal({ open, onClose, citizen, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('language')
  const [language, setLanguage] = useState('bn')
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null)
  const [dynamicData, setDynamicData] = useState<Record<string, string>>({})
  const [certificateInfo, setCertificateInfo] = useState<EditableCertificateInfo>(
    buildEditableCertificateInfo(citizen, 'bn'),
  )
  const [editingInfo, setEditingInfo] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data: settings } = useApi<SystemSettings>('/api/system-settings')
  const currentUser = useUser();
  const isCitizen = currentUser?.role === 'citizen';

  const fetchTemplates = async (lang: string) => {
    setTemplatesLoading(true)
    try {
      const res = await apiCall(`/api/certificate-templates?language=${lang}&is_active=true&limit=100`)
      if (res.ok) {
        const d = await res.json()
        setTemplates(d.data || d.templates || [])
      } else {
        setTemplates([])
      }
    } catch {
      setTemplates([])
    }
    setTemplatesLoading(false)
  }

  const selectTemplate = (template: CertificateTemplate) => {
    setSelectedTemplate(template)
    const initial: Record<string, string> = {}
    template.dynamic_fields?.forEach((field) => {
      initial[field.field_key] = field.default_value || ''
    })
    setDynamicData(initial)
    setCertificateInfo(buildEditableCertificateInfo(citizen, language as 'bn' | 'en'))
    setEditingInfo(false)
  }

  const goToTemplate = () => {
    fetchTemplates(language)
    setSelectedTemplate(null)
    setDynamicData({})
    setStep('template')
  }

  const goToPreview = () => {
    if (!selectedTemplate) {
      toast.error('Please select a certificate template.')
      return
    }
    setStep('preview')
  }

  const handleSubmit = async () => {
    setSaving(true)
    const res = await apiCall('/api/certificates', {
      method: 'POST',
      body: JSON.stringify({
        language,
        certificate_type: selectedTemplate!.certificate_category,
        citizen_id: citizen._id,
        template_id: selectedTemplate!._id,
        dynamic_data: {
          ...dynamicData,
          certificate_person_name: certificateInfo.person_name,
          certificate_father_name: certificateInfo.father_name,
          certificate_mother_name: certificateInfo.mother_name,
          certificate_address: certificateInfo.address,
        },
      }),
    })
    setSaving(false)
    if (res.ok) {
      handleReset()
      onSuccess()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.message ?? 'Failed to issue certificate.')
    }
  }

  const handleReset = () => {
    setStep('language')
    setLanguage('bn')
    setTemplates([])
    setSelectedTemplate(null)
    setDynamicData({})
    setCertificateInfo(buildEditableCertificateInfo(citizen, 'bn'))
    setEditingInfo(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const renderCertificateContent = () => {
    if (!selectedTemplate) return ''

    const today = new Date()
    const isBn = language === 'bn'
    const issueDateBn = today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
    const issueDateEn = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const unionMembersTextBn = settings?.members?.length
      ? settings.members
          .map((member) => [member.name_bn, member.designation_bn, member.mobile].filter(Boolean).join(', '))
          .join('\n')
      : ''
    const unionMembersTextEn = settings?.members?.length
      ? settings.members
          .map((member) => [member.name_en, member.designation_en, member.mobile].filter(Boolean).join(', '))
          .join('\n')
      : ''
    const unionNameBn = settings?.union_name_bn || 'ইউনিয়ন পরিষদ'
    const unionNameEn = settings?.union_name_en || 'Union Parishad'
    const chairmanNameBn = settings?.chairman_name_bn || ''
    const chairmanNameEn = settings?.chairman_name_en || ''
    const unionAddressBn = settings?.address_bn || ''
    const unionAddressEn = settings?.address_en || ''

    const dob = citizen.date_of_birth
      ? new Date(citizen.date_of_birth).toLocaleDateString(
          isBn ? 'bn-BD' : 'en-GB',
          { day: '2-digit', month: '2-digit', year: 'numeric' },
        )
      : undefined

    const citizenInfo: CitizenInfo = {
      name: certificateInfo.person_name,
      fatherName: certificateInfo.father_name,
      motherName: certificateInfo.mother_name,
      dateOfBirth: dob,
      nidNo: citizen.nid_no || undefined,
      wardNo: citizen.address?.ward_no !== undefined ? String(citizen.address.ward_no) : undefined,
      presentAddress: certificateInfo.address || undefined,
      mobile: citizen.mobile || undefined,
    }

    const replacements: Record<string, string> = {
      citizen_name_bn: isBn ? certificateInfo.person_name : (citizen.name_bn || ''),
      citizen_name_en: isBn ? (citizen.name_en || '') : certificateInfo.person_name,
      father_name_bn: isBn ? certificateInfo.father_name : (citizen.father_name_bn || ''),
      father_name_en: isBn ? (citizen.father_name_en || '') : certificateInfo.father_name,
      mother_name_bn: isBn ? certificateInfo.mother_name : (citizen.mother_name_bn || ''),
      mother_name_en: isBn ? (citizen.mother_name_en || '') : certificateInfo.mother_name,
      nid_no: citizen.nid_no || '',
      mobile: citizen.mobile || '',
      village_bn: citizen.address?.village_bn || '',
      village_en: citizen.address?.village_en || '',
      post_office_bn: citizen.address?.post_office_bn || '',
      post_office_en: citizen.address?.post_office_en || '',
      thana_bn: citizen.address?.thana_bn || '',
      thana_en: citizen.address?.thana_en || '',
      district_bn: citizen.address?.district_bn || '',
      district_en: citizen.address?.district_en || '',
      ward_no: String(citizen.address?.ward_no || ''),
      issue_date: language === 'bn' ? issueDateBn : issueDateEn,
      certificate_no: '',
      union_name: language === 'bn' ? unionNameBn : unionNameEn,
      union_name_bn: unionNameBn,
      union_name_en: unionNameEn,
      chairman_name: language === 'bn' ? chairmanNameBn : chairmanNameEn,
      chairman_name_bn: chairmanNameBn,
      chairman_name_en: chairmanNameEn,
      union_address: language === 'bn' ? unionAddressBn : unionAddressEn,
      union_address_bn: unionAddressBn,
      union_address_en: unionAddressEn,
      union_logo_url: settings?.union_logo || '',
      union_members_text: language === 'bn' ? unionMembersTextBn : unionMembersTextEn,
      union_members_text_bn: unionMembersTextBn,
      union_members_text_en: unionMembersTextEn,
      upazila_name: '',
      district_name: '',
      verification_url: '',
    }

    const contentHtml = renderCertificateTemplate({
      templateHtml: selectedTemplate.body_template,
      replacements,
      dynamicData,
      rawReplacements: {
        verification_qr: '',
        verification_qr_html: '',
      },
      certificateNo: '',
    })

    return renderOfficialCertificateLayout({
      contentHtml,
      citizenInfo,
      language: isBn ? 'bn' : 'en',
      status: 'draft',
      unionName: replacements.union_name,
      unionAddress: replacements.union_address,
      chairmanName: replacements.chairman_name,
      unionLogoUrl: replacements.union_logo_url,
      certificateTitle: selectedTemplate.name,
      certificateNo: '',
      issueDate: replacements.issue_date,
      verificationUrl: '',
      qrHtml: '',
    })
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isCitizen ? "Apply for Certificate" : "Issue New Certificate"}
      size="lg"
    >
      <div className="mb-6 flex items-center">
        {STEPS.map((currentStep, index) => (
          <div key={currentStep} className="flex flex-1 items-center">
            <div className="flex flex-shrink-0 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  index < stepIndex
                    ? 'border-green-700 bg-green-700 text-white'
                    : index === stepIndex
                      ? 'border-green-700 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {index < stepIndex ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  index === stepIndex
                    ? 'text-green-700'
                    : index < stepIndex
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                {STEP_LABELS[currentStep]}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`mx-3 h-0.5 flex-1 ${index < stepIndex ? 'bg-green-700' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 'language' && (
        <div className="space-y-5">
          <div>
            <p className="mb-4 text-sm text-gray-600">
              Select the language for the certificate / সনদের ভাষা নির্বাচন করুন
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: 'bn', title: 'বাংলা', subtitle: 'Bengali' },
                { val: 'en', title: 'English', subtitle: 'ইংরেজি' },
              ].map(({ val, title, subtitle }) => (
                <button
                  key={val}
                  onClick={() => {
                    setLanguage(val)
                    setCertificateInfo(buildEditableCertificateInfo(citizen, val as 'bn' | 'en'))
                  }}
                  className={`rounded-xl border-2 p-5 text-left transition-all ${
                    language === val
                      ? 'border-green-700 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className={`mb-1 text-2xl font-bold ${language === val ? 'text-green-700' : 'text-gray-800'}`}>
                    {title}
                  </p>
                  <p className="text-xs text-gray-500">{subtitle}</p>
                  {language === val && (
                    <p className="mt-2 text-xs font-medium text-green-600">✓ Selected</p>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
            <button onClick={handleClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={goToTemplate}
              className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 'template' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {(citizen.name_bn || citizen.name_en || 'C')[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{citizen.name_bn}</p>
              <p className="text-xs text-gray-500">
                {citizen.name_en} • {language === 'bn' ? 'বাংলা সনদ' : 'English Certificate'}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Available Templates
            </p>
            {templatesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No active templates found for {language === 'bn' ? 'Bengali' : 'English'}. Please configure
                templates in the admin panel.
              </div>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {templates.map((template) => (
                  <button
                    key={template._id}
                    onClick={() => selectTemplate(template)}
                    className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                      selectedTemplate?._id === template._id
                        ? 'border-green-700 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${selectedTemplate?._id === template._id ? 'text-green-800' : 'text-gray-800'}`}>
                          {template.name}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-gray-400">
                          {template.certificate_category?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0 text-right">
                        <span className={`text-sm font-bold ${selectedTemplate?._id === template._id ? 'text-green-700' : 'text-gray-600'}`}>
                          ৳{template.fee}
                        </span>
                        {selectedTemplate?._id === template._id && (
                          <p className="text-xs text-green-600">✓</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTemplate && selectedTemplate.dynamic_fields?.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Additional Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedTemplate.dynamic_fields.map((field) => (
                  <div key={field.field_key}>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {field.field_label}
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {field.field_type === 'select' ? (
                      <select
                        value={dynamicData[field.field_key] || ''}
                        onChange={(event) =>
                          setDynamicData((current) => ({ ...current, [field.field_key]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
                        value={dynamicData[field.field_key] || ''}
                        onChange={(event) =>
                          setDynamicData((current) => ({ ...current, [field.field_key]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTemplate && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-sm font-medium text-green-800">Certificate Fee</span>
              <span className="text-xl font-bold text-green-700">৳ {selectedTemplate.fee}</span>
            </div>
          )}


          <div className="flex justify-between border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setStep('language')
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={goToPreview}
              disabled={!selectedTemplate}
              className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Preview →
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Citizen</p>
              <p className="text-sm font-semibold leading-tight text-gray-900">{citizen.name_bn}</p>
              <p className="mt-0.5 text-xs text-gray-500">{citizen.name_en}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Template</p>
              <p className="text-sm font-semibold leading-tight text-gray-900">{selectedTemplate?.name}</p>
              <p className="mt-0.5 text-xs capitalize text-gray-500">
                {selectedTemplate?.certificate_category?.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-green-600">Fee</p>
              <p className="text-xl font-bold text-green-700">৳ {selectedTemplate?.fee}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Approval Required</p>
            <p className="mt-1 text-sm text-amber-900">
              Certificate number and verification QR will be generated only after admin approval.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Certificate Information</p>
                <p className="text-xs text-gray-500">Edit only this certificate content. The template will not change.</p>
              </div>
              <button
                onClick={() => setEditingInfo((current) => !current)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {editingInfo ? 'Done Editing' : 'Edit Information'}
              </button>
            </div>

            {editingInfo ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
                  <input
                    value={certificateInfo.person_name}
                    onChange={(event) =>
                      setCertificateInfo((current) => ({ ...current, person_name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Father&apos;s Name</label>
                  <input
                    value={certificateInfo.father_name}
                    onChange={(event) =>
                      setCertificateInfo((current) => ({ ...current, father_name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Mother&apos;s Name</label>
                  <input
                    value={certificateInfo.mother_name}
                    onChange={(event) =>
                      setCertificateInfo((current) => ({ ...current, mother_name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
                  <textarea
                    rows={3}
                    value={certificateInfo.address}
                    onChange={(event) =>
                      setCertificateInfo((current) => ({ ...current, address: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Name:</strong> {certificateInfo.person_name || '-'}</p>
                <p><strong>Father&apos;s Name:</strong> {certificateInfo.father_name || '-'}</p>
                <p><strong>Mother&apos;s Name:</strong> {certificateInfo.mother_name || '-'}</p>
                <p><strong>Address:</strong> {certificateInfo.address || '-'}</p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-center text-xs uppercase tracking-widest text-gray-400">
              A4 Certificate Preview
            </p>
            <div
              className="overflow-auto rounded-xl border border-gray-300 bg-gray-200"
              style={{ padding: '16px', maxHeight: '480px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    zoom: 0.72,
                    width: '794px',
                    minHeight: '1123px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                    boxSizing: 'border-box',
                    fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
                    fontSize: '14px',
                    lineHeight: '1.8',
                    color: '#111',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderCertificateContent() }}
                />
              </div>
            </div>
          </div>


          <div className="flex justify-between border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setStep('template')
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Back To Template
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isCitizen ? 'Applying...' : 'Issuing...'}
                  </>
                ) : (
                  isCitizen ? 'Apply for Certificate' : 'Issue Certificate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

