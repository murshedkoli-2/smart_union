'use client'

/**
 * Admin user management: create admins, approve or deactivate them, and edit
 * what each one may do.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { PERMISSIONS } from '@/constants/permissions'
import RequirePermission from '@/components/auth/RequirePermission'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import CreateAdminModal, { type CreateAdminForm } from './CreateAdminModal'
import PermissionsModal from './PermissionsModal'
import type { AdminUser } from './types'

const PAGE_SIZE = 20

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'secretary', label: 'Super Admin' },
  { value: 'entrepreneur', label: 'Admin' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const SELECT_CLASS =
  'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'

/** Reads the field-level errors the API returns, falling back to its message. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  if (body.errors && typeof body.errors === 'object') {
    const fields = Object.entries(body.errors as Record<string, string[]>)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join(' | ')
    if (fields) return fields
  }
  return body.message ?? fallback
}

function AdminUsersPageView() {
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissionsUser, setPermissionsUser] = useState<AdminUser | null>(null)
  const [savingPermissions, setSavingPermissions] = useState(false)

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  if (roleFilter) query.set('role', roleFilter)
  if (statusFilter) query.set('status', statusFilter)

  const { data, loading, error, refetch, pagination } = useApi<AdminUser[]>(
    `/api/users?${query.toString()}`,
    [page, roleFilter, statusFilter],
  )

  const patchUser = async (id: string, body: object, messages: { success: string; failure: string }) => {
    const res = await apiCall(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    if (res.ok) {
      toast.success(messages.success)
      refetch()
      return true
    }
    toast.error(messages.failure)
    return false
  }

  const toggleActive = (id: string, currentStatus: string) => {
    const status = currentStatus === 'active' ? 'inactive' : 'active'
    return patchUser(id, { status }, {
      success: `User ${status === 'active' ? 'activated' : 'deactivated'}.`,
      failure: 'Failed to update user status.',
    })
  }

  const approve = (id: string) =>
    patchUser(id, { approve: true }, { success: 'User approved.', failure: 'Failed to approve user.' })

  const create = async (form: CreateAdminForm) => {
    setSaving(true)
    const res = await apiCall('/api/users', { method: 'POST', body: JSON.stringify(form) })
    setSaving(false)

    if (res.ok) {
      toast.success('Admin user created.')
      setShowCreate(false)
      refetch()
      return
    }

    toast.error(await errorMessage(res, 'Failed to create user.'))
  }

  const savePermissions = async (permissions: string[]) => {
    if (!permissionsUser) return
    setSavingPermissions(true)
    const ok = await patchUser(permissionsUser._id, { permissions }, {
      success: 'Permissions updated.',
      failure: 'Failed to update permissions.',
    })
    setSavingPermissions(false)
    if (ok) setPermissionsUser(null)
  }

  const columns: Column[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className="capitalize text-xs font-medium text-gray-700">
          {value?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (value) => <span>{Array.isArray(value) ? value.length : 0}</span>,
    },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (value) => (value ? new Date(value).toLocaleDateString('en-BD') : 'Never'),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPermissionsUser(row as AdminUser)}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Permissions
          </button>
          {row.status === 'pending' && (
            <button
              onClick={() => approve(id)}
              className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
            >
              Approve
            </button>
          )}
          {/* The secretary is the root account; it cannot lock itself out. */}
          {row.status !== 'pending' && row.role !== 'secretary' && (
            <button
              onClick={() => toggleActive(id, row.status)}
              className={`text-xs px-2 py-1 rounded border ${
                row.status === 'active'
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
            >
              {row.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <PageHeader
        title="Admin Users"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            + Create Admin
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className={SELECT_CLASS}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className={SELECT_CLASS}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        emptyMessage="No users found."
      />
      <Pagination
        total={pagination?.total ?? 0}
        page={page}
        limit={PAGE_SIZE}
        onChange={setPage}
      />

      <CreateAdminModal
        open={showCreate}
        saving={saving}
        onClose={() => setShowCreate(false)}
        onSubmit={create}
      />

      <PermissionsModal
        // Remounting per user seeds the draft from that user's permissions.
        key={permissionsUser?._id ?? 'none'}
        user={permissionsUser}
        saving={savingPermissions}
        onClose={() => setPermissionsUser(null)}
        onSave={savePermissions}
      />
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USER_MANAGE}>
      <AdminUsersPageView />
    </RequirePermission>
  )
}
