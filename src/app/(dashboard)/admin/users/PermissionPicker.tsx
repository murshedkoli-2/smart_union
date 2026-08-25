'use client'

/** The permission checkbox grid, shared by the create and edit dialogs. */
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '@/constants/permissions'

export default function PermissionPicker({
  selected,
  onToggle,
  maxHeight = 'max-h-48',
}: {
  selected: string[]
  onToggle: (permission: Permission) => void
  maxHeight?: string
}) {
  return (
    <div className={`border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-2 overflow-y-auto ${maxHeight}`}>
      {ALL_PERMISSIONS.map((permission) => (
        <label key={permission} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(permission)}
            onChange={() => onToggle(permission)}
            className="rounded text-green-700 focus:ring-green-500"
          />
          <span className="text-xs text-gray-700">
            {PERMISSION_LABELS[permission] ?? permission}
          </span>
        </label>
      ))}
    </div>
  )
}

/** Add or remove one permission from a selection. */
export function togglePermission(selected: string[], permission: string): string[] {
  return selected.includes(permission)
    ? selected.filter((current) => current !== permission)
    : [...selected, permission]
}
