'use client'

import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import type { WarishListItem } from '@/types/warish.types'

const FAMILY_ICON = (
  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
)

const DOCUMENT_ICON = (
  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
)

const CHECK_ICON = (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
)

const date = (value: string) => new Date(value).toLocaleDateString('en-GB')

function CertificateLinks({ app }: { app: WarishListItem }) {
  if (!app.certificate_id_bn && !app.certificate_id_en) {
    return <span className="text-xs text-gray-300">—</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {app.certificate_id_bn && (
        <Link
          href={`/warish/${app._id}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
        >
          {CHECK_ICON}
          BN
        </Link>
      )}
      {app.certificate_id_en && (
        <Link
          href={`/warish/${app._id}`}
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
        >
          {CHECK_ICON}
          EN
        </Link>
      )}
    </div>
  )
}

function ApplicationRow({
  app,
  canApprove,
  onApprove,
  onReject,
}: {
  app: WarishListItem
  canApprove: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const isFamily = app.application_type === 'family_certificate'
  const members = isFamily ? app.family_members : app.heirs

  return (
    <tr className="hover:bg-gray-50/70 transition-colors group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isFamily ? 'bg-blue-50' : 'bg-green-50'
            }`}
          >
            {isFamily ? FAMILY_ICON : DOCUMENT_ICON}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isFamily
                ? app.applicant_citizen_id?.name_bn || 'Family Certificate'
                : app.deceased_name_bn}
            </p>
            <p className="text-xs text-gray-400">
              {isFamily ? app.applicant_citizen_id?.name_en || '' : app.deceased_name_en}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        {app.applicant_citizen_id ? (
          <div>
            <p className="text-sm text-gray-700">{app.applicant_citizen_id.name_bn}</p>
            <p className="text-xs text-gray-400">{app.applicant_citizen_id.name_en}</p>
          </div>
        ) : (
          <span className="text-sm text-gray-300">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {Array.isArray(members) ? members.length : 0}
          <span className="text-gray-400">{isFamily ? 'members' : 'heirs'}</span>
        </span>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm text-gray-600">
          {!isFamily && app.date_of_death ? date(app.date_of_death) : date(app.createdAt)}
        </p>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={app.status} />
      </td>
      <td className="px-5 py-4">
        <CertificateLinks app={app} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/warish/${app._id}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            View
          </Link>
          {app.status === 'pending' && canApprove && (
            <>
              <button
                onClick={() => onApprove(app._id)}
                className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(app._id)}
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function ApplicationsTable({
  applications,
  loading,
  canApprove,
  lang,
  onApprove,
  onReject,
}: {
  applications: WarishListItem[]
  loading: boolean
  canApprove: boolean
  lang: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const bn = lang === 'bn'

  const headers = [
    bn ? 'বিষয়' : 'Subject',
    bn ? 'আবেদনকারী' : 'Applicant',
    bn ? 'সদস্যবৃন্দ' : 'Members',
    bn ? 'তারিখ' : 'Date',
    bn ? 'অবস্থা' : 'Status',
    bn ? 'সার্টিফিকেট' : 'Certificate',
  ]

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">
              {bn ? 'আবেদনসমূহ লোড হচ্ছে...' : 'Loading applications...'}
            </p>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {bn ? 'কোনো আবেদন পাওয়া যায়নি' : 'No applications found'}
          </p>
          <p className="text-xs text-gray-400">Try adjusting your filters or create a new one</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {header}
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {bn ? 'কার্যক্রম' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => (
                <ApplicationRow
                  key={app._id}
                  app={app}
                  canApprove={canApprove}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
