'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import CitizenRegistrationForm from '@/components/forms/CitizenRegistrationForm'
import IssueCertificateModal from '@/components/certificates/IssueCertificateModal'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

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

interface Citizen {
  _id: string
  name_bn: string
  name_en: string
  father_name_bn: string
  father_name_en: string
  mother_name_bn: string
  mother_name_en: string
  spouse_name_bn?: string
  spouse_name_en?: string
  date_of_birth: string
  gender: string
  nid_no?: string
  birth_cert_no?: string
  mobile: string
  address: Address
  permanent_address?: Address
  housing_info?: {
    house_type?: string
    ownership_type?: string
    total_rooms?: number
  }
  financial_info?: {
    annual_income?: number
    occupation?: string
    land_owned_dec?: number
  }
  status: string
  approved_by?: { name: string }
  approved_at?: string
  createdAt: string
}

interface Certificate {
  _id: string
  certificate_no: string
  certificate_type: string
  language: string
  status: string
  fiscal_year: string
  createdAt: string
}

interface TaxRecord {
  _id: string
  holding_no: string
  fiscal_year: string
  amount: number
  status: string
  payment_id?: string
  paid_at: string | null
  createdAt: string
}

interface CitizenTaxData {
  citizen_id: string
  holding_no: string | null
  taxes: TaxRecord[]
}

interface Heir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: string
  nid_no: string
}

interface WarishApplication {
  _id: string
  application_type?: 'warish' | 'family_certificate'
  deceased_name_bn: string
  deceased_name_en: string
  status: string
  createdAt: string
  heirs: Heir[]
}

const emptyHeir = (): Heir => ({ name_bn: '', name_en: '', relation: '', birth_date: '', nid_no: '' })

const defaultWarishForm = {
  application_type: 'warish' as 'warish' | 'family_certificate',
  deceased_name_bn: '',
  deceased_name_en: '',
  deceased_father_name_bn: '',
  deceased_father_name_en: '',
  deceased_mother_name_bn: '',
  deceased_mother_name_en: '',
  deceased_nid: '',
  date_of_death: '',
  heirs: [emptyHeir()],
  family_members: [emptyHeir()],
}

