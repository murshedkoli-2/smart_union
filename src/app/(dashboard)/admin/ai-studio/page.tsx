'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import RequirePermission from '@/components/auth/RequirePermission'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { PERMISSIONS } from '@/constants/permissions'

interface SystemSettingsResponse {
  ai_studio?: { gemini_api_key: string; enabled: boolean }
}

function AiStudioForm({
  data,
  refetch,
}: {
  data: SystemSettingsResponse | null
  refetch: () => void
}) {
  const [enabled, setEnabled] = useState(data?.ai_studio?.enabled ?? false)
  const [apiKey, setApiKey] = useState(data?.ai_studio?.gemini_api_key ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await apiCall('/api/system-settings', {
      method: 'PATCH',
      body: JSON.stringify({ ai_studio: { gemini_api_key: apiKey, enabled } }),
    })

    setSaving(false)
    if (res.ok) {
      toast.success('AI Studio settings updated.')
      refetch()
      return
    }
    const body = await res.json().catch(() => ({}))
    toast.error(body.message ?? 'Failed to update AI Studio settings.')
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-600">
        Configure the Google AI Studio (Gemini) API key used to auto-draft certificate templates. Get a key at{' '}
        <span className="font-mono text-xs">aistudio.google.com/apikey</span>.
      </p>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ai_studio_enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <label htmlFor="ai_studio_enabled" className="text-sm text-gray-700">
          Enable AI-assisted template generation
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Gemini API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIza..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Leave unchanged (shown masked) to keep the current key. Clear the field and save to remove it.
        </p>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function AiStudioPageView() {
  const { data, loading, error, refetch } = useApi<SystemSettingsResponse>('/api/system-settings')

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <PageHeader title="AI Studio" />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <AiStudioForm key={data?.ai_studio?.gemini_api_key ?? 'empty'} data={data} refetch={refetch} />
      )}
    </div>
  )
}

export default function AiStudioPage() {
  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <AiStudioPageView />
    </RequirePermission>
  )
}
