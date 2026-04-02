'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import CertificateQrCode from '@/components/certificates/CertificateQrCode'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import { renderCertificateTemplate, renderOfficialCertificateLayout, type CitizenInfo } from '@/lib/utils/certificate-render'
import { buildCertificateVerificationUrl } from '@/lib/utils/certificate-verification'
import { CERTIFICATE_TYPE_LABELS } from '@/constants/certificate-types'
import { generateFamilyCertificateBnHtml, generateFamilyCertificateEnHtml, type FamilyCertificateData } from '@/lib/utils/family-certificate-render'
import { generateWarishCertificateBnHtml, generateWarishCertificateEnHtml, type WarishCertificateData } from '@/lib/utils/warish-certificate-render'

interface Address {
  village_bn?: string
  village_en?: string
  post_office_bn?: string
  post_office_en?: string
  thana_bn?: string
  thana_en?: string
  district_bn?: string
  district_en?: string
  ward_no?: number
}

interface Certificate {
  _id: string
  certificate_no: string | null
  language: string
  certificate_type: string
  citizen_id:
    | {
        _id: string
        name_bn: string
        name_en: string
        father_name_bn?: string
        father_name_en?: string
        mother_name_bn?: string
        mother_name_en?: string
        mobile?: string
        nid_no?: string
        birth_cert_no?: string
        date_of_birth?: string
        address?: Address
        permanent_address?: Address | null
      }
    | null
  template_id: { _id: string; name: string; body_template?: string; fee?: number } | null
  status: string
  fiscal_year: string
  dynamic_data: Record<string, unknown>
  payment_id?: {
    _id: string
    receipt_no: string
    amount: number
    payment_method: string
    note?: string
    createdAt: string
  } | null
  qr_code_url?: string
  approved_at?: string
  createdAt: string
}

interface PaymentReceipt {
  _id: string
  receipt_no: string
  amount: number
  payment_method: string
  note?: string
  createdAt: string
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

function getCertificateTypeLabel(type: string): string {
  return CERTIFICATE_TYPE_LABELS[type as keyof typeof CERTIFICATE_TYPE_LABELS] || type.replace(/_/g, ' ')
}

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useUser()
  const canApprove = isSuperAdmin(currentUser)
  const [certificateQrDataUrl, setCertificateQrDataUrl] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [receiptPayment, setReceiptPayment] = useState<PaymentReceipt | null>(null)

  const { data: cert, loading, error, refetch } = useApi<Certificate>(`/api/certificates/${id}`)
  const { data: settings } = useApi<SystemSettings>('/api/system-settings')
  const effectiveStatus = cert?.status === 'locked' ? 'approved' : cert?.status
  const certificateFee = Number(cert?.template_id?.fee ?? 0)