export default function CitizenDetailPage() {
  const currentUser = useUser()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'holding_tax' | 'warish'>('profile')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showIssueCert, setShowIssueCert] = useState(false)

  // Warish create state
  const [showWarishCreate, setShowWarishCreate] = useState(false)
  const [warishIsPreview, setWarishIsPreview] = useState(false)
  const [warishSaving, setWarishSaving] = useState(false)
  const [warishForm, setWarishForm] = useState({ ...defaultWarishForm, heirs: [emptyHeir()], family_members: [emptyHeir()] })
  const [warishErrorMsg, setWarishErrorMsg] = useState('')

  // Holding tax state
  const [showAssessTax, setShowAssessTax] = useState(false)
  const [assessingTax, setAssessingTax] = useState(false)
  const [taxForm, setTaxForm] = useState({ fiscal_year: '2025-2026', amount: '' })
  const [payingTaxId, setPayingTaxId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const FISCAL_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027']

  const { data: citizen, loading, error, refetch } = useApi<Citizen>(`/api/citizens/${id}`)
  const { data: certs, loading: certsLoading, refetch: refetchCerts } = useApi<Certificate[]>(
    `/api/certificates?citizen_id=${id}`,
    [id],
  )
  const { data: taxData, loading: taxLoading, refetch: refetchTax } = useApi<CitizenTaxData>(
    `/api/citizens/${id}/tax`,
    [id],
  )
  const { data: warishData, loading: warishLoading, refetch: refetchWarish } = useApi<{ applications: WarishApplication[] }>(
    `/api/warish?applicant_citizen_id=${id}&limit=50`,
    [id],
  )

  const handleApprove = async () => {
    const res = await apiCall(`/api/citizens/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen approved.')
      refetch()
    } else {
      toast.error('Failed to approve.')
    }
  }

  const handleReject = async () => {
    const res = await apiCall(`/api/citizens/${id}/reject`, { method: 'POST' })
    if (res.ok) {
      toast.success('Citizen rejected.')
      refetch()
    } else {
      toast.error('Failed to reject.')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await apiCall(`/api/citizens/${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setShowDeleteModal(false)
      router.push('/citizens')
    } else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to delete citizen.')
    }
  }

  const openWarishCreate = (type: 'warish' | 'family_certificate') => {
    setWarishForm({ ...defaultWarishForm, application_type: type, heirs: [emptyHeir()], family_members: [emptyHeir()] })
    setWarishIsPreview(false)
    setWarishErrorMsg('')
    setShowWarishCreate(true)
  }

  const updateWarishMember = (collection: 'heirs' | 'family_members', i: number, field: keyof Heir, value: string) => {
    setWarishForm((f) => {
      const members = [...f[collection]]
      members[i] = { ...members[i], [field]: value }
      return { ...f, [collection]: members }
    })
  }

  const addWarishMember = (collection: 'heirs' | 'family_members') =>
    setWarishForm((f) => ({ ...f, [collection]: [...f[collection], emptyHeir()] }))

  const removeWarishMember = (collection: 'heirs' | 'family_members', i: number) =>
    setWarishForm((f) => ({ ...f, [collection]: f[collection].filter((_, idx) => idx !== i) }))

  const handleWarishCreate = async (status: string = 'pending') => {
    setWarishSaving(true)
    setWarishErrorMsg('')
    const memberKey = warishForm.application_type === 'family_certificate' ? 'family_members' : 'heirs'
    const res = await apiCall('/api/warish', {
      method: 'POST',
      body: JSON.stringify({
        ...warishForm,
        status,
        applicant_citizen_id: id,
        [memberKey]: warishForm[memberKey],
      }),
    })
    setWarishSaving(false)
    if (res.ok) {
      setShowWarishCreate(false)
      setWarishIsPreview(false)
      toast.success(`${warishForm.application_type === 'family_certificate' ? 'Family certificate' : 'Warish'} application created.`)
      refetchWarish()
    } else {
      const d = await res.json()
      setWarishErrorMsg(d.message ?? 'Failed to create application.')
      setWarishIsPreview(false)
    }
  }

  const handleAssessTax = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssessingTax(true)
    const res = await apiCall(`/api/citizens/${id}/tax`, {
      method: 'POST',
      body: JSON.stringify({ fiscal_year: taxForm.fiscal_year, amount: Number(taxForm.amount) }),
    })
    setAssessingTax(false)
    if (res.ok) {
      toast.success('Holding tax assessed successfully.')
      setShowAssessTax(false)
      setTaxForm({ fiscal_year: '2025-2026', amount: '' })
      refetchTax()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to assess holding tax.')
    }
  }

  const handlePayTax = async (taxId: string) => {
    setPayingTaxId(taxId)
    setPaying(true)
    try {
      const res = await apiCall(`/api/citizens/${id}/tax/${taxId}/pay`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success('Holding tax paid successfully.')
        refetchTax()

        // Download PDF receipt
        if (data.data?.payment?._id) {
          await downloadTaxReceipt(data.data.payment._id)
        }
      } else {
        const d = await res.json().catch(() => ({ message: 'Failed to pay holding tax.' }))
        toast.error(d.message ?? 'Failed to pay holding tax.')
      }
    } catch {
      toast.error('Failed to pay holding tax. Please try again.')
    } finally {
      setPaying(false)
      setPayingTaxId(null)
    }
  }

  const downloadTaxReceipt = async (paymentId: string) => {
    try {
      console.log('Downloading receipt for payment ID:', paymentId)

      // Fetch receipt data
      const res = await apiCall(`/api/payments/${paymentId}/tax-receipt`, { method: 'GET' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch receipt data' }))
        console.error('Receipt API error:', errorData)
        toast.error(errorData.message || 'Failed to fetch receipt data.')
        return
      }

      const { data } = await res.json()
      console.log('Receipt data:', data)

      const { generateTaxReceiptHtml } = await import('@/lib/utils/tax-receipt-render')
      const receiptHtml = generateTaxReceiptHtml(data)

      // Create container for rendering
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed; left:-9999px; top:0; width:794px; margin:0; padding:0; background:#fff;'
      container.innerHTML = receiptHtml
      document.body.appendChild(container)

      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import('html2canvas'),
          import('jspdf'),
        ])

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          width: 794,
          windowWidth: 794,
          backgroundColor: '#ffffff',
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
        const renderWidth = canvas.width * scale
        const renderHeight = canvas.height * scale
        const offsetX = (pageWidth - renderWidth) / 2
        const offsetY = (pageHeight - renderHeight) / 2

        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderWidth, renderHeight)

        const receiptNo = data.payment?.receipt_no || 'receipt'
        pdf.save(`holding-tax-receipt-${receiptNo}.pdf`)
      } finally {
        document.body.removeChild(container)
      }
    } catch (error) {
      console.error('Failed to generate receipt PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate receipt PDF.'
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-4 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (error || !citizen) {
    if (id === 'profile' && currentUser?.role === 'citizen') {
      return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Setup Your Profile</h1>
            <p className="text-sm text-gray-500 mb-6">Please complete your citizen profile to access union services.</p>
            <CitizenRegistrationForm onSuccess={() => {
              toast.success('Profile setup successfully.')
              refetch()
            }} onCancel={() => router.push('/dashboard')} />
          </div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Citizen not found.'}
        </div>
      </div>
    )
  }

  const certCols: Column[] = [
    { key: 'certificate_no', label: 'Cert No' },
    { key: 'language', label: 'Language', render: (value) => value === 'bn' ? 'বাংলা' : 'English' },
    { key: 'certificate_type', label: 'Type' },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    { key: 'fiscal_year', label: 'Fiscal Year' },
    {
      key: '_id',
      label: 'Action',
      render: (value) => (
        <a href={`/certificates/${value}`} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
          View
        </a>
      ),
    },
  ]

  const warishCols: Column[] = [
    {
      key: 'deceased_name_bn',
      label: 'Subject',
      render: (_, row) => row.application_type === 'family_certificate' ? 'Family Certificate' : row.deceased_name_bn,
    },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    { key: 'createdAt', label: 'Applied Date', render: (value) => new Date(value).toLocaleDateString('en-BD') },
    {
      key: '_id',
      label: 'Action',
      render: (value) => (
        <a href={`/warish/${value}`} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
          View
        </a>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          ← Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {citizen.status === 'pending' && hasPermission(currentUser, PERMISSIONS.CITIZEN_APPROVE) && (
            <>
              <button
                onClick={handleApprove}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
          <button
            disabled
            className="cursor-not-allowed rounded-lg border border-red-200 bg-gray-100 px-4 py-2 text-sm font-medium text-red-400 opacity-60"
            title="Delete is disabled"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{citizen.name_bn}</h1>
            <p className="text-sm text-gray-500">{citizen.name_en}</p>
          </div>
          <StatusBadge status={citizen.status} />
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto sm:gap-4">
          {(['profile', 'documents', 'holding_tax', 'warish'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'documents' ? 'Certificates' : tab === 'holding_tax' ? 'Holding Tax' : tab === 'warish' ? 'Warish' : 'Profile'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
              ব্যক্তিগত তথ্য / Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[
                { label: 'নাম (বাংলা)', value: citizen.name_bn },
                { label: 'Name (English)', value: citizen.name_en },
                { label: 'পিতার নাম (বাংলা)', value: citizen.father_name_bn || '—' },
                { label: 'Father Name (EN)', value: citizen.father_name_en || '—' },
                { label: 'মাতার নাম (বাংলা)', value: citizen.mother_name_bn || '—' },
                { label: 'Mother Name (EN)', value: citizen.mother_name_en || '—' },
                ...(citizen.spouse_name_bn || citizen.spouse_name_en
                  ? [
                      { label: 'স্বামী/স্ত্রী (বাংলা)', value: citizen.spouse_name_bn || '—' },
                      { label: 'Spouse (EN)', value: citizen.spouse_name_en || '—' },
                    ]
                  : []),
                {
                  label: 'জন্ম তারিখ / DOB',
                  value: citizen.date_of_birth ? new Date(citizen.date_of_birth).toLocaleDateString('en-BD') : '—',
                },
                {
                  label: 'লিঙ্গ / Gender',
                  value:
                    citizen.gender === 'male'
                      ? 'পুরুষ / Male'
                      : citizen.gender === 'female'
                        ? 'মহিলা / Female'
                        : 'অন্যান্য / Other',
                },
                { label: 'মোবাইল / Mobile', value: citizen.mobile || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {(citizen.nid_no || citizen.birth_cert_no) && (
            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
                পরিচয়পত্র / Identification
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {citizen.nid_no && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">জাতীয় পরিচয়পত্র / NID</p>
                    <p className="text-sm text-gray-800">{citizen.nid_no}</p>
                  </div>
                )}
                {citizen.birth_cert_no && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">জন্ম নিবন্ধন / Birth Cert</p>
                    <p className="text-sm text-gray-800">{citizen.birth_cert_no}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
              বর্তমান ঠিকানা / Present Address
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[
                { label: 'গ্রাম (বাংলা)', value: citizen.address?.village_bn || '—' },
                { label: 'Village (EN)', value: citizen.address?.village_en || '—' },
                { label: 'ডাকঘর (বাংলা)', value: citizen.address?.post_office_bn || '—' },
                { label: 'Post Office (EN)', value: citizen.address?.post_office_en || '—' },
                { label: 'থানা (বাংলা)', value: citizen.address?.thana_bn || '—' },
                { label: 'Thana (EN)', value: citizen.address?.thana_en || '—' },
                { label: 'জেলা (বাংলা)', value: citizen.address?.district_bn || '—' },
                { label: 'District (EN)', value: citizen.address?.district_en || '—' },
                { label: 'ওয়ার্ড নং / Ward No', value: citizen.address?.ward_no || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {citizen.permanent_address?.village_bn && (
            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
                স্থায়ী ঠিকানা / Permanent Address
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {[
                  { label: 'গ্রাম (বাংলা)', value: citizen.permanent_address?.village_bn || '—' },
                  { label: 'Village (EN)', value: citizen.permanent_address?.village_en || '—' },
                  { label: 'ডাকঘর (বাংলা)', value: citizen.permanent_address?.post_office_bn || '—' },
                  { label: 'Post Office (EN)', value: citizen.permanent_address?.post_office_en || '—' },
                  { label: 'থানা (বাংলা)', value: citizen.permanent_address?.thana_bn || '—' },
                  { label: 'Thana (EN)', value: citizen.permanent_address?.thana_en || '—' },
                  { label: 'জেলা (বাংলা)', value: citizen.permanent_address?.district_bn || '—' },
                  { label: 'District (EN)', value: citizen.permanent_address?.district_en || '—' },
                  { label: 'ওয়ার্ড নং / Ward No', value: citizen.permanent_address?.ward_no || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-sm text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(citizen.housing_info?.house_type || citizen.housing_info?.ownership_type || citizen.housing_info?.total_rooms) && (
            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
                বাসস্থানের তথ্য / Housing Information
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {citizen.housing_info?.house_type && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">ঘরের ধরন / House Type</p>
                    <p className="text-sm text-gray-800">{citizen.housing_info.house_type}</p>
                  </div>
                )}
                {citizen.housing_info?.ownership_type && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">মালিকানা / Ownership</p>
                    <p className="text-sm text-gray-800">{citizen.housing_info.ownership_type}</p>
                  </div>
                )}
                {citizen.housing_info?.total_rooms && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">কক্ষ সংখ্যা / Rooms</p>
                    <p className="text-sm text-gray-800">{citizen.housing_info.total_rooms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(citizen.financial_info?.annual_income || citizen.financial_info?.occupation || citizen.financial_info?.land_owned_dec) && (
            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
                আর্থিক তথ্য / Financial Information
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {citizen.financial_info?.annual_income && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">বার্ষিক আয় / Annual Income</p>
                    <p className="text-sm text-gray-800">৳ {citizen.financial_info.annual_income.toLocaleString()}</p>
                  </div>
                )}
                {citizen.financial_info?.occupation && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">পেশা / Occupation</p>
                    <p className="text-sm text-gray-800">{citizen.financial_info.occupation}</p>
                  </div>
                )}
                {citizen.financial_info?.land_owned_dec && (
                  <div>
                    <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">জমির পরিমাণ / Land</p>
                    <p className="text-sm text-gray-800">{citizen.financial_info.land_owned_dec} শতক</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800">
              অন্যান্য তথ্য / Other Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">অবস্থা / Status</p>
                <StatusBadge status={citizen.status} />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">নিবন্ধনের তারিখ / Registered</p>
                <p className="text-sm text-gray-800">{new Date(citizen.createdAt).toLocaleDateString('en-BD')}</p>
              </div>
              {citizen.approved_by && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">অনুমোদনকারী / Approved By</p>
                  <p className="text-sm text-gray-800">{citizen.approved_by.name}</p>
                </div>
              )}
              {citizen.approved_at && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">অনুমোদনের তারিখ / Approved At</p>
                  <p className="text-sm text-gray-800">{new Date(citizen.approved_at).toLocaleDateString('en-BD')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {hasPermission(currentUser, PERMISSIONS.CERTIFICATE_CREATE) && (
              <button
                onClick={() => setShowIssueCert(true)}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Issue New Certificate
              </button>
            )}
          </div>
          <DataTable
            columns={certCols}
            data={certs ?? []}
            loading={certsLoading}
            emptyMessage="No certificates found for this citizen."
          />
        </div>
      )}

      {activeTab === 'holding_tax' && (
        <div className="space-y-4">
          {/* Holding Info Card */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">হোল্ডিং তথ্য / Holding Information</h3>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500">হোল্ডিং নং / Holding No</p>
                    <p className="text-lg font-bold text-green-700">
                      {taxData?.holding_no ?? <span className="text-gray-400">Not Generated</span>}
                    </p>
                  </div>
                  {taxData?.holding_no && (
                    <div className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                      First payment generates holding number
                    </div>
                  )}
                </div>
              </div>
              {hasPermission(currentUser, PERMISSIONS.TAX_CREATE) && (
                <button
                  onClick={() => setShowAssessTax(true)}
                  className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Assess Holding Tax
                </button>
              )}
            </div>
          </div>

          {/* Tax Records Table */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">হোল্ডিং ট্যাক্স রেকর্ড / Holding Tax Records</h3>
            {taxLoading ? (
              <div className="h-32 animate-pulse rounded bg-gray-100" />
            ) : (taxData?.taxes?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No holding tax records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Fiscal Year
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Paid At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {taxData?.taxes.map((tax) => (
                      <tr key={tax._id}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{tax.fiscal_year}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          ৳ {tax.amount.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <StatusBadge status={tax.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {tax.paid_at ? new Date(tax.paid_at).toLocaleDateString('en-BD') : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {tax.status === 'unpaid' && hasPermission(currentUser, PERMISSIONS.TAX_COLLECT) && (
                            <button
                              onClick={() => handlePayTax(tax._id)}
                              disabled={paying && payingTaxId === tax._id}
                              className="rounded border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              {paying && payingTaxId === tax._id ? 'Processing...' : 'Pay Now'}
                            </button>
                          )}
                          {tax.status === 'paid' && tax.payment_id && (
                            <button
                              onClick={() => downloadTaxReceipt(tax.payment_id!)}
                              className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Download Receipt
                            </button>
                          )}
                          {tax.status === 'paid' && !tax.payment_id && (
                            <span className="text-xs text-gray-400">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'warish' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            {hasPermission(currentUser, PERMISSIONS.WARISH_CREATE) && (
              <>
                <button
                  onClick={() => openWarishCreate('warish')}
                  className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Warish Application
                </button>
                <button
                  onClick={() => openWarishCreate('family_certificate')}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Family Certificate
                </button>
              </>
            )}
          </div>
          <DataTable
            columns={warishCols}
            data={warishData?.applications ?? []}
            loading={warishLoading}
            emptyMessage="No warish applications found for this citizen."
          />
        </div>
      )}

      <IssueCertificateModal
        open={showIssueCert}
        onClose={() => setShowIssueCert(false)}
        citizen={citizen}
        onSuccess={() => {
          setShowIssueCert(false)
          toast.success('Certificate issued successfully.')
          refetchCerts()
        }}
      />

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Citizen"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{citizen.name_bn}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white opacity-60"
              title="Delete is disabled"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Assess Holding Tax Modal */}
      <Modal
        open={showAssessTax}
        onClose={() => { setShowAssessTax(false); setTaxForm({ fiscal_year: '2025-2026', amount: '' }) }}
        title="Assess Holding Tax"
        size="sm"
      >
        <form onSubmit={handleAssessTax} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fiscal Year *</label>
            <select
              required
              value={taxForm.fiscal_year}
              onChange={(e) => setTaxForm((f) => ({ ...f, fiscal_year: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {FISCAL_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Amount (৳) *</label>
            <input
              required
              type="number"
              min="0"
              value={taxForm.amount}
              onChange={(e) => setTaxForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAssessTax(false); setTaxForm({ fiscal_year: '2025-2026', amount: '' }) }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assessingTax}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {assessingTax ? 'Assessing...' : 'Assess Holding Tax'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Warish / Family Certificate Create Modal */}
      <Modal
        open={showWarishCreate}
        onClose={() => { setShowWarishCreate(false); setWarishIsPreview(false); setWarishErrorMsg('') }}
        title={warishForm.application_type === 'family_certificate' ? 'New Family Certificate Application' : 'New Warish Application'}
        size="lg"
      >
        {warishIsPreview ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              Review the details before submitting.
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {warishForm.application_type === 'family_certificate' ? 'Family Head Information' : 'Deceased Person Information'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gray-100">
                {[
                  [warishForm.application_type === 'family_certificate' ? 'Head Name (BN)' : 'Deceased Name (BN)', warishForm.deceased_name_bn],
                  [warishForm.application_type === 'family_certificate' ? 'Head Name (EN)' : 'Deceased Name (EN)', warishForm.deceased_name_en],
                  ["Father's Name (BN)", warishForm.deceased_father_name_bn],
                  ["Father's Name (EN)", warishForm.deceased_father_name_en],
                  ...(warishForm.deceased_mother_name_bn ? [["Mother's Name (BN)", warishForm.deceased_mother_name_bn], ["Mother's Name (EN)", warishForm.deceased_mother_name_en || '—']] : []),
                  ...(warishForm.application_type === 'warish' && warishForm.date_of_death ? [['Date of Death', new Date(warishForm.date_of_death).toLocaleDateString('en-GB')]] : []),
                  ['Applicant', `${citizen.name_bn} (${citizen.name_en})`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {warishForm.application_type === 'family_certificate' ? 'Family Members' : 'Heirs'}
                </p>
                <span className="text-xs text-gray-400">
                  {(warishForm.application_type === 'family_certificate' ? warishForm.family_members : warishForm.heirs).length} person(s)
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {(warishForm.application_type === 'family_certificate' ? warishForm.family_members : warishForm.heirs).map((m, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center gap-4">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-gray-400 text-xs">Name</span><p className="font-medium text-gray-900">{m.name_bn} / {m.name_en}</p></div>
                      <div><span className="text-gray-400 text-xs">Relation</span><p className="text-gray-700">{m.relation || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">NID</span><p className="text-gray-700">{m.nid_no || '—'}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {warishErrorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{warishErrorMsg}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setWarishIsPreview(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                Back to Edit
              </button>
              <button type="button" onClick={() => handleWarishCreate('draft')} disabled={warishSaving}
                className="px-4 py-2 text-sm rounded-xl border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50">
                {warishSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" onClick={() => handleWarishCreate('pending')} disabled={warishSaving}
                className="px-4 py-2 text-sm rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50">
                {warishSaving ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setWarishIsPreview(true) }} className="space-y-5" autoComplete="off">
            {/* Subject Info */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className={`px-4 py-2.5 border-b border-gray-100 ${warishForm.application_type === 'family_certificate' ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${warishForm.application_type === 'family_certificate' ? 'text-blue-600' : 'text-green-700'}`}>
                  {warishForm.application_type === 'family_certificate' ? 'Family Head Information' : 'Deceased Person Information'}
                </p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {warishForm.application_type === 'family_certificate' ? 'পরিবার প্রধানের নাম (বাংলা) *' : 'মৃত ব্যক্তির নাম (বাংলা) *'}
                  </label>
                  <input required type="text" value={warishForm.deceased_name_bn}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {warishForm.application_type === 'family_certificate' ? 'Head of Family Name (English) *' : 'Deceased Name (English) *'}
                  </label>
                  <input required type="text" value={warishForm.deceased_name_en}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">পিতার নাম (বাংলা) *</label>
                  <input required type="text" value={warishForm.deceased_father_name_bn}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_father_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Father&apos;s Name (English) *</label>
                  <input required type="text" value={warishForm.deceased_father_name_en}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_father_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">মাতার নাম (বাংলা)</label>
                  <input type="text" value={warishForm.deceased_mother_name_bn}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_mother_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mother&apos;s Name (English)</label>
                  <input type="text" value={warishForm.deceased_mother_name_en}
                    onChange={(e) => setWarishForm((f) => ({ ...f, deceased_mother_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                {warishForm.application_type === 'warish' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date of Death *</label>
                      <input required type="date" value={warishForm.date_of_death}
                        onChange={(e) => setWarishForm((f) => ({ ...f, date_of_death: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">মৃত ব্যক্তির NID নং</label>
                      <input type="text" value={warishForm.deceased_nid}
                        onChange={(e) => setWarishForm((f) => ({ ...f, deceased_nid: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Applicant (Citizen)</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {citizen.name_bn} ({citizen.name_en})
                    <span className="ml-2 text-xs text-emerald-600 font-medium">✓ Pre-filled from profile</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members / Heirs */}
            {(() => {
              const memberKey = warishForm.application_type === 'family_certificate' ? 'family_members' : 'heirs'
              const members = warishForm[memberKey]
              const isFam = warishForm.application_type === 'family_certificate'
              return (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {isFam ? 'Family Members' : 'Heirs'}
                    </p>
                    <button type="button" onClick={() => addWarishMember(memberKey)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {isFam ? 'Add Member' : 'Add Heir'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 p-2">
                    {members.map((heir, i) => (
                      <div key={i} className="rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-xs font-bold text-green-700 flex items-center justify-center">{i + 1}</span>
                            <span className="text-xs font-medium text-gray-500">{isFam ? `Member ${i + 1}` : `Heir ${i + 1}`}</span>
                          </span>
                          {members.length > 1 && (
                            <button type="button" onClick={() => removeWarishMember(memberKey, i)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="নাম (বাংলা)" required value={heir.name_bn}
                            onChange={(e) => updateWarishMember(memberKey, i, 'name_bn', e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="Name (English)" required value={heir.name_en}
                            onChange={(e) => updateWarishMember(memberKey, i, 'name_en', e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <select required value={heir.relation}
                            onChange={(e) => updateWarishMember(memberKey, i, 'relation', e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                            <option value="">Relation</option>
                            <option value="Son">Son (পুত্র)</option>
                            <option value="Daughter">Daughter (কন্যা)</option>
                            <option value="Wife">Wife (স্ত্রী)</option>
                            <option value="Husband">Husband (স্বামী)</option>
                            <option value="Father">Father (পিতা)</option>
                            <option value="Mother">Mother (মাতা)</option>
                            <option value="Brother">Brother (ভাই)</option>
                            <option value="Sister">Sister (বোন)</option>
                          </select>
                          <input type="date" required value={heir.birth_date}
                            onChange={(e) => updateWarishMember(memberKey, i, 'birth_date', e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          <input type="text" placeholder="NID Number" value={heir.nid_no}
                            onChange={(e) => updateWarishMember(memberKey, i, 'nid_no', e.target.value)}
                            className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {warishErrorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{warishErrorMsg}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button"
                onClick={() => { setShowWarishCreate(false); setWarishErrorMsg('') }}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className={`px-5 py-2 text-sm rounded-xl font-semibold text-white transition-colors ${warishForm.application_type === 'family_certificate' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-700 hover:bg-green-800'}`}>
                Preview & Continue
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
