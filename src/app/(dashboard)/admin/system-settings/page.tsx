'use client'

/**
 * Union settings — the names, address, logo and member list that every
 * certificate and receipt is printed with.
 *
 * View and edit are separate components; the form keeps its own draft so an
 * abandoned edit never touches what is displayed.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import RequirePermission from '@/components/auth/RequirePermission'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { PERMISSIONS } from '@/constants/permissions'
import SettingsForm from './SettingsForm'
import SettingsView from './SettingsView'
import { normalizeSettings, type UnionSettings } from './settings-model'

function SystemSettingsPageView() {
  const { data, loading, error, refetch } = useApi<UnionSettings>('/api/system-settings')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const settings = normalizeSettings(data)

  const save = async (form: UnionSettings) => {
    setSaving(true)
    const res = await apiCall('/api/system-settings', {
      method: 'PATCH',
      body: JSON.stringify(form),
    })
    setSaving(false)

    if (res.ok) {
      toast.success('System settings updated successfully.')
      setIsEditing(false)
      refetch()
      return
    }

    const body = await res.json().catch(() => ({}))
    toast.error(body.message ?? 'Failed to update system settings.')
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <PageHeader
        title="System Settings"
        action={
          !loading && !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
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
      ) : isEditing ? (
        <SettingsForm
          // Remounting on each edit seeds the draft from what is stored now.
          key={JSON.stringify(settings)}
          initial={settings}
          saving={saving}
          onCancel={() => setIsEditing(false)}
          onSubmit={save}
        />
      ) : (
        <SettingsView settings={settings} />
      )}
    </div>
  )
}

export default function SystemSettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <SystemSettingsPageView />
    </RequirePermission>
  )
}
