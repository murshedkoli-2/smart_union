'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUser, isSuperAdmin } from '@/hooks/useUser'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'

interface Heir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: string
  nid_no: string
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
  date_of_death: string
  applicant_citizen_id: { name_bn: string; name_en: string } | null
  heirs: Heir[]
  family_members?: Heir[]
  status: string
  createdAt: string
  certificate_id_bn?: string | { _id: string; certificate_no?: string } | null
  certificate_id_en?: string | { _id: string; certificate_no?: string } | null
}

interface WarishResponse {
  applications: WarishApplication[]
  total: number
  page: number
  limit: number
  stats: {
    total: number
    pending: number
    approved: number
    draft: number
    rejected: number
  }
}

const emptyHeir = (): Heir => ({ name_bn: '', name_en: '', relation: '', birth_date: '', nid_no: '' })

const defaultForm = {
  application_type: 'warish' as 'warish' | 'family_certificate',
  deceased_name_bn: '',
  deceased_name_en: '',
  deceased_father_name_bn: '',
  deceased_father_name_en: '',
  deceased_mother_name_bn: '',
  deceased_mother_name_en: '',
  date_of_death: '',
  applicant_citizen_id: '',
  heirs: [emptyHeir()],
  family_members: [emptyHeir()],
}


export default function WarishPage() {
  const currentUser = useUser()
  const { lang } = useLanguage()
  const canApprove = isSuperAdmin(currentUser)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<'warish' | 'family_certificate'>('warish')
  const [showCreate, setShowCreate] = useState(false)
  const [, setCreateType] = useState<'warish' | 'family_certificate'>('warish')
  const [isPreview, setIsPreview] = useState(false)
  const [form, setForm] = useState({ ...defaultForm, heirs: [emptyHeir()], family_members: [emptyHeir()] })
  const [saving, setSaving] = useState(false)
  const [citizenSearch, setCitizenSearch] = useState('')
  const [citizenResults, setCitizenResults] = useState<Array<{ _id: string; name_bn: string; name_en: string; nid: string }>>([])
  const [selectedCitizen, setSelectedCitizen] = useState<{ _id: string; name_bn: string; name_en: string } | null>(null)
  const [showCitizenDropdown, setShowCitizenDropdown] = useState(false)

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (statusFilter) p.set('status', statusFilter)
    p.set('application_type', applicationTypeFilter)
    return `/api/warish?${p.toString()}`
  }

  const { data, loading, error, refetch } = useApi<WarishResponse>(buildUrl(), [page, statusFilter, applicationTypeFilter])

  useEffect(() => {
    const handleClickOutside = () => setShowCitizenDropdown(false)
    if (showCitizenDropdown) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showCitizenDropdown])


  const openCreate = (type: 'warish' | 'family_certificate') => {
    setCreateType(type)
    setForm({ ...defaultForm, application_type: type, heirs: [emptyHeir()], family_members: [emptyHeir()] })
    setSelectedCitizen(null)
    setCitizenSearch('')
    setCitizenResults([])
    setShowCitizenDropdown(false)
    setIsPreview(false)
    setShowCreate(true)
  }

  const handleApprove = async (id: string) => {
    const res = await apiCall(`/api/warish/${id}/approve`, { method: 'POST' })
    if (res.ok) { toast.success('Application approved.'); refetch() }
    else toast.error('Failed to approve.')
  }

  const handleReject = async (id: string) => {
    const res = await apiCall(`/api/warish/${id}/reject`, { method: 'POST' })
    if (res.ok) { toast.success('Application rejected.'); refetch() }
    else toast.error('Failed to reject.')
  }

  const searchCitizens = async (query: string) => {
    if (query.length < 2) { setCitizenResults([]); return }
    try {
      const res = await apiCall(
        `/api/citizens?search=${encodeURIComponent(query)}&status=approved&limit=10`,
      )
      if (res.ok) {
        const d = await res.json()
        setCitizenResults(d.data?.citizens ?? [])
      }
    } catch { /* ignore */ }
  }

  const handleCitizenSearch = (value: string) => {
    setCitizenSearch(value)
    setShowCitizenDropdown(true)
    searchCitizens(value)
  }

  const selectCitizen = (citizen: { _id: string; name_bn: string; name_en: string }) => {
    setSelectedCitizen(citizen)
    setForm((f) => ({ ...f, applicant_citizen_id: citizen._id }))
    setCitizenSearch(`${citizen.name_bn} (${citizen.name_en})`)
    setShowCitizenDropdown(false)
  }

  const handleCreate = async (status: string = 'pending') => {
    setSaving(true)
    const memberKey = form.application_type === 'family_certificate' ? 'family_members' : 'heirs'
    const res = await apiCall('/api/warish', {
      method: 'POST',
      body: JSON.stringify({ ...form, status, [memberKey]: form[memberKey].map((m) => ({ ...m })) }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`${form.application_type === 'family_certificate' ? 'Family certificate' : 'Warish application'} created.`)
      setShowCreate(false)
      setIsPreview(false)
      setForm({ ...defaultForm, heirs: [emptyHeir()], family_members: [emptyHeir()], application_type: applicationTypeFilter })
      setSelectedCitizen(null)
      setCitizenSearch('')
      refetch()
    } else {
      const d = await res.json()
      toast.error(d.message ?? 'Failed to create application.')
    }
  }

  const updateMember = (collection: 'heirs' | 'family_members', i: number, field: keyof Heir, value: string) => {
    setForm((f) => {
      const members = [...f[collection]]
      members[i] = { ...members[i], [field]: value }
      return { ...f, [collection]: members }
    })
  }

  const addMember = (collection: 'heirs' | 'family_members') =>
    setForm((f) => ({ ...f, [collection]: [...f[collection], emptyHeir()] }))
  const removeMember = (collection: 'heirs' | 'family_members', i: number) =>
    setForm((f) => ({ ...f, [collection]: f[collection].filter((_, idx) => idx !== i) }))

  const currentMembers = form.application_type === 'family_certificate' ? form.family_members : form.heirs
  const currentMemberKey: 'heirs' | 'family_members' = form.application_type === 'family_certificate' ? 'family_members' : 'heirs'
  const isFamilyCreate = form.application_type === 'family_certificate'

  const applications = data?.applications ?? []
  const stats = data?.stats ?? { total: 0, pending: 0, approved: 0, draft: 0, rejected: 0 }
  const total = data?.total ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <PageHeader
          title={applicationTypeFilter === 'family_certificate' ? (lang === 'bn' ? 'পারিবারিক সনদ' : 'Family Certificates') : (lang === 'bn' ? 'ওয়ারিশ আবেদনসমূহ' : 'Warish Applications')}
          subtitle={applicationTypeFilter === 'family_certificate'
            ? (lang === 'bn' ? 'পারিবারিক সদস্যপদ সনদ আবেদন পরিচালনা করুন' : 'Manage family membership certificate applications')
            : (lang === 'bn' ? 'আইনগত ওয়ারিশ সনদ আবেদন পরিচালনা করুন' : 'Manage legal heir certificate applications')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openCreate('warish')}
                className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
              >
                + New Warish
              </button>
              <button
                onClick={() => openCreate('family_certificate')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Family Certificate
              </button>
            </div>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'মোট' : 'Total'}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="mt-1 text-xs text-gray-400">{lang === 'bn' ? 'সব আবেদন' : 'All applications'}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
            <p className="mt-1 text-xs text-amber-400">{lang === 'bn' ? 'পর্যালোচনার অপেক্ষায়' : 'Awaiting review'}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.approved}</p>
            <p className="mt-1 text-xs text-emerald-400">{lang === 'bn' ? 'সার্টিফিকেট ইস্যু করা হয়েছে' : 'Certificates issued'}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'খসড়া' : 'Drafts'}</p>
            <p className="mt-2 text-3xl font-bold text-gray-600">{stats.draft}</p>
            <p className="mt-1 text-xs text-gray-400">{lang === 'bn' ? 'জমা দেওয়া হয়নি' : 'Not submitted'}</p>
          </div>
        </div>

        {/* Tab + Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
            <button
              onClick={() => { setApplicationTypeFilter('warish'); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${applicationTypeFilter === 'warish' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Warish
            </button>
            <button
              onClick={() => { setApplicationTypeFilter('family_certificate'); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${applicationTypeFilter === 'family_certificate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Family Certificate
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
          >
            <option value="">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
            <option value="draft">{lang === 'bn' ? 'খসড়া' : 'Draft'}</option>
            <option value="pending">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</option>
            <option value="approved">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</option>
            <option value="rejected">{lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'}</option>
          </select>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">{lang === 'bn' ? 'আবেদনসমূহ লোড হচ্ছে...' : 'Loading applications...'}</p>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-500">{lang === 'bn' ? 'কোনো আবেদন পাওয়া যায়নি' : 'No applications found'}</p>
              <p className="text-xs text-gray-400">Try adjusting your filters or create a new one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'আবেদনকারী' : 'Applicant'}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'সদস্যবৃন্দ' : 'Members'}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'অবস্থা' : 'Status'}</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'সার্টিফিকেট' : 'Certificate'}</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">{lang === 'bn' ? 'কার্যক্রম' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${app.application_type === 'family_certificate' ? 'bg-blue-50' : 'bg-green-50'}`}>
                            {app.application_type === 'family_certificate' ? (
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {app.application_type === 'family_certificate'
                                ? (app.applicant_citizen_id?.name_bn || 'Family Certificate')
                                : app.deceased_name_bn}
                            </p>
                            <p className="text-xs text-gray-400">
                              {app.application_type === 'family_certificate'
                                ? (app.applicant_citizen_id?.name_en || '')
                                : app.deceased_name_en}
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
                        ) : <span className="text-sm text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {app.application_type === 'family_certificate'
                            ? (Array.isArray(app.family_members) ? app.family_members.length : 0)
                            : (Array.isArray(app.heirs) ? app.heirs.length : 0)}
                          <span className="text-gray-400">{app.application_type === 'family_certificate' ? 'members' : 'heirs'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {app.application_type === 'warish' && app.date_of_death ? (
                          <p className="text-sm text-gray-600">{new Date(app.date_of_death).toLocaleDateString('en-GB')}</p>
                        ) : (
                          <p className="text-sm text-gray-600">{new Date(app.createdAt).toLocaleDateString('en-GB')}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4">
                        {app.certificate_id_bn || app.certificate_id_en ? (
                          <div className="flex flex-col gap-1">
                            {app.certificate_id_bn && (
                              <Link
                                href={`/warish/${app._id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                BN
                              </Link>
                            )}
                            {app.certificate_id_en && (
                              <Link
                                href={`/warish/${app._id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                EN
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
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
                                onClick={() => handleApprove(app._id)}
                                className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(app._id)}
                                className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination total={total} page={page} limit={20} onChange={setPage} />

      {/* ── Create Modal ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setIsPreview(false) }}
        title={isFamilyCreate ? 'New Family Certificate Application' : 'New Warish Application'}
        size="lg"
      >
        {isPreview ? (
          /* ── Preview Step ── */
          <div className="space-y-5">
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              Review the details before submitting.
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {isFamilyCreate ? 'Family Head Information' : 'Deceased Person Information'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gray-100">
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{isFamilyCreate ? 'Head Name (BN)' : 'Deceased Name (BN)'}</p>
                  <p className="text-sm font-medium text-gray-900">{form.deceased_name_bn || '—'}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{isFamilyCreate ? 'Head Name (EN)' : 'Deceased Name (EN)'}</p>
                  <p className="text-sm font-medium text-gray-900">{form.deceased_name_en || '—'}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">Father&apos;s Name (BN)</p>
                  <p className="text-sm font-medium text-gray-900">{form.deceased_father_name_bn || '—'}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">Father&apos;s Name (EN)</p>
                  <p className="text-sm font-medium text-gray-900">{form.deceased_father_name_en || '—'}</p>
                </div>
                {form.deceased_mother_name_bn && (
                  <>
                    <div className="bg-white px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Mother&apos;s Name (BN)</p>
                      <p className="text-sm font-medium text-gray-900">{form.deceased_mother_name_bn}</p>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Mother&apos;s Name (EN)</p>
                      <p className="text-sm font-medium text-gray-900">{form.deceased_mother_name_en || '—'}</p>
                    </div>
                  </>
                )}
                {!isFamilyCreate && form.date_of_death && (
                  <div className="bg-white px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Date of Death</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(form.date_of_death).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{lang === 'bn' ? 'আবেদনকারী' : 'Applicant'}</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCitizen?.name_bn || '—'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {isFamilyCreate ? `Family Members` : `Heirs`}
                </p>
                <span className="text-xs text-gray-400">{currentMembers.length} person{currentMembers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {currentMembers.map((m, idx) => (
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

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsPreview(false)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                Back to Edit
              </button>
              <button type="button" onClick={() => handleCreate('draft')} disabled={saving}
                className="px-4 py-2 text-sm rounded-xl border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" onClick={() => handleCreate('pending')} disabled={saving}
                className="px-4 py-2 text-sm rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Form Step ── */
          <form onSubmit={(e) => { e.preventDefault(); setIsPreview(true) }} className="space-y-5" autoComplete="on">

            {/* Section: Subject Info */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className={`px-4 py-2.5 border-b border-gray-100 ${isFamilyCreate ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isFamilyCreate ? 'text-blue-600' : 'text-green-700'}`}>
                  {isFamilyCreate ? 'Family Head Information' : 'Deceased Person Information'}
                </p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? 'পরিবার প্রধানের নাম (বাংলা) *' : 'মৃত ব্যক্তির নাম (বাংলা) *'}
                  </label>
                  <input required type="text" name="deceased_name_bn" autoComplete="off"
                    value={form.deceased_name_bn}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? 'Head of Family Name (English) *' : 'Deceased Name (English) *'}
                  </label>
                  <input required type="text" name="deceased_name_en" autoComplete="off"
                    value={form.deceased_name_en}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? 'পিতার নাম (বাংলা) *' : 'মৃত ব্যক্তির পিতার নাম (বাংলা) *'}
                  </label>
                  <input required type="text" name="deceased_father_name_bn" autoComplete="off"
                    value={form.deceased_father_name_bn}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_father_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? "Father's Name (English) *" : "Deceased Father's Name (English) *"}
                  </label>
                  <input required type="text" name="deceased_father_name_en" autoComplete="off"
                    value={form.deceased_father_name_en}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_father_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? 'মাতার নাম (বাংলা)' : 'মৃত ব্যক্তির মাতার নাম (বাংলা)'}
                  </label>
                  <input type="text" name="deceased_mother_name_bn" autoComplete="off"
                    value={form.deceased_mother_name_bn}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_mother_name_bn: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isFamilyCreate ? "Mother's Name (English)" : "Deceased Mother's Name (English)"}
                  </label>
                  <input type="text" name="deceased_mother_name_en" autoComplete="off"
                    value={form.deceased_mother_name_en}
                    onChange={(e) => setForm((f) => ({ ...f, deceased_mother_name_en: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                {!isFamilyCreate && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Death *</label>
                    <input required type="date" name="date_of_death" autoComplete="off"
                      value={form.date_of_death}
                      onChange={(e) => setForm((f) => ({ ...f, date_of_death: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                )}
                <div className={`relative ${!isFamilyCreate ? '' : 'col-span-2'}`}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Applicant (Citizen) *</label>
                  <div onClick={(e) => e.stopPropagation()}>
                    <input required type="text" name="applicant_search" autoComplete="off"
                      value={citizenSearch}
                      onChange={(e) => handleCitizenSearch(e.target.value)}
                      onFocus={() => setShowCitizenDropdown(true)}
                      placeholder="Search by name or NID..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {showCitizenDropdown && citizenResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {citizenResults.map((c) => (
                          <button key={c._id} type="button" onClick={() => selectCitizen(c)}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0">
                            <div className="font-medium text-gray-900">{c.name_bn}</div>
                            <div className="text-xs text-gray-400">{c.name_en} · NID: {c.nid}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedCitizen && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium">✓ {selectedCitizen.name_bn} selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Members */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {isFamilyCreate ? 'Family Members' : 'Heirs'}
                </p>
                <button type="button" onClick={() => addMember(currentMemberKey)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {isFamilyCreate ? 'Add Member' : 'Add Heir'}
                </button>
              </div>
              <div className="divide-y divide-gray-50 p-2">
                {currentMembers.map((heir, i) => (
                  <div key={i} className="rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-xs font-bold text-green-700 flex items-center justify-center">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-500">{isFamilyCreate ? `Member ${i + 1}` : `Heir ${i + 1}`}</span>
                      </span>
                      {currentMembers.length > 1 && (
                        <button type="button" onClick={() => removeMember(currentMemberKey, i)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="নাম (বাংলা)" value={heir.name_bn}
                        onChange={(e) => updateMember(currentMemberKey, i, 'name_bn', e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <input type="text" placeholder="Name (English)" value={heir.name_en}
                        onChange={(e) => updateMember(currentMemberKey, i, 'name_en', e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <select value={heir.relation}
                        onChange={(e) => updateMember(currentMemberKey, i, 'relation', e.target.value)}
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
                      <input type="date" value={heir.birth_date}
                        onChange={(e) => updateMember(currentMemberKey, i, 'birth_date', e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <input type="text" placeholder="NID Number" value={heir.nid_no}
                        onChange={(e) => updateMember(currentMemberKey, i, 'nid_no', e.target.value)}
                        className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button"
                onClick={() => { setShowCreate(false) }}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className={`px-5 py-2 text-sm rounded-xl font-semibold text-white transition-colors ${isFamilyCreate ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-700 hover:bg-green-800'}`}>
                Preview & Continue
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
