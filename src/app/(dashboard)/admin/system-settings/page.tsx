'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

interface UnionMember {
  name_bn: string
  name_en: string
  designation_bn: string
  designation_en: string
  mobile?: string
}

interface SystemSettings {
  union_name_bn: string
  union_name_en: string
  chairman_name_bn: string
  chairman_name_en: string
  union_logo?: string | null
  address_bn: string
  address_en: string
  members: UnionMember[]
}

const defaultSettings: SystemSettings = {
  union_name_bn: '',
  union_name_en: '',
  chairman_name_bn: '',
  chairman_name_en: '',
  union_logo: '',
  address_bn: '',
  address_en: '',
  members: [],
}

function normalizeSettings(value: unknown): SystemSettings {
  const item = (value ?? {}) as Record<string, unknown>
  const members = Array.isArray(item.members) ? item.members : []

  return {
    union_name_bn: String(item.union_name_bn ?? ''),
    union_name_en: String(item.union_name_en ?? ''),
    chairman_name_bn: String(item.chairman_name_bn ?? ''),
    chairman_name_en: String(item.chairman_name_en ?? ''),
    union_logo: String(item.union_logo ?? ''),
    address_bn: String(item.address_bn ?? ''),
    address_en: String(item.address_en ?? ''),
    members: members.map((member) => {
      const memberItem = member as Record<string, unknown>
      return {
        name_bn: String(memberItem.name_bn ?? ''),
        name_en: String(memberItem.name_en ?? ''),
        designation_bn: String(memberItem.designation_bn ?? ''),
        designation_en: String(memberItem.designation_en ?? ''),
        mobile: String(memberItem.mobile ?? ''),
      }
    }),
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || 'Not set'}</p>
    </div>
  )
}

export default function SystemSettingsPage() {
  const router = useRouter()
  const currentUser = useUser()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { data, loading, error, refetch } = useApi<SystemSettings>('/api/system-settings')
  const [form, setForm] = useState<SystemSettings>(defaultSettings)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Guard: only those with SETTINGS_MANAGE can access this page
  useEffect(() => {
    if (currentUser !== null && !hasPermission(currentUser, PERMISSIONS.SETTINGS_MANAGE)) {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  if (!currentUser || !hasPermission(currentUser, PERMISSIONS.SETTINGS_MANAGE)) {
    return null
  }

  const updateField = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateMember = (index: number, key: keyof UnionMember, value: string) => {
    const members = [...form.members]
    members[index] = { ...members[index], [key]: value }
    updateField('members', members)
  }

  const addMember = () => {
    updateField('members', [
      ...form.members,
      { name_bn: '', name_en: '', designation_bn: '', designation_en: '', mobile: '' },
    ])
  }

  const removeMember = (index: number) => {
    updateField('members', form.members.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleEdit = () => {
    setForm(normalizeSettings(data ?? defaultSettings))
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm(normalizeSettings(data ?? defaultSettings))
    setIsEditing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      updateField('union_logo', String(reader.result ?? ''))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const response = await apiCall('/api/system-settings', {
      method: 'PATCH',
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (response.ok) {
      toast.success('System settings updated successfully.')
      setIsEditing(false)
      refetch()
    } else {
      const payload = await response.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to update system settings.')
    }
  }

  const currentData = normalizeSettings(data)

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <PageHeader
        title="System Settings"
        action={
          !loading && !isEditing ? (
            <button
              onClick={handleEdit}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Edit Settings
            </button>
          ) : null
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      ) : !isEditing ? (
        <div className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Union Logo</p>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {currentData.union_logo ? (
                  <Image
                    src={currentData.union_logo}
                    alt="Union logo"
                    width={180}
                    height={180}
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs text-gray-400">No logo uploaded</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Union Name (Bangla)" value={currentData.union_name_bn} />
              <DetailRow label="Union Name (English)" value={currentData.union_name_en} />
              <DetailRow label="Chairman Name (Bangla)" value={currentData.chairman_name_bn} />
              <DetailRow label="Chairman Name (English)" value={currentData.chairman_name_en} />
              <DetailRow label="Address (Bangla)" value={currentData.address_bn} />
              <DetailRow label="Address (English)" value={currentData.address_en} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Union Members</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {currentData.members.length} member{currentData.members.length === 1 ? '' : 's'}
              </span>
            </div>

            {currentData.members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No union members added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {currentData.members.map((member, index) => (
                  <div key={`${index}-${member.name_en}`} className="grid gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
                    <DetailRow label="Name (Bangla)" value={member.name_bn} />
                    <DetailRow label="Name (English)" value={member.name_en} />
                    <DetailRow label="Designation (Bangla)" value={member.designation_bn} />
                    <DetailRow label="Designation (English)" value={member.designation_en} />
                    <DetailRow label="Mobile" value={member.mobile || ''} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Union Name (Bangla)</label>
              <input
                type="text"
                value={form.union_name_bn}
                onChange={(event) => updateField('union_name_bn', event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Union Name (English)</label>
              <input
                type="text"
                value={form.union_name_en}
                onChange={(event) => updateField('union_name_en', event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Chairman Name (Bangla)</label>
              <input
                type="text"
                value={form.chairman_name_bn}
                onChange={(event) => updateField('chairman_name_bn', event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Chairman Name (English)</label>
              <input
                type="text"
                value={form.chairman_name_en}
                onChange={(event) => updateField('chairman_name_en', event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Union Address (Bangla)</label>
              <textarea
                value={form.address_bn}
                onChange={(event) => updateField('address_bn', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Union Address (English)</label>
              <textarea
                value={form.address_en}
                onChange={(event) => updateField('address_en', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Union Logo</label>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {form.union_logo ? (
                  <Image
                    src={form.union_logo}
                    alt="Union logo"
                    width={180}
                    height={180}
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs text-gray-400">No logo uploaded</span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Logo Upload</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-green-700 hover:file:bg-green-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Or Logo URL / Data URL</label>
                <input
                  type="text"
                  value={form.union_logo ?? ''}
                  onChange={(event) => updateField('union_logo', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://... or pasted data:image/..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Union Members</h2>
              <button
                type="button"
                onClick={addMember}
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
                <div key={`${index}-${member.name_en}`} className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={member.name_bn}
                    onChange={(event) => updateMember(index, 'name_bn', event.target.value)}
                    placeholder="Member name (Bangla)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={member.name_en}
                    onChange={(event) => updateMember(index, 'name_en', event.target.value)}
                    placeholder="Member name (English)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={member.designation_bn}
                    onChange={(event) => updateMember(index, 'designation_bn', event.target.value)}
                    placeholder="Designation (Bangla)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={member.designation_en}
                    onChange={(event) => updateMember(index, 'designation_en', event.target.value)}
                    placeholder="Designation (English)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={member.mobile ?? ''}
                    onChange={(event) => updateMember(index, 'mobile', event.target.value)}
                    placeholder="Mobile"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={handleCancel}
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
      )}
    </div>
  )
}


