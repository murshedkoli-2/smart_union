'use client'

import type {
  CertificateTemplate,
  CitizenForCert,
  EditableCertificateInfo,
} from '@/types/certificate.types'

const FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

function SummaryTile({
  label,
  primary,
  secondary,
  accent,
}: {
  label: string
  primary: React.ReactNode
  secondary?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
      }`}
    >
      <p
        className={`mb-1 text-xs uppercase tracking-wide ${accent ? 'text-green-600' : 'text-gray-400'}`}
      >
        {label}
      </p>
      {primary}
      {secondary}
    </div>
  )
}

/** The four fields a clerk may re-word for this certificate only. */
function CertificateInfoCard({
  info,
  editing,
  onToggleEditing,
  onChange,
}: {
  info: EditableCertificateInfo
  editing: boolean
  onToggleEditing: () => void
  onChange: (info: EditableCertificateInfo) => void
}) {
  const set = (key: keyof EditableCertificateInfo, value: string) =>
    onChange({ ...info, [key]: value })

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Certificate Information</p>
          <p className="text-xs text-gray-500">
            Edit only this certificate content. The template will not change.
          </p>
        </div>
        <button
          onClick={onToggleEditing}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {editing ? 'Done Editing' : 'Edit Information'}
        </button>
      </div>

      {editing ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
            <input
              value={info.person_name}
              onChange={(e) => set('person_name', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Father&apos;s Name</label>
            <input
              value={info.father_name}
              onChange={(e) => set('father_name', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Mother&apos;s Name</label>
            <input
              value={info.mother_name}
              onChange={(e) => set('mother_name', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
            <textarea
              rows={3}
              value={info.address}
              onChange={(e) => set('address', e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Name:</strong> {info.person_name || '-'}</p>
          <p><strong>Father&apos;s Name:</strong> {info.father_name || '-'}</p>
          <p><strong>Mother&apos;s Name:</strong> {info.mother_name || '-'}</p>
          <p><strong>Address:</strong> {info.address || '-'}</p>
        </div>
      )}
    </div>
  )
}

/**
 * A4 page preview.
 *
 * The HTML comes from this app's own renderer, not from user input directly —
 * the values inside it are escaped by the render helpers.
 */
function A4Preview({ html }: { html: string }) {
  return (
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
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}

const SPINNER = (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function PreviewStep({
  citizen,
  template,
  info,
  editing,
  html,
  saving,
  isCitizen,
  onToggleEditing,
  onInfoChange,
  onBack,
  onCancel,
  onSubmit,
}: {
  citizen: CitizenForCert
  template: CertificateTemplate | null
  info: EditableCertificateInfo
  editing: boolean
  html: string
  saving: boolean
  /** A citizen applies; staff issue. Only the wording differs. */
  isCitizen: boolean
  onToggleEditing: () => void
  onInfoChange: (info: EditableCertificateInfo) => void
  onBack: () => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile
          label="Citizen"
          primary={
            <p className="text-sm font-semibold leading-tight text-gray-900">{citizen.name_bn}</p>
          }
          secondary={<p className="mt-0.5 text-xs text-gray-500">{citizen.name_en}</p>}
        />
        <SummaryTile
          label="Template"
          primary={
            <p className="text-sm font-semibold leading-tight text-gray-900">{template?.name}</p>
          }
          secondary={
            <p className="mt-0.5 text-xs capitalize text-gray-500">
              {template?.certificate_category?.replace(/_/g, ' ')}
            </p>
          }
        />
        <SummaryTile
          label="Fee"
          accent
          primary={<p className="text-xl font-bold text-green-700">৳ {template?.fee}</p>}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Approval Required
        </p>
        <p className="mt-1 text-sm text-amber-900">
          Certificate number and verification QR will be generated only after admin approval.
        </p>
      </div>

      <CertificateInfoCard
        info={info}
        editing={editing}
        onToggleEditing={onToggleEditing}
        onChange={onInfoChange}
      />

      <A4Preview html={html} />

      <div className="flex justify-between border-t border-gray-100 pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Back To Template
        </button>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? (
              <>
                {SPINNER}
                {isCitizen ? 'Applying...' : 'Issuing...'}
              </>
            ) : isCitizen ? (
              'Apply for Certificate'
            ) : (
              'Issue Certificate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
