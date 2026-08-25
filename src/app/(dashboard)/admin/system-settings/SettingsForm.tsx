'use client'

/** Edit form for the union's settings, including the member list. */
import { useRef, useState } from 'react'
import { LogoBox } from './SettingsView'
import { emptyMember, type UnionMember, type UnionSettings } from './settings-model'

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  textarea?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={INPUT}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

/**
 * Logo picker: a file becomes a data: URL, or a URL can be pasted directly.
 *
 * The image is stored inline in the settings document rather than uploaded, so
 * the file input's only job is to produce that string.
 */
function LogoPicker({
  value,
  onChange,
  fileInputRef,
}: {
  value: string
  onChange: (value: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <LogoBox src={value} label="Union Logo" />
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Logo Upload</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={readFile}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100"
          />
        </div>
        <Field
          label="Or Logo URL / Data URL"
          value={value}
          onChange={onChange}
          placeholder="https://... or pasted data:image/..."
        />
      </div>
    </div>
  )
}

function MemberEditor({
  member,
  onChange,
  onRemove,
}: {
  member: UnionMember
  onChange: (key: keyof UnionMember, value: string) => void
  onRemove: () => void
}) {
  const fields: Array<[keyof UnionMember, string]> = [
    ['name_bn', 'Member name (Bangla)'],
    ['name_en', 'Member name (English)'],
    ['designation_bn', 'Designation (Bangla)'],
    ['designation_en', 'Designation (English)'],
    ['mobile', 'Mobile'],
  ]

  return (
    <div className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
      {fields.map(([key, placeholder]) => (
        <input
          key={key}
          type="text"
          value={member[key] ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      ))}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  )
}

export default function SettingsForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: UnionSettings
  saving: boolean
  onCancel: () => void
  onSubmit: (settings: UnionSettings) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState<UnionSettings>(initial)

  const setField = <K extends keyof UnionSettings>(key: K, value: UnionSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const setMember = (index: number, key: keyof UnionMember, value: string) =>
    setForm((current) => {
      const members = [...current.members]
      members[index] = { ...members[index], [key]: value }
      return { ...current, members }
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(form)
      }}
      className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Union Name (Bangla)"
          required
          value={form.union_name_bn}
          onChange={(v) => setField('union_name_bn', v)}
        />
        <Field
          label="Union Name (English)"
          required
          value={form.union_name_en}
          onChange={(v) => setField('union_name_en', v)}
        />
        <Field
          label="Chairman Name (Bangla)"
          value={form.chairman_name_bn}
          onChange={(v) => setField('chairman_name_bn', v)}
        />
        <Field
          label="Chairman Name (English)"
          value={form.chairman_name_en}
          onChange={(v) => setField('chairman_name_en', v)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Union Address (Bangla)"
          textarea
          value={form.address_bn}
          onChange={(v) => setField('address_bn', v)}
        />
        <Field
          label="Union Address (English)"
          textarea
          value={form.address_en}
          onChange={(v) => setField('address_en', v)}
        />
      </div>

      <LogoPicker
        value={form.union_logo ?? ''}
        onChange={(v) => setField('union_logo', v)}
        fileInputRef={fileInputRef}
      />

      <div className="border-t border-gray-100 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Union Members</h2>
          <button
            type="button"
            onClick={() => setField('members', [...form.members, emptyMember()])}
            className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            + Add Member
          </button>
        </div>

        {form.members.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            No union members added yet.
          </div>
        )}

        <div className="space-y-3">
          {form.members.map((member, index) => (
            <MemberEditor
              key={`${index}-${member.name_en}`}
              member={member}
              onChange={(key, value) => setMember(index, key, value)}
              onRemove={() =>
                setField('members', form.members.filter((_, current) => current !== index))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Updating...' : 'Update Settings'}
        </button>
      </div>
    </form>
  )
}
