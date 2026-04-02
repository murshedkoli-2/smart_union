'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { apiCall } from '@/lib/utils/api-client'
import PageHeader from '@/components/ui/PageHeader'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProfileForm {
  name: string
  mobile: string
  current_password?: string
  new_password?: string
  role: string
  email: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    mobile: '',
    current_password: '',
    new_password: '',
    role: '',
    email: '',
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      setForm({
        name: user.name || '',
        mobile: user.mobile || '',
        current_password: '',
        new_password: '',
        role: user.role || '',
        email: user.email || '',
      })
    }
    setLoading(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload: Partial<ProfileForm> = {
      name: form.name,
      mobile: form.mobile,
    }

    if (form.new_password) {
      if (!form.current_password) {
        toast.error('Current password is required to set a new password')
        setSaving(false)
        return
      }
      payload.new_password = form.new_password
      payload.current_password = form.current_password
    }

    const res = await apiCall('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      const { data } = await res.json()
      toast.success('Profile updated successfully')
      
      // Update session storage cleanly
      const stored = sessionStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        const updatedUser = { ...user, name: data.name, mobile: data.mobile }
        sessionStorage.setItem('user', JSON.stringify(updatedUser))
      }
      
      // Reset passwords in form
      setForm(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
      }))
    } else {
      const d = await res.json()
      if (d.errors) {
        const msgs = Object.values(d.errors).flat().join(', ')
        toast.error(msgs || 'Validation error')
      } else {
        toast.error(d.message || 'Failed to update profile')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader title="Profile Settings" />

      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">Your Information</h2>
            <p className="mt-1 text-sm text-gray-500">Update your account details and password.</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Read-only info */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={form.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Editable info */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Mobile Number</label>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="e.g. 01700000000"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Password update (Optional) */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-800">Change Password (Optional)</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      value={form.current_password}
                      onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      value={form.new_password}
                      onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Leave both fields blank if you do not want to change your password. 
                  Password must contain at least one uppercase letter, one lowercase letter, and one number.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
