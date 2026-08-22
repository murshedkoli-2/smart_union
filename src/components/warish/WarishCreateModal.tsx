'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { apiCall } from '@/lib/utils/api-client'

/**
 * Warish / family-certificate creation flow for a citizen.
 *
 * Extracted from the citizen detail page, which had grown to 1141 lines by
 * holding four tabs and two modals in one component. This flow owns its own
 * state and handlers that nothing else on that page reads, so it moves out
 * whole rather than being wired through props.
 */

export interface Heir {
  name_bn: string
  name_en: string
  relation: string
  birth_date: string
  nid_no: string
}

export type WarishApplicationType = 'warish' | 'family_certificate'

const emptyHeir = (): Heir => ({ name_bn: '', name_en: '', relation: '', birth_date: '', nid_no: '' })

const defaultWarishForm = {
  application_type: 'warish' as WarishApplicationType,
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

export default function WarishCreateModal({
  citizenId,
  citizen,
  applicationType,
  onClose,
  onCreated,
}: {
  citizenId: string
  /** Applicant shown on the form and the preview. */
  citizen: { name_bn: string; name_en: string }
  /** Non-null opens the modal for that application type. */
  applicationType: WarishApplicationType | null
  onClose: () => void
  onCreated: () => void
}) {
  const [warishIsPreview, setWarishIsPreview] = useState(false)
  const [warishSaving, setWarishSaving] = useState(false)
  const [warishErrorMsg, setWarishErrorMsg] = useState('')
  const [warishForm, setWarishForm] = useState({
    ...defaultWarishForm,
    heirs: [emptyHeir()],
    family_members: [emptyHeir()],
  })

  // Reset when the flow opens, including reopening for the other type.
  // Done during render rather than in an effect so the first paint already
  // shows the right form — the same cascading-render issue fixed elsewhere.
  const [openedAs, setOpenedAs] = useState<WarishApplicationType | null>(null)
  if (applicationType !== null && applicationType !== openedAs) {
    setOpenedAs(applicationType)
    setWarishForm({
      ...defaultWarishForm,
      application_type: applicationType,
      heirs: [emptyHeir()],
      family_members: [emptyHeir()],
    })
    setWarishIsPreview(false)
    setWarishErrorMsg('')
  }
  if (applicationType === null && openedAs !== null) setOpenedAs(null)

  const showWarishCreate = applicationType !== null
  const setShowWarishCreate = (next: boolean) => {
    if (!next) onClose()
  }

  const updateWarishMember = (
    collection: 'heirs' | 'family_members',
    i: number,
    field: keyof Heir,
    value: string,
  ) => {
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
    const memberKey =
      warishForm.application_type === 'family_certificate' ? 'family_members' : 'heirs'
    const res = await apiCall('/api/warish', {
      method: 'POST',
      body: JSON.stringify({
        ...warishForm,
        status,
        applicant_citizen_id: citizenId,
        [memberKey]: warishForm[memberKey],
      }),
    })
    setWarishSaving(false)
    if (res.ok) {
      onClose()
      setWarishIsPreview(false)
      toast.success(
        `${warishForm.application_type === 'family_certificate' ? 'Family certificate' : 'Warish'} application created.`,
      )
      onCreated()
    } else {
      const d = await res.json()
      setWarishErrorMsg(d.message ?? 'Failed to create application.')
      setWarishIsPreview(false)
    }
  }

  return (
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
  )
}
