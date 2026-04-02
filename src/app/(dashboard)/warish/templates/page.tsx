'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import Link from 'next/link'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

interface WarishTemplate {
  _id: string
  name: string
  language: 'bn' | 'en'
  certificate_category: string
  body_template: string
  is_active: boolean
  createdAt: string
}

interface TemplateResponse {
  data: WarishTemplate[]
  total: number
}

const emptyForm = { name: '', language: 'bn' as 'bn' | 'en', body_template: '' }

// ── Placeholder hints shown in the body_template textarea ─────────────────────
const BN_PLACEHOLDERS = [
  '{{deceased_name_bn}}', '{{deceased_name_en}}',
  '{{deceased_father_name_bn}}', '{{deceased_mother_name_bn}}',
  '{{date_of_death}}', '{{issue_date}}', '{{union_name}}',
  '{{chairman_name}}', '{{applicant_name}}',
]
const EN_PLACEHOLDERS = [
  '{{deceased_name_en}}', '{{deceased_name_bn}}',
  '{{deceased_father_name_en}}', '{{deceased_mother_name_en}}',
  '{{date_of_death}}', '{{issue_date}}', '{{union_name}}',
  '{{chairman_name}}', '{{applicant_name}}',
]

export default function WarishTemplatesPage() {
  const [activeLang, setActiveLang] = useState<'bn' | 'en'>('bn')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WarishTemplate | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<WarishTemplate | null>(null)

  const { data: bnData, loading: bnLoading, refetch: bnRefetch } = useApi<TemplateResponse>(
    '/api/certificate-templates?certificate_category=WAR&language=bn&limit=50',
    ['bn']
  )
  const { data: enData, loading: enLoading, refetch: enRefetch } = useApi<TemplateResponse>(
    '/api/certificate-templates?certificate_category=WAR&language=en&limit=50',
    ['en']
  )

  const user = useUser();

  if (!hasPermission(user, PERMISSIONS.TEMPLATE_MANAGE)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-red-800">Access Denied</h2>
          <p className="mt-1 text-sm text-red-600">You do not have permission to manage templates.</p>
        </div>
      </div>
    )
  }

  const templates = activeLang === 'bn' ? (bnData?.data ?? []) : (enData?.data ?? [])
  const loading = activeLang === 'bn' ? bnLoading : enLoading
  const refetch = activeLang === 'bn' ? bnRefetch : enRefetch


  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', language: activeLang, body_template: '' })
    setShowModal(true)
  }

  const openEdit = (t: WarishTemplate) => {
    setEditing(t)
    setForm({ name: t.name, language: t.language, body_template: t.body_template })
    setShowModal(true)
  }

  const insertPlaceholder = (ph: string) => {
    setForm(f => ({ ...f, body_template: f.body_template + ph }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      language: form.language,
      body_template: form.body_template,
      certificate_category: 'WAR',
      template_type: 'warish',
      fee: 0,
      is_active: true,
    }

    let res: Response
    if (editing) {
      res = await apiCall(`/api/certificate-templates/${editing._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    } else {
      res = await apiCall('/api/certificate-templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    setSaving(false)
    if (res.ok) {
      toast.success(editing ? 'Template updated successfully' : 'Template created successfully')
      setShowModal(false)
      bnRefetch(); enRefetch()
    } else {
      const d = await res.json()
      toast.error(d.message || 'Failed to save template')
    }
  }

  const handleToggleActive = async (t: WarishTemplate) => {
    const res = await apiCall(`/api/certificate-templates/${t._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    if (res.ok) { toast.success(`Template ${t.is_active ? 'deactivated' : 'activated'}`); bnRefetch(); enRefetch() }
    else toast.error('Failed to update template status')
  }

  const placeholders = form.language === 'bn' ? BN_PLACEHOLDERS : EN_PLACEHOLDERS

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/warish" className="text-sm text-gray-500 hover:text-gray-800">← Warish</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Warish Certificate Templates</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Manage custom text templates for Bangla and English Warish certificates
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            New Template
          </button>
        </div>

        {/* ── Lang tabs ───────────────────────────────────────── */}
        <div className="mt-4 flex gap-1">
          {(['bn', 'en'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                activeLang === lang
                  ? 'bg-green-700 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {lang === 'bn' ? '🇧🇩 বাংলা Templates' : '🇬🇧 English Templates'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* ── INFO CARD ─────────────────────────────────────── */}
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>How this works:</strong> Templates here define the body text that appears inside Warish certificates.
          Use placeholders like <code className="rounded bg-blue-100 px-1">{'{{deceased_name_bn}}'}</code> which are automatically
          filled with real data when a certificate is generated.
          The certificate header, heirs table, and signature blocks are always generated automatically.
        </div>

        {/* ── TEMPLATES LIST ────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              No {activeLang === 'bn' ? 'Bangla' : 'English'} templates yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">Create your first Warish certificate body template</p>
            <button onClick={openCreate} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
              + Create Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t._id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-start justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.language === 'bn' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {t.language === 'bn' ? 'বাংলা' : 'English'}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.is_active ? '● Active' : '○ Inactive'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 truncate">{t.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2 whitespace-pre-wrap">{t.body_template}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        t.is_active
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ CREATE / EDIT MODAL ══════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Template' : 'New Warish Certificate Template'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              {/* name + language row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Template Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={form.language === 'bn' ? 'যেমন: ওয়ারিশ সনদ — বাংলা' : 'e.g. Warish Certificate — English'}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Language *</label>
                  <select
                    value={form.language}
                    onChange={e => setForm(f => ({ ...f, language: e.target.value as 'bn' | 'en' }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  >
                    <option value="bn">🇧🇩 বাংলা</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>
              </div>

              {/* placeholders */}
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-600">Click to insert placeholder:</div>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map(ph => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="rounded bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-700 hover:bg-green-100 hover:text-green-800 transition-colors"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              {/* body */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Certificate Body Text *</label>
                <textarea
                  required
                  rows={10}
                  value={form.body_template}
                  onChange={e => setForm(f => ({ ...f, body_template: e.target.value }))}
                  placeholder={
                    form.language === 'bn'
                      ? 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, {{deceased_name_bn}}, পিতা: {{deceased_father_name_bn}} ...'
                      : 'This is to certify that {{deceased_name_en}}, son/daughter of {{deceased_father_name_en}} ...'
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono leading-relaxed focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-y"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Write the main body of the certificate. Placeholders in <code className="bg-gray-100 px-1 rounded">{'{{...}}'}</code> will be replaced automatically.
                </p>
              </div>

              {/* actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editing ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
