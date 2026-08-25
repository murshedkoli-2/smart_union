'use client'

/** Create an admin user, with the permissions they start with. */
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import PermissionPicker, { togglePermission } from './PermissionPicker'

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

export interface CreateAdminForm {
  name: string
  email: string
  password: string
  mobile: string
  permissions: string[]
}

const blankForm = (): CreateAdminForm => ({
  name: '',
  email: '',
  password: '',
  mobile: '',
  permissions: [],
})

export default function CreateAdminModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  saving: boolean
  onClose: () => void
  onSubmit: (form: CreateAdminForm) => void
}) {
  const [form, setForm] = useState<CreateAdminForm>(blankForm)

  const close = () => {
    setForm(blankForm())
    onClose()
  }

  const setField = <K extends keyof CreateAdminForm>(key: K, value: CreateAdminForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  return (
    <Modal open={open} onClose={close} title="Create Admin" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(form)
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-gray-400">Minimum 6 characters</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setField('mobile', e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Permissions</label>
          <PermissionPicker
            selected={form.permissions}
            onToggle={(permission) =>
              setField('permissions', togglePermission(form.permissions, permission))
            }
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
