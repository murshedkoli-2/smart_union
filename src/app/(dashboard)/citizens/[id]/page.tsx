'use client'

/**
 * Citizen detail: profile, certificates, holding tax and warish applications.
 *
 * The page owns the tab state and the four fetches; each tab draws itself, and
 * the tax workflow lives in useCitizenTax.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import CitizenRegistrationForm from '@/components/forms/CitizenRegistrationForm'
import IssueCertificateModal from '@/components/certificates/IssueCertificateModal'
import WarishCreateModal, { type WarishApplicationType } from '@/components/warish/WarishCreateModal'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'
import type {
  CitizenCertificate,
  CitizenRecord,
  CitizenTaxData,
  CitizenWarishSummary,
} from '@/types/citizen.types'
import ProfileTab from './ProfileTab'
import HoldingTaxTab from './HoldingTaxTab'
import { useCitizenTax } from './useCitizenTax'

type Tab = 'profile' | 'documents' | 'holding_tax' | 'warish'

const TAB_LABELS: Record<Tab, string> = {
  profile: 'Profile',
  documents: 'Certificates',
  holding_tax: 'Holding Tax',
  warish: 'Warish',
}

const PLUS_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const viewLink = (href: string) => (
  <a href={href} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
    View
  </a>
)

const CERTIFICATE_COLUMNS: Column[] = [
  { key: 'certificate_no', label: 'Cert No' },
  { key: 'language', label: 'Language', render: (value) => (value === 'bn' ? 'বাংলা' : 'English') },
  { key: 'certificate_type', label: 'Type' },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
  { key: 'fiscal_year', label: 'Fiscal Year' },
  { key: '_id', label: 'Action', render: (value) => viewLink(`/certificates/${value}`) },
]

const WARISH_COLUMNS: Column[] = [
  {
    key: 'deceased_name_bn',
    label: 'Subject',
    render: (_, row) =>
      row.application_type === 'family_certificate' ? 'Family Certificate' : row.deceased_name_bn,
  },
  { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
  {
    key: 'createdAt',
    label: 'Applied Date',
    render: (value) => new Date(value).toLocaleDateString('en-BD'),
  },
  { key: '_id', label: 'Action', render: (value) => viewLink(`/warish/${value}`) },
]

export default function CitizenDetailPage() {
  const currentUser = useUser()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [showIssueCert, setShowIssueCert] = useState(false)
  const [warishCreateType, setWarishCreateType] = useState<WarishApplicationType | null>(null)

  const { data: citizen, loading, error, refetch } = useApi<CitizenRecord>(`/api/citizens/${id}`)
  const { data: certs, loading: certsLoading, refetch: refetchCerts } = useApi<CitizenCertificate[]>(
    `/api/certificates?citizen_id=${id}`,
    [id],
  )
  const { data: taxData, loading: taxLoading, refetch: refetchTax } = useApi<CitizenTaxData>(
    `/api/citizens/${id}/tax`,
    [id],
  )
  const { data: warishData, loading: warishLoading, refetch: refetchWarish } = useApi<{
    applications: CitizenWarishSummary[]
  }>(`/api/warish?applicant_citizen_id=${id}&limit=50`, [id])

  const tax = useCitizenTax(id, refetchTax)

  /** Approve and reject differ only in the path and the wording. */
  const decide = async (action: 'approve' | 'reject') => {
    const res = await apiCall(`/api/citizens/${id}/${action}`, { method: 'POST' })
    if (res.ok) {
      toast.success(`Citizen ${action === 'approve' ? 'approved' : 'rejected'}.`)
      refetch()
    } else {
      toast.error(`Failed to ${action}.`)
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
    // A citizen who has signed up but has no citizen record yet lands here via
    // /citizens/profile; give them the registration form rather than an error.
    if (id === 'profile' && currentUser?.role === 'citizen') {
      return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Setup Your Profile</h1>
            <p className="text-sm text-gray-500 mb-6">
              Please complete your citizen profile to access union services.
            </p>
            <CitizenRegistrationForm
              onSuccess={() => {
                toast.success('Profile setup successfully.')
                refetch()
              }}
              onCancel={() => router.push('/dashboard')}
            />
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
                onClick={() => decide('approve')}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Approve
              </button>
              <button
                onClick={() => decide('reject')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
          {/*
            Delete stays visible but inert. DELETE /api/citizens/[id] works
            (soft delete via deleted_at); enabling this needs a deliberate
            decision about who may delete a citizen record.
          */}
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
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && <ProfileTab citizen={citizen} />}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {hasPermission(currentUser, PERMISSIONS.CERTIFICATE_CREATE) && (
              <button
                onClick={() => setShowIssueCert(true)}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
              >
                {PLUS_ICON}
                Issue New Certificate
              </button>
            )}
          </div>
          <DataTable
            columns={CERTIFICATE_COLUMNS}
            data={certs ?? []}
            loading={certsLoading}
            emptyMessage="No certificates found for this citizen."
          />
        </div>
      )}

      {activeTab === 'holding_tax' && (
        <HoldingTaxTab
          taxData={taxData}
          loading={taxLoading}
          canAssess={hasPermission(currentUser, PERMISSIONS.TAX_CREATE)}
          canCollect={hasPermission(currentUser, PERMISSIONS.TAX_COLLECT)}
          assessing={tax.assessing}
          payingTaxId={tax.payingTaxId}
          onAssess={tax.assess}
          onPay={tax.pay}
          onDownloadReceipt={tax.downloadReceipt}
        />
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
                  {PLUS_ICON}
                  New Warish Application
                </button>
                <button
                  onClick={() => setWarishCreateType('family_certificate')}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {PLUS_ICON}
                  New Family Certificate
                </button>
              </>
            )}
          </div>
          <DataTable
            columns={WARISH_COLUMNS}
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
