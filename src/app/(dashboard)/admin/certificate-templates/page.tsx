'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

interface CertificateTemplate {
  _id: string
  name: string
  language: 'bn' | 'en'
  body_template: string
  fee: number
  created_by?: { name: string }
  createdAt: string
}

type Language = 'bn' | 'en'

interface FormState {
  name: string
  language: Language
  body_template: string
  fee: number
}

const BANGLA_CITIZENSHIP_TEXT =
  'তিনি উক্ত ইউনিয়ন এর একজন স্থায়ী বাসিন্দা, আমি তাকে চিনি ও জানি, আমার জানামতে তিনি কোন অবৈধ কাজের সাথে জড়িত নয়'

const defaultForm: FormState = {
  name: '',
  language: 'bn',
  body_template: '',
  fee: 0,
}

function isCitizenshipTemplate(name: string): boolean {
  const normalized = name.trim().toLowerCase()
  return /নাগরিকত্ব|citizenship/.test(normalized)
}

export default function CertificateTemplatesPage() {
  const router = useRouter()
  const currentUser = useUser()
  const [page, setPage] = useState(1)
  const [langFilter, setLangFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null)
  const [form, setForm] = useState<FormState>({ ...defaultForm })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser !== null && !hasPermission(currentUser, PERMISSIONS.TEMPLATE_MANAGE)) {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  const buildUrl = () => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '50')
    if (langFilter) params.set('language', langFilter)
    return `/api/certificate-templates?${params.toString()}`
  }

  const { data, loading, error, refetch, pagination } = useApi<CertificateTemplate[]>(buildUrl(), [page, langFilter])

  const applySuggestedText = (name: string, language: Language, currentText: string) => {
    if (language === 'bn' && isCitizenshipTemplate(name)) {
      if (!currentText.trim() || currentText.trim() === BANGLA_CITIZENSHIP_TEXT) {
        return BANGLA_CITIZENSHIP_TEXT
      }
    }

    return currentText
  }

  const handleOpenCreate = () => {
    setForm({ ...defaultForm })
    setEditingTemplate(null)
    setShowCreate(true)
  }

  const handleOpenEdit = (template: CertificateTemplate) => {
    const bodyText =
      template.language === 'bn' && isCitizenshipTemplate(template.name)
        ? BANGLA_CITIZENSHIP_TEXT
        : template.body_template

    setForm({
      name: template.name,
      language: template.language,
      body_template: bodyText,
      fee: template.fee ?? 0,
    })
    setEditingTemplate(template)
    setShowCreate(true)
  }

  const handleCloseModal = () => {
    setShowCreate(false)
    setEditingTemplate(null)
    setForm({ ...defaultForm })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const url = editingTemplate
      ? `/api/certificate-templates/${editingTemplate._id}`
      : '/api/certificate-templates'
    const method = editingTemplate ? 'PATCH' : 'POST'

    const response = await apiCall(url, {
      method,
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (response.ok) {
      toast.success(editingTemplate ? 'Template updated successfully.' : 'Template created successfully.')
      handleCloseModal()
      refetch()
    } else {
      const payload = await response.json().catch(() => ({}))
      toast.error(payload.message ?? 'Failed to save template.')
    }
  }

  const columns: Column[] = [
    { key: 'name', label: 'Certificate Name' },
    {
      key: 'language',
      label: 'Language',
      render: (value) => (value === 'bn' ? 'Bangla' : 'English'),
    },
    {
      key: 'fee',
      label: 'Fee (৳)',
      render: (value) => (
        <span className={Number(value) > 0 ? 'font-medium text-green-700' : 'text-gray-400'}>
          {Number(value) > 0 ? `৳ ${Number(value).toLocaleString()}` : 'Free'}
        </span>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (_value, row) => (
        <button
          onClick={() => handleOpenEdit(row as CertificateTemplate)}
          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          Edit
        </button>
      ),
    },
  ]

  const templates = data ?? []
  const total = pagination?.total ?? 0

  if (!currentUser || !hasPermission(currentUser, PERMISSIONS.TEMPLATE_MANAGE)) {
    return null
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Certificate Templates"
        action={
          <button
            onClick={handleOpenCreate}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
          >
            + New Template
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={langFilter}
          onChange={(e) => {
            setLangFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Languages</option>
          <option value="bn">Bangla</option>
          <option value="en">English</option>
        </select>
      </div>

      <DataTable columns={columns} data={templates} loading={loading} emptyMessage="No certificate templates found." />
      <Pagination total={total} page={page} limit={50} onChange={setPage} />

      <Modal
        open={showCreate}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Edit Certificate Template' : 'Create Certificate Template'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Certificate Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => {
                const nextName = e.target.value
                setForm((current) => ({
                  ...current,
                  name: nextName,
                  body_template: applySuggestedText(nextName, current.language, current.body_template),
                }))
              }}
              placeholder="e.g., নাগরিকত্ব সনদ / Citizenship Certificate"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Language *</label>
            <select
              required
              value={form.language}
              onChange={(e) => {
                const nextLanguage = e.target.value as Language
                setForm((current) => ({
                  ...current,
                  language: nextLanguage,
                  body_template: applySuggestedText(current.name, nextLanguage, current.body_template),
                }))
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="bn">Bangla</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Certificate Fee (৳)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.fee}
              onChange={(e) => setForm((current) => ({ ...current, fee: Math.max(0, Number(e.target.value) || 0) }))}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-400">Amount to be collected when approving this certificate. Set 0 for free.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Certificate Plain Text *</label>
            <textarea
              required
              value={form.body_template}
              onChange={(e) => setForm((current) => ({ ...current, body_template: e.target.value }))}
              rows={8}
              placeholder="Write the certificate text only. Nothing else."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
