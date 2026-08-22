'use client'

import { useState, use } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import QRCode from 'qrcode'
import { generateFamilyApplicationHtml } from '@/lib/utils/family-application-render'
import {
  generateFamilyCertificateBnHtml,
  generateFamilyCertificateEnHtml,
  type FamilyCertificateData,
} from '@/lib/utils/family-certificate-render'
import { generateWarishApplicationHtml } from '@/lib/utils/warish-application-render'
import {
  generateWarishCertificateBnHtml,
  generateWarishCertificateEnHtml,
  type WarishCertificateData,
} from '@/lib/utils/warish-certificate-render'

const formatDate = (date: string | Date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

interface Heir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: string
  nid_no: string
}

interface ApplicantCitizen {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  mobile: string
  nid_no?: string
  address?: Record<string, unknown>
}

interface WarishPageSettings {
  union_name_bn?: string
  union_name_en?: string
  address_bn?: string
  address_en?: string
  chairman_name_bn?: string
  chairman_name_en?: string
  union_logo?: string | null
}

interface EditFormState {
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn: string
  deceased_mother_name_en: string
  deceased_nid: string
  date_of_death: string
  heirs: Heir[]
  family_members: Heir[]
}

interface WarishApplication {
  _id: string
  application_type: 'warish' | 'family_certificate'
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  deceased_nid?: string
  date_of_death: string
  applicant_citizen_id: ApplicantCitizen | null
  heirs: Heir[]
  family_members?: Heir[]
  status: string
  payment_id?: unknown
  certificate_id?: string | { _id: string }
  certificate_id_bn?: string | { _id: string; status: string }
  certificate_id_en?: string | { _id: string; status: string }
  createdAt: string
  approved_at?: string
  approved_by?: { name: string }
}

const certId = (ref: string | { _id: string } | undefined): string | null =>
  !ref ? null : typeof ref === 'string' ? ref : ref._id

// Workflow steps config
const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
]

