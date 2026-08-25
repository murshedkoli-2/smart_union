'use client'

/**
 * New warish / family-certificate application, in two steps: fill in, then
 * review before submitting as a draft or for approval.
 */
import { useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { MEMBER_RELATIONS, type Heir } from '@/types/warish.types'
import type { useWarishCreateForm } from './useWarishCreateForm'

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
const MEMBER_INPUT =
  'rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

type CreateForm = ReturnType<typeof useWarishCreateForm>

function LabelledInput({
  label,
  value,
  onChange,
  name,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  name: string
  required?: boolean
  type?: 'text' | 'date'
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        required={required}
        type={type}
        name={name}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  )
}

/** Search-as-you-type applicant picker over approved citizens. */
function ApplicantPicker({ create, wide }: { create: CreateForm; wide: boolean }) {
  return (
    <div className={`relative ${wide ? 'col-span-2' : ''}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Applicant (Citizen) *</label>
      {/* Stops the document-level click handler from closing the dropdown as
          the user reaches for it. */}
      <div onClick={(e) => e.stopPropagation()}>
        <input
          required
          type="text"
          name="applicant_search"
          autoComplete="off"
          value={create.citizenSearch}
          onChange={(e) => create.searchCitizens(e.target.value)}
          onFocus={() => create.setShowCitizenDropdown(true)}
          placeholder="Search by name or NID..."
          className={INPUT}
        />
        {create.showCitizenDropdown && create.citizenResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {create.citizenResults.map((citizen) => (
              <button
                key={citizen._id}
                type="button"
                onClick={() => create.selectCitizen(citizen)}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{citizen.name_bn}</div>
                <div className="text-xs text-gray-400">
                  {citizen.name_en} · NID: {citizen.nid}
                </div>
              </button>
            ))}
          </div>
        )}
        {create.selectedCitizen && (
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            ✓ {create.selectedCitizen.name_bn} selected
          </p>
        )}
      </div>
    </div>
  )
}

function MemberEditor({
  member,
  index,
  isFamily,
  removable,
  onChange,
  onRemove,
}: {
  member: Heir
  index: number
  isFamily: boolean
  removable: boolean
  onChange: (field: keyof Heir, value: string) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg p-3 hover:bg-gray-50">
      <div className="flex items-center justify-between mb-2.5">
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-100 text-xs font-bold text-green-700 flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-medium text-gray-500">
            {isFamily ? `Member ${index + 1}` : `Heir ${index + 1}`}
          </span>
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 font-medium"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="নাম (বাংলা)"
          value={member.name_bn}
          onChange={(e) => onChange('name_bn', e.target.value)}
          className={MEMBER_INPUT}
        />
        <input
          type="text"
          placeholder="Name (English)"
          value={member.name_en}
          onChange={(e) => onChange('name_en', e.target.value)}
          className={MEMBER_INPUT}
        />
        <select
          value={member.relation}
          onChange={(e) => onChange('relation', e.target.value)}
          className={`${MEMBER_INPUT} bg-white`}
        >
          <option value="">Relation</option>
          {MEMBER_RELATIONS.map((relation) => (
            <option key={relation.value} value={relation.value}>{relation.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={member.birth_date}
          onChange={(e) => onChange('birth_date', e.target.value)}
          className={MEMBER_INPUT}
        />
        <input
          type="text"
          placeholder="NID Number"
          value={member.nid_no}
          onChange={(e) => onChange('nid_no', e.target.value)}
          className={`col-span-2 ${MEMBER_INPUT}`}
        />
      </div>
    </div>
  )
}

function FormStep({ create }: { create: CreateForm }) {
  const { form, setField, isFamily } = create

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        create.setIsPreview(true)
      }}
      className="space-y-5"
      autoComplete="on"
    >
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className={`px-4 py-2.5 border-b border-gray-100 ${isFamily ? 'bg-blue-50' : 'bg-green-50'}`}>
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              isFamily ? 'text-blue-600' : 'text-green-700'
            }`}
          >
            {isFamily ? 'Family Head Information' : 'Deceased Person Information'}
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <LabelledInput
            label={isFamily ? 'পরিবার প্রধানের নাম (বাংলা) *' : 'মৃত ব্যক্তির নাম (বাংলা) *'}
            name="deceased_name_bn"
            required
            value={form.deceased_name_bn}
            onChange={(v) => setField('deceased_name_bn', v)}
          />
          <LabelledInput
            label={isFamily ? 'Head of Family Name (English) *' : 'Deceased Name (English) *'}
            name="deceased_name_en"
            required
            value={form.deceased_name_en}
            onChange={(v) => setField('deceased_name_en', v)}
          />
          <LabelledInput
            label={isFamily ? 'পিতার নাম (বাংলা) *' : 'মৃত ব্যক্তির পিতার নাম (বাংলা) *'}
            name="deceased_father_name_bn"
            required
            value={form.deceased_father_name_bn}
            onChange={(v) => setField('deceased_father_name_bn', v)}
          />
          <LabelledInput
            label={isFamily ? "Father's Name (English) *" : "Deceased Father's Name (English) *"}
            name="deceased_father_name_en"
            required
            value={form.deceased_father_name_en}
            onChange={(v) => setField('deceased_father_name_en', v)}
          />
          <LabelledInput
            label={isFamily ? 'মাতার নাম (বাংলা)' : 'মৃত ব্যক্তির মাতার নাম (বাংলা)'}
            name="deceased_mother_name_bn"
            value={form.deceased_mother_name_bn}
            onChange={(v) => setField('deceased_mother_name_bn', v)}
          />
          <LabelledInput
            label={isFamily ? "Mother's Name (English)" : "Deceased Mother's Name (English)"}
            name="deceased_mother_name_en"
            value={form.deceased_mother_name_en}
            onChange={(v) => setField('deceased_mother_name_en', v)}
          />
          {!isFamily && (
            <LabelledInput
              label="Date of Death *"
              name="date_of_death"
              type="date"
              required
              value={form.date_of_death}
              onChange={(v) => setField('date_of_death', v)}
            />
          )}
          <ApplicantPicker create={create} wide={isFamily} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isFamily ? 'Family Members' : 'Heirs'}
          </p>
          <button
            type="button"
            onClick={create.addMember}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {isFamily ? 'Add Member' : 'Add Heir'}
          </button>
        </div>
        <div className="divide-y divide-gray-50 p-2">
          {create.members.map((member, index) => (
            <MemberEditor
              key={index}
              member={member}
              index={index}
              isFamily={isFamily}
              removable={create.members.length > 1}
              onChange={(field, value) => create.updateMember(index, field, value)}
              onRemove={() => create.removeMember(index)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={create.close}
          className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-5 py-2 text-sm rounded-xl font-semibold text-white transition-colors ${
            isFamily ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-700 hover:bg-green-800'
          }`}
        >
          Preview & Continue
        </button>
      </div>
    </form>
  )
}

function PreviewCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  )
}

function PreviewStep({ create, lang }: { create: CreateForm; lang: string }) {
  const { form, isFamily, members, selectedCitizen, saving } = create

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        Review the details before submitting.
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isFamily ? 'Family Head Information' : 'Deceased Person Information'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-gray-100">
          <PreviewCell
            label={isFamily ? 'Head Name (BN)' : 'Deceased Name (BN)'}
            value={form.deceased_name_bn}
          />
          <PreviewCell
            label={isFamily ? 'Head Name (EN)' : 'Deceased Name (EN)'}
            value={form.deceased_name_en}
          />
          <PreviewCell label="Father's Name (BN)" value={form.deceased_father_name_bn} />
          <PreviewCell label="Father's Name (EN)" value={form.deceased_father_name_en} />
          {form.deceased_mother_name_bn && (
            <>
              <PreviewCell label="Mother's Name (BN)" value={form.deceased_mother_name_bn} />
              <PreviewCell label="Mother's Name (EN)" value={form.deceased_mother_name_en} />
            </>
          )}
          {!isFamily && form.date_of_death && (
            <PreviewCell
              label="Date of Death"
              value={new Date(form.date_of_death).toLocaleDateString('en-GB')}
            />
          )}
          <PreviewCell
            label={lang === 'bn' ? 'আবেদনকারী' : 'Applicant'}
            value={selectedCitizen?.name_bn}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isFamily ? 'Family Members' : 'Heirs'}
          </p>
          <span className="text-xs text-gray-400">
            {members.length} person{members.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {members.map((member, index) => (
            <div key={index} className="px-4 py-3 flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">Name</span>
                  <p className="font-medium text-gray-900">{member.name_bn} / {member.name_en}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Relation</span>
                  <p className="text-gray-700">{member.relation || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">NID</span>
                  <p className="text-gray-700">{member.nid_no || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => create.setIsPreview(false)}
          className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Back to Edit
        </button>
        <button
          type="button"
          onClick={() => create.submit('draft')}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-xl border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => create.submit('pending')}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}

export default function CreateApplicationModal({
  create,
  lang,
}: {
  create: CreateForm
  lang: string
}) {
  // Any click outside the picker closes its dropdown; the picker itself stops
  // propagation so clicking a result still selects it.
  const { showCitizenDropdown, setShowCitizenDropdown } = create

  useEffect(() => {
    if (!showCitizenDropdown) return
    const close = () => setShowCitizenDropdown(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showCitizenDropdown, setShowCitizenDropdown])

  return (
    <Modal
      open={create.open}
      onClose={create.close}
      title={create.isFamily ? 'New Family Certificate Application' : 'New Warish Application'}
      size="lg"
    >
      {create.isPreview ? <PreviewStep create={create} lang={lang} /> : <FormStep create={create} />}
    </Modal>
  )
}