  const handleSubmitForApproval = async () => {
    const res = await apiCall(`/api/certificates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pending' }),
    })
    if (res.ok) {
      toast.success('Certificate submitted for approval.')
      refetch()
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to change status.')
    }
  }

  const handleApprove = async () => {
    if (!cert?.citizen_id?._id) {
      toast.error('Citizen information is missing for payment collection.')
      return
    }

    setApproving(true)
    const res = await apiCall(`/api/certificates/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        collect_payment: true,
        amount: certificateFee,
        note: cert.certificate_no
          ? `Cash payment for certificate ${cert.certificate_no}`
          : 'Cash payment for certificate approval',
      }),
    })
    if (res.ok) {
      toast.success('Certificate approved.')
      const payload = await res.json().catch(() => ({}))
      const payment = payload?.data?.payment as PaymentReceipt | undefined
      if (payment) {
        setReceiptPayment(payment)
      }
      setShowApproveModal(false)
      refetch()
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to approve.')
    }
    setApproving(false)
  }

  const handlePrintReceipt = async () => {
    if (!receiptPayment || !cert) return

    const citizenName =
      cert.citizen_id?.name_bn || cert.citizen_id?.name_en || 'Citizen'
    const paymentDate = new Date(receiptPayment.createdAt).toLocaleString('en-BD')

    const receiptHtml = `
      <div style="font-family: Arial, sans-serif; color: #111827; padding: 32px; width: 420px; box-sizing: border-box;">
        <div style="border: 1.5px solid #d1d5db; border-radius: 12px; padding: 28px;">
          <h2 style="margin: 0 0 4px; font-size: 20px;">Payment Receipt</h2>
          <p style="margin: 0 0 20px; color: #6b7280; font-size: 13px;">Certificate cash payment record</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Receipt No</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${receiptPayment.receipt_no}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Certificate No</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${cert.certificate_no ?? 'Generated on approval'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Citizen</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${citizenName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Payment Method</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${receiptPayment.payment_method}</td></tr>
            <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Amount</td><td style="padding: 10px 0; font-weight: 700; text-align: right; font-size: 16px;">৳ ${Number(receiptPayment.amount).toLocaleString()}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Paid At</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${paymentDate}</td></tr>
            ${receiptPayment.note ? `<tr><td style="padding: 8px 0; color: #6b7280;">Note</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${receiptPayment.note}</td></tr>` : ''}
          </table>
        </div>
      </div>
    `

    const container = document.createElement('div')
    container.style.cssText = 'position:fixed; left:-9999px; top:0; background:#fff;'
    container.innerHTML = receiptHtml
    document.body.appendChild(container)

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      await new Promise(r => setTimeout(r, 300))

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const imgW = canvas.width
      const imgH = canvas.height

      // A5 size in mm
      const pdfW = 148
      const pdfH = 210
      const ratio = Math.min(pdfW / imgW, pdfH / imgH)
      const w = imgW * ratio
      const h = imgH * ratio

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
      pdf.addImage(imgData, 'JPEG', (pdfW - w) / 2, 10, w, h)
      pdf.save(`receipt-${receiptPayment.receipt_no}.pdf`)
    } catch {
      toast.error('Failed to generate receipt PDF.')
    } finally {
      document.body.removeChild(container)
    }
  }

  const verificationUrl = useMemo(() => {
    if (!cert || effectiveStatus !== 'approved' || !cert.certificate_no) return ''
    return cert.qr_code_url || buildCertificateVerificationUrl(cert.certificate_no)
  }, [cert, effectiveStatus])

  useEffect(() => {
    if (!verificationUrl) return

    let cancelled = false

    QRCode.toDataURL(verificationUrl, {
      width: 96,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setCertificateQrDataUrl(dataUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCertificateQrDataUrl('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [verificationUrl])

  const renderedCertificateHtml = useMemo(() => {
    // Wait until both cert and settings are loaded to avoid layout shift on re-render
    if (!cert || !settings) return ''
    // For approved certs, wait for QR code to be generated before rendering
    if (effectiveStatus === 'approved' && verificationUrl && !certificateQrDataUrl) return ''

    // Basic shared data
    const isBn = cert?.language === 'bn'
    const issuedAt = cert?.approved_at || cert?.createdAt || new Date()
    const issueDate = new Date(issuedAt).toLocaleDateString(
      isBn ? 'bn-BD' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' },
    )

    const unionName = isBn ? (settings?.union_name_bn || 'ইউনিয়ন পরিষদ') : (settings?.union_name_en || 'Union Parishad')
    const chairmanName = isBn ? (settings?.chairman_name_bn || '') : (settings?.chairman_name_en || '')
    const unionAddress = isBn ? (settings?.address_bn || '') : (settings?.address_en || '')
    const unionLogoUrl = settings?.union_logo || ''

    // ── INTERCEPT WARISH CERTIFICATE ──
    if (cert?.certificate_type === 'WAR') {
      const d = cert.dynamic_data || {}
      const certData: WarishCertificateData = {
        isDraft: effectiveStatus !== 'approved' && effectiveStatus !== 'locked',
        certificateNo: effectiveStatus === 'approved' ? cert.certificate_no || '' : '',
        qr_code_url: effectiveStatus === 'approved' && certificateQrDataUrl ? certificateQrDataUrl : undefined,
        issueDate,
        deceased_name_bn: String(d.deceased_name_bn || ''),
        deceased_name_en: String(d.deceased_name_en || ''),
        deceased_father_name_bn: String(d.deceased_father_name_bn || ''),
        deceased_father_name_en: String(d.deceased_father_name_en || ''),
        deceased_mother_name_bn: String(d.deceased_mother_name_bn || ''),
        deceased_mother_name_en: String(d.deceased_mother_name_en || ''),
        deceased_nid: String(d.deceased_nid || ''),
        date_of_death: String(d.date_of_death || ''),
        applicant_name_bn: cert.citizen_id?.name_bn,
        applicant_name_en: cert.citizen_id?.name_en,
        heirs: Array.isArray(d.heirs) ? d.heirs : [],
        union_name_bn: settings?.union_name_bn || '',
        union_name_en: settings?.union_name_en,
        union_address_bn: settings?.address_bn,
        union_address_en: settings?.address_en,
        chairman_name_bn: settings?.chairman_name_bn,
        chairman_name_en: settings?.chairman_name_en,
        union_logo: settings?.union_logo,
      }
      return isBn ? generateWarishCertificateBnHtml(certData) : generateWarishCertificateEnHtml(certData)
    }

    // ── DEFAULT CERTIFICATE (NEEDS TEMPLATE) ──
    if (cert?.certificate_type === 'FAM') {
      const d = cert.dynamic_data || {}
      const formatFamilyAddress = (a: Address | undefined | null, locale: 'bn' | 'en'): string => {
        if (!a) return ''
        const village = locale === 'bn' ? a.village_bn : a.village_en
        const postOffice = locale === 'bn' ? a.post_office_bn : a.post_office_en
        const thana = locale === 'bn' ? a.thana_bn : a.thana_en
        const district = locale === 'bn' ? a.district_bn : a.district_en
        return [
          village && `${locale === 'bn' ? 'গ্রাম' : 'Village'}: ${village}`,
          postOffice && `${locale === 'bn' ? 'ডাকঘর' : 'Post Office'}: ${postOffice}`,
          thana && `${locale === 'bn' ? 'উপজেলা' : 'Upazila'}: ${thana}`,
          district && `${locale === 'bn' ? 'জেলা' : 'District'}: ${district}`,
        ].filter(Boolean).join(', ')
      }

      const certData: FamilyCertificateData = {
        isDraft: effectiveStatus !== 'approved' && effectiveStatus !== 'locked',
        certificateNo: effectiveStatus === 'approved' ? cert.certificate_no || '' : '',
        qr_code_url: effectiveStatus === 'approved' && certificateQrDataUrl ? certificateQrDataUrl : undefined,
        issueDate,
        applicant_name_bn: cert.citizen_id?.name_bn || '',
        applicant_name_en: cert.citizen_id?.name_en || '',
        father_name_bn: cert.citizen_id?.father_name_bn || '',
        father_name_en: cert.citizen_id?.father_name_en || '',
        mother_name_bn: cert.citizen_id?.mother_name_bn || '',
        mother_name_en: cert.citizen_id?.mother_name_en || '',
        nid_no: cert.citizen_id?.nid_no || '',
        present_address_bn: formatFamilyAddress(cert.citizen_id?.address, 'bn'),
        present_address_en: formatFamilyAddress(cert.citizen_id?.address, 'en'),
        family_members: Array.isArray(d.family_members) ? d.family_members as FamilyCertificateData['family_members'] : [],
        union_name_bn: settings?.union_name_bn || '',
        union_name_en: settings?.union_name_en,
        union_address_bn: settings?.address_bn,
        union_address_en: settings?.address_en,
        chairman_name_bn: settings?.chairman_name_bn,
        chairman_name_en: settings?.chairman_name_en,
        union_logo: settings?.union_logo,
      }
      return isBn ? generateFamilyCertificateBnHtml(certData) : generateFamilyCertificateEnHtml(certData)
    }

    if (!cert?.template_id?.body_template) return ''

    const citizen = cert.citizen_id
    const addr = citizen?.address
    const permAddr = citizen?.permanent_address
    function formatAddress(a: Address | undefined | null): string {
      if (!a) return ''
      const v = isBn ? a.village_bn : a.village_en
      const po = isBn ? a.post_office_bn : a.post_office_en
      const th = isBn ? a.thana_bn : a.thana_en
      const di = isBn ? a.district_bn : a.district_en
      return [
        v  && ((isBn ? 'গ্রাম' : 'Village') + ': ' + v),
        po && ((isBn ? 'ডাকঘর' : 'Post Office') + ': ' + po),
        th && ((isBn ? 'উপজেলা' : 'Upazila') + ': ' + th),
        di && ((isBn ? 'জেলা' : 'District') + ': ' + di),
      ].filter(Boolean).join(', ')
    }

    const dob = citizen?.date_of_birth
      ? new Date(citizen.date_of_birth).toLocaleDateString(
          isBn ? 'bn-BD' : 'en-GB',
          { day: '2-digit', month: '2-digit', year: 'numeric' },
        )
      : undefined

    const overrideName = typeof cert.dynamic_data?.certificate_person_name === 'string'
      ? cert.dynamic_data.certificate_person_name
      : ''
    const overrideFatherName = typeof cert.dynamic_data?.certificate_father_name === 'string'
      ? cert.dynamic_data.certificate_father_name
      : ''
    const overrideMotherName = typeof cert.dynamic_data?.certificate_mother_name === 'string'
      ? cert.dynamic_data.certificate_mother_name
      : ''
    const overrideAddress = typeof cert.dynamic_data?.certificate_address === 'string'
      ? cert.dynamic_data.certificate_address
      : ''

    const citizenInfo: CitizenInfo = {
      name: overrideName || (isBn ? (citizen?.name_bn || '') : (citizen?.name_en || '')),
      fatherName: overrideFatherName || (isBn ? (citizen?.father_name_bn || '') : (citizen?.father_name_en || '')),
      motherName: overrideMotherName || (isBn ? (citizen?.mother_name_bn || '') : (citizen?.mother_name_en || '')),
      dateOfBirth: dob,
      nidNo: citizen?.nid_no || citizen?.birth_cert_no || undefined,
      wardNo: addr?.ward_no !== undefined ? String(addr.ward_no) : undefined,
      presentAddress: overrideAddress || formatAddress(addr) || undefined,
      permanentAddress: permAddr ? formatAddress(permAddr) : undefined,
      mobile: citizen?.mobile || undefined,
    }

    const replacements: Record<string, unknown> = {
      issue_date: issueDate,
      certificate_no: (effectiveStatus === 'approved' || effectiveStatus === 'locked') ? (cert.certificate_no || '') : '',
      union_name: unionName,
      union_name_bn: settings?.union_name_bn || '',
      union_name_en: settings?.union_name_en || '',
      chairman_name: chairmanName,
      chairman_name_bn: settings?.chairman_name_bn || '',
      chairman_name_en: settings?.chairman_name_en || '',
      union_address: unionAddress,
      union_address_bn: settings?.address_bn || '',
      union_address_en: settings?.address_en || '',
      union_logo_url: unionLogoUrl,
      verification_url: effectiveStatus === 'approved' ? verificationUrl : '',
      citizen_name_bn: isBn ? citizenInfo.name : (citizen?.name_bn || ''),
      citizen_name_en: isBn ? (citizen?.name_en || '') : citizenInfo.name,
      father_name_bn: isBn ? citizenInfo.fatherName : (citizen?.father_name_bn || ''),
      father_name_en: isBn ? (citizen?.father_name_en || '') : citizenInfo.fatherName,
      mother_name_bn: isBn ? citizenInfo.motherName : (citizen?.mother_name_bn || ''),
      mother_name_en: isBn ? (citizen?.mother_name_en || '') : citizenInfo.motherName,
      present_address: citizenInfo.presentAddress || '',
    }

    const qrHtml = effectiveStatus === 'approved' && certificateQrDataUrl
      ? '<img src="' + certificateQrDataUrl + '" alt="QR" width="100" height="100" style="display:block; border:1px solid #ccc; padding:3px; background:#fff;" />'
      : ''

    const contentHtml = renderCertificateTemplate({
      templateHtml: cert.template_id.body_template,
      replacements,
      dynamicData: cert.dynamic_data,
      rawReplacements: { verification_qr: '', verification_qr_html: '' },
      certificateNo: effectiveStatus === 'approved' ? (cert.certificate_no || '') : '',
    })

    return renderOfficialCertificateLayout({
      contentHtml,
      citizenInfo,
      language: isBn ? 'bn' : 'en',
      status: effectiveStatus,
      unionName,
      unionAddress,
      chairmanName,
      unionLogoUrl,
      certificateTitle: cert.template_id.name || getCertificateTypeLabel(cert.certificate_type) || 'Certificate',
      certificateNo: effectiveStatus === 'approved' ? (cert.certificate_no || '') : '',
      issueDate,
      verificationUrl,
      qrHtml,
    })
  }, [cert, verificationUrl, certificateQrDataUrl, settings, effectiveStatus])

  const handleDownloadPdf = async () => {
    if (!cert || !renderedCertificateHtml) {
      toast.error('Certificate preview is not ready yet.')
      return
    }

    const container = document.createElement('div')
    container.style.cssText = 'position:fixed; left:-9999px; top:0; width:794px; margin:0; padding:0; background:#fff;'
    container.innerHTML = renderedCertificateHtml
    document.body.appendChild(container)

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Wait for fonts and images inside the injected HTML to load
      await new Promise(r => setTimeout(r, 700))

      // Target the .page div — firstElementChild may be a <style> tag from the full HTML doc
      const target = (container.querySelector('.page') as HTMLElement | null) ?? container

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        windowWidth: 794,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const rh = pw * (canvas.height / canvas.width)
      pdf.addImage(imgData, 'JPEG', 0, 0, pw, rh <= ph ? rh : ph)

      pdf.save(`${cert.certificate_no || `certificate-${cert._id}`}.pdf`)
    } catch {
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      document.body.removeChild(container)
    }
  }

  // Auto-download if ?download=1 is present
  useEffect(() => {
    if (searchParams.get('download') === '1' && cert && renderedCertificateHtml && !loading) {
      handleDownloadPdf()
      // Remove query param without refresh
      const newPath = window.location.pathname
      window.history.replaceState({}, '', newPath)
    }
  }, [cert, renderedCertificateHtml, loading, searchParams])

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-1/4 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (error || !cert) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Certificate not found.'}
        </div>
      </div>
    )
  }

  const isWarishOrFamily = cert.certificate_type === 'WAR' || cert.certificate_type === 'FAM'
  const isBn = cert.language === 'bn'
  const langLabel = isBn ? 'বাংলা' : 'English'
  const langColor = isBn ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
  const typeLabel = getCertificateTypeLabel(cert.certificate_type)
  const issuedDate = new Date(cert.approved_at || cert.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{typeLabel}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${langColor}`}>{langLabel}</span>
            <StatusBadge status={effectiveStatus ?? ''} />
          </div>
          {cert.certificate_no && (
            <p className="mt-0.5 font-mono text-sm text-gray-400">{cert.certificate_no}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cert.payment_id && (
            <button
              onClick={() => setReceiptPayment(cert.payment_id ?? null)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Payment Receipt
            </button>
          )}
          {renderedCertificateHtml && (currentUser?.role !== 'citizen' || effectiveStatus === 'approved') && (
            <button
              onClick={handleDownloadPdf}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Download PDF
            </button>
          )}
          {cert.status === 'draft' && currentUser?.role !== 'citizen' && (
            <button
              onClick={handleSubmitForApproval}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Submit for Review
            </button>
          )}
          {effectiveStatus === 'pending' && canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Approve
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}

      {/* ── Details + QR side by side ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Details card — 2 cols wide */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Certificate Details</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Certificate No</p>
              <p className="font-mono text-sm font-semibold text-gray-900">
                {cert.certificate_no ?? <span className="font-sans font-normal italic text-gray-400">Not generated</span>}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Language</p>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${langColor}`}>{langLabel}</span>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Type</p>
              <p className="text-sm text-gray-800">{typeLabel}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Status</p>
              <StatusBadge status={effectiveStatus ?? ''} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Fiscal Year</p>
              <p className="text-sm text-gray-800">{cert.fiscal_year}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Issued</p>
              <p className="text-sm text-gray-800">{issuedDate}</p>
            </div>
            {cert.citizen_id && (
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Citizen</p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{cert.citizen_id.name_bn}</span>
                  <span className="ml-2 text-gray-400">({cert.citizen_id.name_en})</span>
                </p>
              </div>
            )}
            {cert.template_id?.name && (
              <div className="col-span-2 sm:col-span-1">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Template</p>
                <p className="text-sm text-gray-800">{cert.template_id.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR card */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Verification QR</h3>
          {effectiveStatus === 'approved' && verificationUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <CertificateQrCode
                  value={verificationUrl}
                  alt={`QR for ${cert.certificate_no ?? 'certificate'}`}
                  size={150}
                  className="block rounded bg-white"
                />
              </div>
              <p className="text-center text-xs font-medium text-emerald-700">Scan to verify this certificate</p>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full break-all rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs text-gray-500 hover:text-green-700"
              >
                {verificationUrl}
              </a>
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-xs text-gray-400">QR code will appear<br />after approval</p>
            </div>
          )}
        </div>
      </div>


      {/* Dynamic Data — only for non-warish/family certs */}
      {!isWarishOrFamily && cert.dynamic_data && Object.keys(cert.dynamic_data).length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">Dynamic Data</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Object.entries(cert.dynamic_data).map(([key, value]) => (
              <div key={key}>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-800">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      <Modal
        open={showApproveModal}
        onClose={() => { if (!approving) setShowApproveModal(false) }}
        title="Approve Certificate"
        size="sm"
      >
        <div className="space-y-4">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 px-4">
            <div className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">Certificate No</span>
              <span className="font-mono font-medium text-gray-900">{cert.certificate_no ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">Citizen</span>
              <span className="font-medium text-gray-900">{cert.citizen_id?.name_bn || cert.citizen_id?.name_en || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-medium text-gray-900">Cash</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-green-700">৳ {certificateFee.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">This will approve the certificate and record a cash payment receipt.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowApproveModal(false)}
              disabled={approving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {approving ? 'Processing...' : 'Confirm & Approve'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Receipt Modal ── */}
      <Modal
        open={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        title="Payment Receipt"
        size="sm"
      >
        {receiptPayment && (
          <div className="space-y-4">
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 px-4">
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">Receipt No</span>
                <span className="font-semibold text-gray-900">{receiptPayment.receipt_no}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">Certificate No</span>
                <span className="font-mono font-medium text-gray-900">{cert.certificate_no ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-green-700">৳ {Number(receiptPayment.amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium capitalize text-gray-900">{receiptPayment.payment_method}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">Paid At</span>
                <span className="font-medium text-gray-900">{new Date(receiptPayment.createdAt).toLocaleString('en-BD')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReceiptPayment(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