function WorkflowStatus({ status }: { status: string }) {
  const getStepState = (stepKey: string) => {
    if (status === 'draft') return stepKey === 'draft' ? 'active' : 'pending'
    if (status === 'pending') {
      if (stepKey === 'draft') return 'done'
      if (stepKey === 'pending') return 'active'
      return 'pending'
    }
    if (status === 'approved') return 'done'
    return 'pending'
  }

  return (
    <div className="flex items-center gap-0">
      {WORKFLOW_STEPS.map((step, idx) => {
        const state = getStepState(step.key)
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all
                ${state === 'done' ? 'bg-green-600 text-white' :
                  state === 'active' ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-gray-100 text-gray-400'}`}>
                {state === 'done' ? '✓' : idx + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap
                ${state === 'done' ? 'text-green-700' :
                  state === 'active' ? 'text-blue-700' :
                  'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 w-12 mx-1
                ${state === 'done' ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function WarishDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const currentUser = useUser()
  const canApprove = isSuperAdmin(currentUser)
  const [showEditModal, setShowEditModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  const { data: application, loading, error, refetch } = useApi<WarishApplication>(`/api/warish/${id}`, [id])
  const { data: settings } = useApi<WarishPageSettings>('/api/system-settings')
  const isFamilyCertificate = application?.application_type === 'family_certificate'
  const memberList = isFamilyCertificate ? (application?.family_members || []) : (application?.heirs || [])

  const [form, setForm] = useState<EditFormState | null>(null)

  const openEdit = () => {
    if (!application) return
    setForm({
      deceased_name_bn: application.deceased_name_bn,
      deceased_name_en: application.deceased_name_en,
      deceased_father_name_bn: application.deceased_father_name_bn,
      deceased_father_name_en: application.deceased_father_name_en,
      deceased_mother_name_bn: application.deceased_mother_name_bn || '',
      deceased_mother_name_en: application.deceased_mother_name_en || '',
      deceased_nid: application.deceased_nid || '',
      date_of_death: application.date_of_death ? application.date_of_death.split('T')[0] : '',
      heirs: [...application.heirs],
      family_members: [...(application.family_members || [])],
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    const res = await apiCall(`/api/warish/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(form),
    })
    setProcessing(false)
    if (res.ok) {
      toast.success('Application updated successfully')
      setShowEditModal(false)
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message || 'Failed to update')
    }
  }

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit this application for review?')) return
    setProcessing(true)
    const res = await apiCall(`/api/warish/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pending' }),
    })
    setProcessing(false)
    if (res.ok) {
      toast.success('Application submitted successfully')
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message || 'Submission failed')
    }
  }

  const handlePay = async () => {
    setProcessing(true)
    const res = await apiCall(`/api/warish/${id}/pay`, { method: 'POST' })
    setProcessing(false)
    if (res.ok) {
      toast.success('Payment processed successfully')
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message || 'Payment failed')
    }
  }

  const handleApprove = async () => {
    if (!confirm('Approve this application?')) return
    setProcessing(true)
    const res = await apiCall(`/api/warish/${id}/approve`, { method: 'POST' })
    setProcessing(false)
    if (res.ok) {
      toast.success('Application approved')
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message || 'Approval failed')
    }
  }

  const handleIssueCertificate = async (language: 'bn' | 'en') => {
    if (!application || !settings) return
    setProcessing(true)

    const res = await apiCall(`/api/warish/${id}/issue`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    })

    if (!res.ok) {
      const d = await res.json()
      toast.error(d.message || 'Certificate issuance failed')
      setProcessing(false)
      return
    }

    const payload = await res.json()
    const newlyIssuedCert = payload.data

    try {
      const certNo = newlyIssuedCert?.certificate_no || ''
      // The QR URL is built server-side from the certificate's verification
      // token. The client holds no token, so there is no fallback to construct.
      const verificationUrl = newlyIssuedCert?.qr_code_url || ''
      const qrDataUrl = verificationUrl ? await QRCode.toDataURL(verificationUrl, { width: 96, margin: 1 }) : undefined

      const html = isFamilyCertificate
        ? (
            language === 'bn'
              ? generateFamilyCertificateBnHtml({
                  isDraft: false,
                  certificateNo: certNo,
                  qr_code_url: qrDataUrl,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn || '',
                  applicant_name_en: application.applicant_citizen_id?.name_en || '',
                  father_name_bn: application.applicant_citizen_id?.father_name_bn || '',
                  father_name_en: application.applicant_citizen_id?.father_name_en || '',
                  mother_name_bn: application.applicant_citizen_id?.mother_name_bn || '',
                  mother_name_en: application.applicant_citizen_id?.mother_name_en || '',
                  nid_no: application.applicant_citizen_id?.nid_no || '',
                  present_address_bn: '',
                  present_address_en: '',
                  family_members: memberList,
                  union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies FamilyCertificateData)
              : generateFamilyCertificateEnHtml({
                  isDraft: false,
                  certificateNo: certNo,
                  qr_code_url: qrDataUrl,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn || '',
                  applicant_name_en: application.applicant_citizen_id?.name_en || '',
                  father_name_bn: application.applicant_citizen_id?.father_name_bn || '',
                  father_name_en: application.applicant_citizen_id?.father_name_en || '',
                  mother_name_bn: application.applicant_citizen_id?.mother_name_bn || '',
                  mother_name_en: application.applicant_citizen_id?.mother_name_en || '',
                  nid_no: application.applicant_citizen_id?.nid_no || '',
                  present_address_bn: '',
                  present_address_en: '',
                  family_members: memberList,
                  union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies FamilyCertificateData)
          )
        : (
            language === 'bn'
              ? generateWarishCertificateBnHtml({
                  isDraft: false,
                  certificateNo: certNo,
                  qr_code_url: qrDataUrl,
                  deceased_name_bn: application.deceased_name_bn,
                  deceased_name_en: application.deceased_name_en,
                  deceased_father_name_bn: application.deceased_father_name_bn,
                  deceased_father_name_en: application.deceased_father_name_en,
                  deceased_mother_name_bn: application.deceased_mother_name_bn,
                  deceased_mother_name_en: application.deceased_mother_name_en,
                  deceased_nid: application.deceased_nid,
                  date_of_death: application.date_of_death,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn,
                  applicant_name_en: application.applicant_citizen_id?.name_en,
                  heirs: memberList,
                  union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies WarishCertificateData)
              : generateWarishCertificateEnHtml({
                  isDraft: false,
                  certificateNo: certNo,
                  qr_code_url: qrDataUrl,
                  deceased_name_bn: application.deceased_name_bn,
                  deceased_name_en: application.deceased_name_en,
                  deceased_father_name_bn: application.deceased_father_name_bn,
                  deceased_father_name_en: application.deceased_father_name_en,
                  deceased_mother_name_bn: application.deceased_mother_name_bn,
                  deceased_mother_name_en: application.deceased_mother_name_en,
                  deceased_nid: application.deceased_nid,
                  date_of_death: application.date_of_death,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn,
                  applicant_name_en: application.applicant_citizen_id?.name_en,
                  heirs: memberList,
                  union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies WarishCertificateData)
          )

      await downloadHtmlAsPdf(
        html,
        `${isFamilyCertificate ? 'family_certificate' : 'warish_certificate'}_${language === 'bn' ? 'bangla' : 'english'}_${id.slice(-6)}.pdf`,
        { settleMs: 700 },
      )
      toast.success(`${language === 'bn' ? 'বাংলা' : 'English'} certificate saved & PDF downloaded!`)
    } catch {
      toast.error('PDF generation failed. Certificate was saved — retry from the certificate link.')
    }

    refetch()
    setProcessing(false)
  }

  const handleRedownloadCertificate = async (language: 'bn' | 'en') => {
    if (!application || !settings) return
    setProcessing(true)
    try {
      const certRef = language === 'bn' ? application.certificate_id_bn : application.certificate_id_en
      let certNo = ''
      let storedQrUrl = ''
      if (typeof certRef === 'object' && certRef !== null) {
        const cRes = await apiCall(`/api/certificates/${certRef._id}`)
        if (cRes.ok) {
          const cData = await cRes.json()
          certNo = cData.data?.certificate_no || ''
          storedQrUrl = cData.data?.qr_code_url || ''
        }
      } else if (typeof certRef === 'string') {
        const cRes = await apiCall(`/api/certificates/${certRef}`)
        if (cRes.ok) {
          const cData = await cRes.json()
          certNo = cData.data?.certificate_no || ''
          storedQrUrl = cData.data?.qr_code_url || ''
        }
      }

      const verificationUrl = storedQrUrl
      const qrDataUrl = verificationUrl ? await QRCode.toDataURL(verificationUrl, { width: 96, margin: 1 }) : undefined

      const html = isFamilyCertificate
        ? (
            language === 'bn'
              ? generateFamilyCertificateBnHtml({
                  isDraft: false, certificateNo: certNo, qr_code_url: qrDataUrl,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn || '',
                  applicant_name_en: application.applicant_citizen_id?.name_en || '',
                  father_name_bn: application.applicant_citizen_id?.father_name_bn || '',
                  father_name_en: application.applicant_citizen_id?.father_name_en || '',
                  mother_name_bn: application.applicant_citizen_id?.mother_name_bn || '',
                  mother_name_en: application.applicant_citizen_id?.mother_name_en || '',
                  nid_no: application.applicant_citizen_id?.nid_no || '',
                  present_address_bn: '', present_address_en: '', family_members: memberList,
                  union_name_bn: settings.union_name_bn || '', union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn, union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn, chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies FamilyCertificateData)
              : generateFamilyCertificateEnHtml({
                  isDraft: false, certificateNo: certNo, qr_code_url: qrDataUrl,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn || '',
                  applicant_name_en: application.applicant_citizen_id?.name_en || '',
                  father_name_bn: application.applicant_citizen_id?.father_name_bn || '',
                  father_name_en: application.applicant_citizen_id?.father_name_en || '',
                  mother_name_bn: application.applicant_citizen_id?.mother_name_bn || '',
                  mother_name_en: application.applicant_citizen_id?.mother_name_en || '',
                  nid_no: application.applicant_citizen_id?.nid_no || '',
                  present_address_bn: '', present_address_en: '', family_members: memberList,
                  union_name_bn: settings.union_name_bn || '', union_name_en: settings.union_name_en,
                  union_address_bn: settings.address_bn, union_address_en: settings.address_en,
                  chairman_name_bn: settings.chairman_name_bn, chairman_name_en: settings.chairman_name_en,
                  union_logo: settings.union_logo,
                } satisfies FamilyCertificateData)
          )
        : (
            language === 'bn'
              ? generateWarishCertificateBnHtml({
                  isDraft: false, certificateNo: certNo, qr_code_url: qrDataUrl,
                  deceased_name_bn: application.deceased_name_bn, deceased_name_en: application.deceased_name_en,
                  deceased_father_name_bn: application.deceased_father_name_bn,
                  deceased_father_name_en: application.deceased_father_name_en,
                  deceased_mother_name_bn: application.deceased_mother_name_bn,
                  deceased_mother_name_en: application.deceased_mother_name_en,
                  deceased_nid: application.deceased_nid, date_of_death: application.date_of_death,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn,
                  applicant_name_en: application.applicant_citizen_id?.name_en,
                  heirs: memberList, union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en, union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en, chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en, union_logo: settings.union_logo,
                } satisfies WarishCertificateData)
              : generateWarishCertificateEnHtml({
                  isDraft: false, certificateNo: certNo, qr_code_url: qrDataUrl,
                  deceased_name_bn: application.deceased_name_bn, deceased_name_en: application.deceased_name_en,
                  deceased_father_name_bn: application.deceased_father_name_bn,
                  deceased_father_name_en: application.deceased_father_name_en,
                  deceased_mother_name_bn: application.deceased_mother_name_bn,
                  deceased_mother_name_en: application.deceased_mother_name_en,
                  deceased_nid: application.deceased_nid, date_of_death: application.date_of_death,
                  applicant_name_bn: application.applicant_citizen_id?.name_bn,
                  applicant_name_en: application.applicant_citizen_id?.name_en,
                  heirs: memberList, union_name_bn: settings.union_name_bn || '',
                  union_name_en: settings.union_name_en, union_address_bn: settings.address_bn,
                  union_address_en: settings.address_en, chairman_name_bn: settings.chairman_name_bn,
                  chairman_name_en: settings.chairman_name_en, union_logo: settings.union_logo,
                } satisfies WarishCertificateData)
          )

      await downloadHtmlAsPdf(
        html,
        `${isFamilyCertificate ? 'family_certificate' : 'warish_certificate'}_${language === 'bn' ? 'bangla' : 'english'}_${id.slice(-6)}.pdf`,
        { settleMs: 700 },
      )
    } catch { toast.error('PDF download failed.') }
    setProcessing(false)
  }

  const handleDownloadApplicationPdf = async () => {
    if (!application || !settings) {
      toast.error('Application or system settings data not loaded yet.')
      return
    }
    setProcessing(true)
    try {
      const html = isFamilyCertificate
        ? generateFamilyApplicationHtml({
            applicant: {
              name_bn: application.applicant_citizen_id?.name_bn || '',
              name_en: application.applicant_citizen_id?.name_en || '',
              father_name_bn: application.applicant_citizen_id?.father_name_bn || '',
              father_name_en: application.applicant_citizen_id?.father_name_en || '',
              mother_name_bn: application.applicant_citizen_id?.mother_name_bn || '',
              mother_name_en: application.applicant_citizen_id?.mother_name_en || '',
              mobile: application.applicant_citizen_id?.mobile || '',
              nid_no: application.applicant_citizen_id?.nid_no,
              address_bn: '',
            },
            family_members: memberList,
            applicationId: application._id.slice(-8).toUpperCase(),
            systemSettings: {
              union_name_bn: settings.union_name_bn || '',
              union_name_en: settings.union_name_en || '',
              address_bn: settings.address_bn || '',
              chairman_name_bn: settings.chairman_name_bn || '',
              union_logo: settings.union_logo,
            },
          })
        : generateWarishApplicationHtml({
            deceased_name_bn: application.deceased_name_bn,
            deceased_name_en: application.deceased_name_en,
            deceased_father_name_bn: application.deceased_father_name_bn,
            deceased_father_name_en: application.deceased_father_name_en,
            deceased_mother_name_bn: application.deceased_mother_name_bn,
            deceased_mother_name_en: application.deceased_mother_name_en,
            deceased_nid: application.deceased_nid,
            date_of_death: application.date_of_death,
            applicant: {
              name_bn: application.applicant_citizen_id?.name_bn || '',
              name_en: application.applicant_citizen_id?.name_en || '',
              mobile: application.applicant_citizen_id?.mobile || '',
              nid_no: application.applicant_citizen_id?.nid_no,
            },
            heirs: memberList,
            applicationId: application._id.slice(-8).toUpperCase(),
            submittedAt: application.createdAt,
            status: application.status,
            systemSettings: {
              union_name_bn: settings.union_name_bn || '',
              union_name_en: settings.union_name_en || '',
              address_bn: settings.address_bn || '',
              chairman_name_bn: settings.chairman_name_bn || '',
              union_logo: settings.union_logo,
            },
          })

      await downloadHtmlAsPdf(
        html,
        `${isFamilyCertificate ? 'family_certificate' : 'warish_application'}_${application._id.slice(-8)}.pdf`,
        { containerStyle: 'font-size:13px;' },
      )
      toast.success('Application PDF downloaded successfully')
    } catch {
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Application not found.'}
        </div>
      </div>
    )
  }

  const hasBnCert = !!certId(application.certificate_id_bn)
  const hasEnCert = !!certId(application.certificate_id_en)
  const appId = application._id.slice(-8).toUpperCase()
  const typeColor = isFamilyCertificate ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
  const typeLabel = isFamilyCertificate ? 'Family Certificate' : 'Warish Certificate'

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">

        {/* ── Breadcrumb & Header ── */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
            <Link href="/warish" className="hover:text-gray-600">Warish & Family</Link>
            <span>/</span>
            <span className="text-gray-600">{appId}</span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg px-3 py-1 text-xs font-semibold ${typeColor}`}>
                {typeLabel}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isFamilyCertificate ? 'পারিবারিক সনদ আবেদন' : 'ওয়ারিশ সনদ আবেদন'}
              </h1>
              <StatusBadge status={application.status} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {application.status !== 'approved' && (
                <button
                  onClick={handleDownloadApplicationPdf}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Application PDF
                </button>
              )}
              {application.status === 'draft' && (
                <>
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={processing}
                    className="flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
                  >
                    Submit for Review
                  </button>
                </>
              )}
              {application.status === 'pending' && !application.payment_id && (
                <button
                  onClick={handlePay}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  Pay Application Fee
                </button>
              )}
              {application.status === 'pending' && canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={processing || !application.payment_id}
                  title={!application.payment_id ? 'Payment must be collected before approval' : ''}
                  className="flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Application
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Workflow Status Bar ── */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Application Progress</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>ID: <span className="font-mono font-semibold text-gray-600">#{appId}</span></span>
              <span>•</span>
              <span>Created {formatDate(application.createdAt)}</span>
              {application.approved_at && (
                <>
                  <span>•</span>
                  <span>Approved {formatDate(application.approved_at)}</span>
                </>
              )}
            </div>
          </div>
          <WorkflowStatus status={application.status} />
        </div>

        {/* ── Info Cards ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Subject Info Card */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className={`rounded-t-xl px-5 py-3 ${isFamilyCertificate ? 'bg-blue-50' : 'bg-purple-50'}`}>
              <h3 className={`text-sm font-semibold ${isFamilyCertificate ? 'text-blue-800' : 'text-purple-800'}`}>
                {isFamilyCertificate ? 'পরিবার প্রধানের তথ্য' : 'মৃত ব্যক্তির তথ্য'}
              </h3>
            </div>
            <div className="divide-y divide-gray-50 p-5">
              <InfoRow
                label={isFamilyCertificate ? 'পরিবার প্রধান (বাংলা)' : 'মৃতের নাম (বাংলা)'}
                value={application.deceased_name_bn}
              />
              <InfoRow
                label={isFamilyCertificate ? 'Head of Family (EN)' : 'Deceased Name (EN)'}
                value={application.deceased_name_en}
              />
              <InfoRow label="পিতার নাম (BN)" value={application.deceased_father_name_bn} />
              {application.deceased_father_name_en && (
                <InfoRow label="Father's Name (EN)" value={application.deceased_father_name_en} />
              )}
              {application.deceased_mother_name_bn && (
                <InfoRow label="মাতার নাম" value={application.deceased_mother_name_bn} />
              )}
              {!isFamilyCertificate && (
                <InfoRow label="মৃত্যুর তারিখ" value={formatDate(application.date_of_death)} />
              )}
              {application.deceased_nid && (
                <InfoRow label="NID নং" value={application.deceased_nid} />
              )}
            </div>
          </div>

          {/* Applicant Info Card */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="rounded-t-xl bg-gray-50 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-700">আবেদনকারীর তথ্য</h3>
            </div>
            {application.applicant_citizen_id ? (
              <div className="divide-y divide-gray-50 p-5">
                <InfoRow label="নাম (বাংলা)" value={application.applicant_citizen_id.name_bn} />
                <InfoRow label="Name (EN)" value={application.applicant_citizen_id.name_en} />
                {application.applicant_citizen_id.father_name_bn && (
                  <InfoRow label="পিতার নাম" value={application.applicant_citizen_id.father_name_bn} />
                )}
                {application.applicant_citizen_id.mobile && (
                  <InfoRow label="মোবাইল" value={application.applicant_citizen_id.mobile} />
                )}
                {application.applicant_citizen_id.nid_no && (
                  <InfoRow label="NID নং" value={application.applicant_citizen_id.nid_no} />
                )}
                <div className="pt-4">
                  <Link
                    href={`/citizens/${application.applicant_citizen_id._id}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    View Full Citizen Profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-10 text-sm text-gray-400">
                Applicant data missing
              </div>
            )}
          </div>
        </div>

        {/* ── Members / Heirs Table ── */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-gray-800">
                {isFamilyCertificate ? 'পরিবারের সদস্যবৃন্দ' : 'ওয়ারিশগণের তালিকা'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">{memberList.length} জন</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {memberList.length} members
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/70 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">SL</th>
                  <th className="px-5 py-3">Name (BN)</th>
                  <th className="px-5 py-3">Name (EN)</th>
                  <th className="px-5 py-3">Relation</th>
                  <th className="px-5 py-3">Date of Birth</th>
                  <th className="px-5 py-3">NID No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {memberList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      No members added yet
                    </td>
                  </tr>
                ) : (
                  memberList.map((heir, idx) => (
                    <tr key={idx} className="text-sm text-gray-700 transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{heir.name_bn}</td>
                      <td className="px-5 py-3.5 text-gray-600">{heir.name_en || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {heir.relation}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{formatDate(heir.birth_date)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{heir.nid_no || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Certificate Issuance Section (only when approved) ── */}
        {application.status === 'approved' && (
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
            <div className="border-b border-emerald-100 px-5 py-4">
              <h3 className="font-semibold text-emerald-900">Certificate Issuance</h3>
              <p className="mt-0.5 text-xs text-emerald-600">Issue and download certificates for this approved application</p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {/* Bengali Certificate */}
              <div className={`rounded-xl border p-4 ${hasBnCert ? 'border-emerald-200 bg-white' : 'border-dashed border-emerald-200 bg-white/60'}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇧🇩</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">বাংলা সনদ</p>
                      <p className="text-xs text-gray-400">Bengali Certificate</p>
                    </div>
                  </div>
                  {hasBnCert ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Issued
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-400">Not issued</span>
                  )}
                </div>
                {hasBnCert ? (
                  <button
                    onClick={() => handleRedownloadCertificate('bn')}
                    disabled={processing}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Download BN PDF
                  </button>
                ) : currentUser?.role !== 'citizen' ? (
                  <button
                    onClick={() => handleIssueCertificate('bn')}
                    disabled={processing}
                    className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    বাংলা সনদ জারি ও ডাউনলোড
                  </button>
                ) : (
                  <div className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
                    Awaiting generation by Union
                  </div>
                )}
              </div>

              {/* English Certificate */}
              <div className={`rounded-xl border p-4 ${hasEnCert ? 'border-blue-200 bg-white' : 'border-dashed border-blue-200 bg-white/60'}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇬🇧</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">English Certificate</p>
                      <p className="text-xs text-gray-400">ইংরেজি সনদ</p>
                    </div>
                  </div>
                  {hasEnCert ? (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Issued
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-400">Not issued</span>
                  )}
                </div>
                {hasEnCert ? (
                  <button
                    onClick={() => handleRedownloadCertificate('en')}
                    disabled={processing}
                    className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Download EN PDF
                  </button>
                ) : currentUser?.role !== 'citizen' ? (
                  <button
                    onClick={() => handleIssueCertificate('en')}
                    disabled={processing}
                    className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    Issue & Download English
                  </button>
                ) : (
                  <div className="w-full rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700">
                    Awaiting generation by Union
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ── Edit Modal ── */}
      {showEditModal && form && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={isFamilyCertificate ? 'পারিবারিক সনদ সম্পাদনা' : 'ওয়ারিশ আবেদন সম্পাদনা'}
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {isFamilyCertificate ? 'পরিবার প্রধানের তথ্য' : 'মৃত ব্যক্তির তথ্য'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {isFamilyCertificate ? 'পরিবার প্রধানের নাম (BN) *' : 'মৃতের নাম (BN) *'}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.deceased_name_bn}
                    onChange={e => setForm({ ...form, deceased_name_bn: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {isFamilyCertificate ? 'Head of Family (EN) *' : 'Deceased Name (EN) *'}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.deceased_name_en}
                    onChange={e => setForm({ ...form, deceased_name_en: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">পিতার নাম (BN)</label>
                  <input
                    type="text"
                    value={form.deceased_father_name_bn}
                    onChange={e => setForm({ ...form, deceased_father_name_bn: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Father&apos;s Name (EN)</label>
                  <input
                    type="text"
                    value={form.deceased_father_name_en}
                    onChange={e => setForm({ ...form, deceased_father_name_en: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                </div>
                {!isFamilyCertificate && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">মৃত্যুর তারিখ *</label>
                      <input
                        required
                        type="date"
                        value={form.date_of_death}
                        onChange={e => setForm({ ...form, date_of_death: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Deceased NID</label>
                      <input
                        type="text"
                        value={form.deceased_nid}
                        onChange={e => setForm({ ...form, deceased_nid: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>


            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  )
}
