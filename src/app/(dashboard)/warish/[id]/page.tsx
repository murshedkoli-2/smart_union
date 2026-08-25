'use client'

/**
 * Warish / family-certificate application detail.
 *
 * The screen is arrangement only: data comes from useApi, every mutation and
 * download lives in useWarishActions, and the markup lives in ./components.
 */
import { useState, use } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  certificateId,
  type WarishApplication,
  type WarishEditFormState,
  type WarishPageSettings,
} from '@/types/warish.types'
import {
  ApplicantCard,
  CertificateIssuance,
  EditApplicationModal,
  MembersTable,
  SubjectCard,
  WorkflowStatus,
  formatDate,
} from './components'
import { useWarishActions } from './useWarishActions'

export default function WarishDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const currentUser = useUser()
  const canApprove = isSuperAdmin(currentUser)

  const { data: application, loading, error, refetch } = useApi<WarishApplication>(
    `/api/warish/${id}`,
    [id],
  )
  const { data: settings } = useApi<WarishPageSettings>('/api/system-settings')

  const isFamilyCertificate = application?.application_type === 'family_certificate'
  const members = (isFamilyCertificate ? application?.family_members : application?.heirs) || []

  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState<WarishEditFormState | null>(null)

  const actions = useWarishActions({ id, application, settings, members, refetch })

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
    if (!form) return
    if (await actions.update(form)) setShowEditModal(false)
  }

  const handleSubmitForReview = () => {
    if (!confirm('Are you sure you want to submit this application for review?')) return
    actions.submitForReview()
  }

  const handleApprove = () => {
    if (!confirm('Approve this application?')) return
    actions.approve()
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

  const { processing } = actions
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
            <div className={`rounded-lg px-3 py-1 text-xs font-semibold ${typeColor}`}>{typeLabel}</div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isFamilyCertificate ? 'পারিবারিক সনদ আবেদন' : 'ওয়ারিশ সনদ আবেদন'}
            </h1>
            <StatusBadge status={application.status} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {application.status !== 'approved' && (
              <button
                onClick={actions.downloadApplicationPdf}
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
                  onClick={handleSubmitForReview}
                  disabled={processing}
                  className="flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
                >
                  Submit for Review
                </button>
              </>
            )}
            {application.status === 'pending' && !application.payment_id && (
              <button
                onClick={actions.pay}
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
        <SubjectCard application={application} isFamilyCertificate={!!isFamilyCertificate} />
        <ApplicantCard application={application} />
      </div>

      <MembersTable members={members} isFamilyCertificate={!!isFamilyCertificate} />

      {application.status === 'approved' && (
        <CertificateIssuance
          hasBnCert={!!certificateId(application.certificate_id_bn)}
          hasEnCert={!!certificateId(application.certificate_id_en)}
          processing={processing}
          canIssue={currentUser?.role !== 'citizen'}
          onIssue={actions.issueCertificate}
          onDownload={actions.redownloadCertificate}
        />
      )}

      {showEditModal && form && (
        <EditApplicationModal
          open={showEditModal}
          form={form}
          isFamilyCertificate={!!isFamilyCertificate}
          processing={processing}
          onChange={setForm}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  )
}
