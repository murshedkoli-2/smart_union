'use client'

/**
 * The issue dialog's three-step machine: language → template → preview.
 *
 * Holds every piece of state the steps read and the transitions between them,
 * so each step component is markup plus callbacks.
 */
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { apiCall } from '@/lib/utils/api-client'
import { buildEditableCertificateInfo } from './certificate-info'
import type {
  CertificateTemplate,
  CitizenForCert,
  EditableCertificateInfo,
} from '@/types/certificate.types'

export type Step = 'language' | 'template' | 'preview'
export const STEPS: Step[] = ['language', 'template', 'preview']
export const STEP_LABELS: Record<Step, string> = {
  language: 'Language',
  template: 'Template',
  preview: 'Preview',
}

export function useIssueCertificate(citizen: CitizenForCert, onSuccess: () => void) {
  const [step, setStep] = useState<Step>('language')
  const [language, setLanguage] = useState('bn')
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null)
  const [dynamicData, setDynamicData] = useState<Record<string, string>>({})
  const [certificateInfo, setCertificateInfo] = useState<EditableCertificateInfo>(() =>
    buildEditableCertificateInfo(citizen, 'bn'),
  )
  const [editingInfo, setEditingInfo] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setStep('language')
    setLanguage('bn')
    setTemplates([])
    setSelectedTemplate(null)
    setDynamicData({})
    setCertificateInfo(buildEditableCertificateInfo(citizen, 'bn'))
    setEditingInfo(false)
  }, [citizen])

  /** Switching language re-seeds the editable fields in that language. */
  const chooseLanguage = useCallback(
    (next: string) => {
      setLanguage(next)
      setCertificateInfo(buildEditableCertificateInfo(citizen, next as 'bn' | 'en'))
    },
    [citizen],
  )

  const goToTemplateStep = useCallback(async () => {
    setSelectedTemplate(null)
    setDynamicData({})
    setStep('template')
    setTemplatesLoading(true)

    try {
      const res = await apiCall(
        `/api/certificate-templates?language=${language}&is_active=true&limit=100`,
      )
      const body = res.ok ? await res.json() : null
      setTemplates(body?.data || body?.templates || [])
    } catch {
      setTemplates([])
    }

    setTemplatesLoading(false)
  }, [language])

  /** Selecting a template seeds its dynamic fields with their defaults. */
  const selectTemplate = useCallback(
    (template: CertificateTemplate) => {
      setSelectedTemplate(template)
      setDynamicData(
        Object.fromEntries(
          (template.dynamic_fields ?? []).map((field) => [
            field.field_key,
            field.default_value || '',
          ]),
        ),
      )
      setCertificateInfo(buildEditableCertificateInfo(citizen, language as 'bn' | 'en'))
      setEditingInfo(false)
    },
    [citizen, language],
  )

  const goToPreviewStep = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('Please select a certificate template.')
      return
    }
    setStep('preview')
  }, [selectedTemplate])

  const setDynamicValue = useCallback((key: string, value: string) => {
    setDynamicData((current) => ({ ...current, [key]: value }))
  }, [])

  const submit = useCallback(async () => {
    if (!selectedTemplate) return

    setSaving(true)
    const res = await apiCall('/api/certificates', {
      method: 'POST',
      body: JSON.stringify({
        language,
        certificate_type: selectedTemplate.certificate_category,
        citizen_id: citizen._id,
        template_id: selectedTemplate._id,
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
      reset()
      onSuccess()
      return
    }

    const body = await res.json().catch(() => ({}))
    toast.error(body.message ?? 'Failed to issue certificate.')
  }, [selectedTemplate, language, citizen._id, dynamicData, certificateInfo, reset, onSuccess])

  return {
    step,
    setStep,
    language,
    chooseLanguage,
    templates,
    templatesLoading,
    selectedTemplate,
    selectTemplate,
    dynamicData,
    setDynamicValue,
    certificateInfo,
    setCertificateInfo,
    editingInfo,
    setEditingInfo,
    saving,
    reset,
    goToTemplateStep,
    goToPreviewStep,
    submit,
  }
}
