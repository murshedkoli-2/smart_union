'use client'

/** Edit one existing admin's permissions. */
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import PermissionPicker, { togglePermission } from './PermissionPicker'
import type { AdminUser } from './types'

export default function PermissionsModal({
  user,
  saving,
  onClose,
  onSave,
}: {
  /** Null closes the dialog; the user's current permissions seed the draft. */
  user: AdminUser | null
  saving: boolean
  onClose: () => void
  onSave: (permissions: string[]) => void
}) {
  const [permissions, setPermissions] = useState<string[]>(user?.permissions ?? [])

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Permissions — ${user?.name ?? ''}`}
      size="md"
    >
      <div className="space-y-4">
        <PermissionPicker
          selected={permissions}
          onToggle={(permission) => setPermissions((current) => togglePermission(current, permission))}
          maxHeight="max-h-64"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(permissions)}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
