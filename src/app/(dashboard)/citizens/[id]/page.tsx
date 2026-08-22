'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import CitizenRegistrationForm from '@/components/forms/CitizenRegistrationForm'
import IssueCertificateModal from '@/components/certificates/IssueCertificateModal'
import WarishCreateModal, { type WarishApplicationType } from '@/components/warish/WarishCreateModal'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'
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


export default function CitizenDetailPage() {
  const currentUser = useUser()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'holding_tax' | 'warish'>('profile')
  const [showIssueCert, setShowIssueCert] = useState(false)

  // Warish create flow — state and modal live in WarishCreateModal.
  const [warishCreateType, setWarishCreateType] = useState<WarishApplicationType | null>(null)

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
      // Fetch receipt data
      const res = await apiCall(`/api/payments/${paymentId}/tax-receipt`, { method: 'GET' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch receipt data' }))
        toast.error(errorData.message || 'Failed to fetch receipt data.')
        return
      }

      const { data } = await res.json()

      const { generateTaxReceiptHtml } = await import('@/lib/utils/tax-receipt-render')
      const receiptHtml = generateTaxReceiptHtml(data)

      const receiptNo = data.payment?.receipt_no || 'receipt'
      // 'contain' so the receipt is never cropped — a clipped bottom would cut
      // off the amount, which is the part that matters on a payment receipt.
      await downloadHtmlAsPdf(receiptHtml, `holding-tax-receipt-${receiptNo}.pdf`, {
        fit: 'contain',
        quality: 0.95,
        containerStyle: 'margin:0; padding:0;',
      })
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
                  onClick={() => setWarishCreateType('warish')}
                  className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Warish Application
                </button>
                <button
                  onClick={() => setWarishCreateType('family_certificate')}
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

      {/*
        The Delete Citizen modal was removed as unreachable dead code: nothing
        ever called setShowDeleteModal(true), and its Delete button was
        hardcoded `disabled`, so no user could reach or use it.

        DELETE /api/citizens/[id] still exists and works (soft delete via
        deleted_at). Re-enabling this needs a deliberate decision about who may
        delete a citizen record — restore from git history if that is wanted.
      */}

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
      <WarishCreateModal
        citizenId={id}
        citizen={{ name_bn: citizen.name_bn, name_en: citizen.name_en }}
        applicationType={warishCreateType}
        onClose={() => setWarishCreateType(null)}
        onCreated={refetchWarish}
      />

    </div>
  )
}
