'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { useUser } from '@/hooks/useUser'
import { useLanguage } from '@/contexts/LanguageContext'
import { CERTIFICATE_TYPE_LABELS } from '@/constants/certificate-types'
import IssueCertificateModal, { type CitizenForCert } from '@/components/certificates/IssueCertificateModal'
import { useEffect } from 'react'

interface Certificate {
  _id: string
  certificate_no: string | null
  language: string
  certificate_type: string
  citizen_id: { name_bn: string; name_en: string } | null
  status: string
  fiscal_year: string
  createdAt: string
}

const CERT_TYPES = [
  'birth_certificate', 'death_certificate', 'marriage_certificate',
  'nationality_certificate', 'character_certificate', 'income_certificate',
  'residence_certificate', 'WAR', 'FAM', 'trade_license', 'other',
]

export default function CertificatesPage() {
  const [page, setPage] = useState(1)
  const [langFilter, setLangFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const currentUser = useUser();
  const { lang } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [citizenProfile, setCitizenProfile] = useState<CitizenForCert | null>(null)

  useEffect(() => {
    if (currentUser?.role === 'citizen') {
      apiCall('/api/citizens/profile')
        .then((res) => res.json())
        .then((d) => {
          if (d.data && d.data.status === 'approved') {
            setCitizenProfile(d.data)
          }
        })
        .catch(() => {})
    }
  }, [currentUser])

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (langFilter) p.set('language', langFilter)
    if (typeFilter) p.set('certificate_type', typeFilter)
    if (statusFilter) p.set('status', statusFilter)
    return `/api/certificates?${p.toString()}`
  }

  const { data, loading, error, refetch, pagination } = useApi<Certificate[]>(buildUrl(), [
    page, langFilter, typeFilter, statusFilter,
  ])

  const handleSubmit = async (id: string) => {
    const res = await apiCall(`/api/certificates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pending' }),
    })
    if (res.ok) { toast.success('Certificate submitted for approval.'); refetch() }
    else {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to change certificate status.')
    }
  }

  const columns: Column[] = [
    {
      key: 'certificate_no',
      label: 'Cert No',
      render: (value, row) => (
        <span className={value ? 'font-medium text-green-700' : 'text-gray-400 text-xs'}>
          {value || (row.status === 'approved' ? '—' : 'Draft')}
        </span>
      ),
    },
    {
      key: 'language',
      label: lang === 'bn' ? 'ভাষা' : 'Lang',
      render: (v) => <span className="text-xs font-medium text-gray-600">{v === 'bn' ? 'বাংলা' : 'EN'}</span>,
    },
    {
      key: 'certificate_type',
      label: lang === 'bn' ? 'ধরন' : 'Type',
      render: (v) => (
        <span className="text-sm text-gray-700">
          {CERTIFICATE_TYPE_LABELS[v as keyof typeof CERTIFICATE_TYPE_LABELS] || v?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'citizen_id',
      label: lang === 'bn' ? 'নাগরিক' : 'Citizen',
      render: (val) => val ? (
        <div>
          <p className="text-sm text-gray-800">{val.name_bn}</p>
          <p className="text-xs text-gray-400">{val.name_en}</p>
        </div>
      ) : '—',
    },
    {
      key: 'status',
      label: lang === 'bn' ? 'অবস্থা' : 'Status',
      render: (v) => <StatusBadge status={v === 'locked' ? 'approved' : v} />,
    },
    { key: 'fiscal_year', label: lang === 'bn' ? 'অর্থবছর' : 'Fiscal Year' },
    {
      key: '_id',
      label: lang === 'bn' ? 'কার্যক্রম' : 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/certificates/${id}`}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {lang === 'bn' ? 'দেখুন' : 'View'}
          </Link>
          {row.status === 'draft' && currentUser?.role !== 'citizen' && (
            <button
              onClick={() => handleSubmit(id)}
              className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              {lang === 'bn' ? 'জমা দিন' : 'Submit'}
            </button>
          )}
        </div>
      ),
    },
  ]

  const certs = data ?? []
  const total = pagination?.total ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title={lang === 'bn' ? 'সার্টিফিকেটসমূহ' : 'Certificates'}
        action={
          currentUser?.role !== 'citizen' ? (
            <Link
              href="/admin/certificate-templates"
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {lang === 'bn' ? 'টেমপ্লেট পরিচালনা করুন' : 'Manage Templates'}
            </Link>
          ) : citizenProfile ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              {lang === 'bn' ? 'সার্টিফিকেটের আবেদন করুন' : 'Apply for Certificate'}
            </button>
          ) : currentUser?.role === 'citizen' && (
            <span className="text-sm text-gray-500 italic">{lang === 'bn' ? 'আবেদন করার জন্য প্রোফাইল যাচাই করা আবশ্যক' : 'Profile must be verified to apply'}</span>
          )
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {currentUser?.role !== 'citizen' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          {lang === 'bn' ? <>নতুন সার্টিফিকেট ইস্যু করতে, একজন নাগরিকের প্রোফাইলে যান এবং <strong>নতুন সার্টিফিকেট ইস্যু করুন</strong>-এ ক্লিক করুন।</> : <>To issue a new certificate, go to a citizen&apos;s profile and click <strong>Issue New Certificate</strong>.</>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={langFilter}
          onChange={(e) => { setLangFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব ভাষা' : 'All Languages'}</option>
          <option value="bn">বাংলা</option>
          <option value="en">English</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">{lang === 'bn' ? 'সব ধরন' : 'All Types'}</option>
          {CERT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CERTIFICATE_TYPE_LABELS[t as keyof typeof CERTIFICATE_TYPE_LABELS] || t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <DataTable columns={columns} data={certs} loading={loading} emptyMessage="No certificates found." />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />

      {isModalOpen && citizenProfile && (
        <IssueCertificateModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          citizen={citizenProfile}
          onSuccess={() => {
            setIsModalOpen(false)
            toast.success('Application submitted successfully. Awaiting review.')
            refetch()
          }}
        />
      )}
    </div>
  )
}
