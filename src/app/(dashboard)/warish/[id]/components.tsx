'use client'

/**
 * Presentational pieces of the warish detail page.
 *
 * Split out so page.tsx reads as the arrangement of the screen rather than
 * a thousand lines of markup. Nothing here fetches or mutates: each part takes
 * the data it draws and, where it acts, a callback.
 */
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import type { Heir, WarishApplication, WarishEditFormState } from '@/types/warish.types'

export const formatDate = (date: string | Date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
]

export function WorkflowStatus({ status }: { status: string }) {
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

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  )
}

export function SubjectCard({
  application,
  isFamilyCertificate,
}: {
  application: WarishApplication
  isFamilyCertificate: boolean
}) {
  return (
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
        {application.deceased_nid && <InfoRow label="NID নং" value={application.deceased_nid} />}
      </div>
    </div>
  )
}

export function ApplicantCard({ application }: { application: WarishApplication }) {
  const applicant = application.applicant_citizen_id

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="rounded-t-xl bg-gray-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-700">আবেদনকারীর তথ্য</h3>
      </div>
      {applicant ? (
        <div className="divide-y divide-gray-50 p-5">
          <InfoRow label="নাম (বাংলা)" value={applicant.name_bn} />
          <InfoRow label="Name (EN)" value={applicant.name_en} />
          {applicant.father_name_bn && <InfoRow label="পিতার নাম" value={applicant.father_name_bn} />}
          {applicant.mobile && <InfoRow label="মোবাইল" value={applicant.mobile} />}
          {applicant.nid_no && <InfoRow label="NID নং" value={applicant.nid_no} />}
          <div className="pt-4">
            <Link
              href={`/citizens/${applicant._id}`}
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
  )
}

export function MembersTable({
  members,
  isFamilyCertificate,
}: {
  members: Heir[]
  isFamilyCertificate: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-800">
            {isFamilyCertificate ? 'পরিবারের সদস্যবৃন্দ' : 'ওয়ারিশগণের তালিকা'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">{members.length} জন</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {members.length} members
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
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No members added yet
                </td>
              </tr>
            ) : (
              members.map((heir, idx) => (
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
  )
}

const CHECK_ICON = (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
)

/**
 * One language's certificate card. Bengali and English differed only in
 * accent colour and label, so they share a component.
 */
function CertificateCard({
  issued,
  processing,
  canIssue,
  accent,
  flag,
  title,
  subtitle,
  issueLabel,
  downloadLabel,
  onIssue,
  onDownload,
}: {
  issued: boolean
  processing: boolean
  canIssue: boolean
  accent: 'emerald' | 'blue'
  flag: string
  title: string
  subtitle: string
  issueLabel: string
  downloadLabel: string
  onIssue: () => void
  onDownload: () => void
}) {
  // Written out rather than interpolated: Tailwind only ships classes it can
  // see as complete strings in the source.
  const theme =
    accent === 'emerald'
      ? {
          border: issued ? 'border-emerald-200 bg-white' : 'border-dashed border-emerald-200 bg-white/60',
          badge: 'bg-emerald-100 text-emerald-700',
          download: 'bg-emerald-600 hover:bg-emerald-700',
          issue: 'bg-emerald-700 hover:bg-emerald-800',
          waiting: 'bg-emerald-50 text-emerald-700',
        }
      : {
          border: issued ? 'border-blue-200 bg-white' : 'border-dashed border-blue-200 bg-white/60',
          badge: 'bg-blue-100 text-blue-700',
          download: 'bg-blue-600 hover:bg-blue-700',
          issue: 'bg-blue-700 hover:bg-blue-800',
          waiting: 'bg-blue-50 text-blue-700',
        }

  return (
    <div className={`rounded-xl border p-4 ${theme.border}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        {issued ? (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${theme.badge}`}>
            {CHECK_ICON}
            Issued
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-400">Not issued</span>
        )}
      </div>
      {issued ? (
        <button
          onClick={onDownload}
          disabled={processing}
          className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${theme.download}`}
        >
          {downloadLabel}
        </button>
      ) : canIssue ? (
        <button
          onClick={onIssue}
          disabled={processing}
          className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${theme.issue}`}
        >
          {issueLabel}
        </button>
      ) : (
        <div className={`w-full rounded-lg px-3 py-2 text-center text-sm font-medium ${theme.waiting}`}>
          Awaiting generation by Union
        </div>
      )}
    </div>
  )
}

export function CertificateIssuance({
  hasBnCert,
  hasEnCert,
  processing,
  canIssue,
  onIssue,
  onDownload,
}: {
  hasBnCert: boolean
  hasEnCert: boolean
  processing: boolean
  /** A citizen sees the status but cannot issue. */
  canIssue: boolean
  onIssue: (language: 'bn' | 'en') => void
  onDownload: (language: 'bn' | 'en') => void
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
      <div className="border-b border-emerald-100 px-5 py-4">
        <h3 className="font-semibold text-emerald-900">Certificate Issuance</h3>
        <p className="mt-0.5 text-xs text-emerald-600">
          Issue and download certificates for this approved application
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <CertificateCard
          issued={hasBnCert}
          processing={processing}
          canIssue={canIssue}
          accent="emerald"
          flag="🇧🇩"
          title="বাংলা সনদ"
          subtitle="Bengali Certificate"
          issueLabel="বাংলা সনদ জারি ও ডাউনলোড"
          downloadLabel="Download BN PDF"
          onIssue={() => onIssue('bn')}
          onDownload={() => onDownload('bn')}
        />
        <CertificateCard
          issued={hasEnCert}
          processing={processing}
          canIssue={canIssue}
          accent="blue"
          flag="🇬🇧"
          title="English Certificate"
          subtitle="ইংরেজি সনদ"
          issueLabel="Issue & Download English"
          downloadLabel="Download EN PDF"
          onIssue={() => onIssue('en')}
          onDownload={() => onDownload('en')}
        />
      </div>
    </div>
  )
}

const FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100'

export function EditApplicationModal({
  open,
  form,
  isFamilyCertificate,
  processing,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  form: WarishEditFormState
  isFamilyCertificate: boolean
  processing: boolean
  onChange: (form: WarishEditFormState) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const field = (key: keyof WarishEditFormState, value: string) =>
    onChange({ ...form, [key]: value })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isFamilyCertificate ? 'পারিবারিক সনদ সম্পাদনা' : 'ওয়ারিশ আবেদন সম্পাদনা'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
                onChange={(e) => field('deceased_name_bn', e.target.value)}
                className={FIELD_CLASS}
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
                onChange={(e) => field('deceased_name_en', e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">পিতার নাম (BN)</label>
              <input
                type="text"
                value={form.deceased_father_name_bn}
                onChange={(e) => field('deceased_father_name_bn', e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Father&apos;s Name (EN)</label>
              <input
                type="text"
                value={form.deceased_father_name_en}
                onChange={(e) => field('deceased_father_name_en', e.target.value)}
                className={FIELD_CLASS}
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
                    onChange={(e) => field('date_of_death', e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Deceased NID</label>
                  <input
                    type="text"
                    value={form.deceased_nid}
                    onChange={(e) => field('deceased_nid', e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
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
  )
}
