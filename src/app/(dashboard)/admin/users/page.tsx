'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { apiCall } from '@/lib/utils/api-client'
import { useUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS, ALL_PERMISSIONS } from '@/constants/permissions'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'

interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  permissions: string[]
  status: string
  last_login: string | null
  createdAt: string
}


const defaultCreateForm = {
  name: '',
  email: '',
  password: '',
  mobile: '',
  permissions: [] as string[],
}

const PERMISSION_LABELS: Record<string, string> = {
  'citizen.create': 'Create Citizens',
  'citizen.approve': 'Approve Citizens',
  'citizen.view': 'View Citizens',
  'citizen.edit': 'Edit Citizens',
  'certificate.create': 'Create Certificates',
  'certificate.approve': 'Approve Certificates',
  'certificate.view': 'View Certificates',
  'tax.create': 'Create Tax',
  'tax.collect': 'Collect Tax',
  'tax.view': 'View Tax',
  'payment.collect': 'Collect Payments',
  'payment.view': 'View Payments',
  'relief.manage': 'Manage Relief',
  'relief.view': 'View Relief',
  'cashbook.view': 'View Cashbook',
  'warish.create': 'Create Warish',
  'warish.approve': 'Approve Warish',
  'user.manage': 'Manage Users',
  'settings.manage': 'Manage System Settings',
  'audit.view': 'View Audit Logs',
  'template.manage': 'Manage Certificate Templates',
}

export default function AdminUsersPage() {
  const router = useRouter()
  const currentUser = useUser()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...defaultCreateForm })
  const [saving, setSaving] = useState(false)

  // Guard: only those with USER_MANAGE can access this page
  useEffect(() => {
    if (currentUser !== null && !hasPermission(currentUser, PERMISSIONS.USER_MANAGE)) {
      router.replace('/dashboard')
    }
  }, [currentUser, router])



  // Permissions modal
  const [permUser, setPermUser] = useState<AdminUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [savingPerms, setSavingPerms] = useState(false)

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (roleFilter) p.set('role', roleFilter)
    if (statusFilter) p.set('status', statusFilter)
    return `/api/users?${p.toString()}`
  }

  const { data, loading, error, refetch, pagination } = useApi<AdminUser[]>(buildUrl(), [page, roleFilter, statusFilter])

  const handleActivate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const res = await apiCall(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) { toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`); refetch() }
    else toast.error('Failed to update user status.')
  }

  const handleApprove = async (id: string) => {
    const res = await apiCall(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ approve: true }),
    })
    if (res.ok) { toast.success('User approved.'); refetch() }
    else toast.error('Failed to approve user.')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await apiCall('/api/users', {
      method: 'POST',
      body: JSON.stringify(createForm),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Admin user created.')
      setShowCreate(false)
      setCreateForm({ ...defaultCreateForm })
      refetch()
    } else {
      const d = await res.json()
      // Show field-level errors if available, otherwise fall back to the top-level message
      if (d.errors && typeof d.errors === 'object') {
        const fieldErrors = Object.entries(d.errors as Record<string, string[]>)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join(' | ')
        toast.error(fieldErrors || d.message || 'Failed to create user.')
      } else {
        toast.error(d.message ?? 'Failed to create user.')
      }
    }
  }

  const openPermissions = (user: AdminUser) => {
    setPermUser(user)
    setPermissions([...user.permissions])
  }

  const handleSavePermissions = async () => {
    if (!permUser) return
    setSavingPerms(true)
    const res = await apiCall(`/api/users/${permUser._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    })
    setSavingPerms(false)
    if (res.ok) {
      toast.success('Permissions updated.')
      setPermUser(null)
      refetch()
    } else {
      toast.error('Failed to update permissions.')
    }
  }

  const toggleCreatePerm = (perm: string) => {
    setCreateForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const togglePerm = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const columns: Column[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (v) => <span className="capitalize text-xs font-medium text-gray-700">{v?.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (v) => <span>{Array.isArray(v) ? v.length : 0}</span>,
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (v) => v ? new Date(v).toLocaleDateString('en-BD') : 'Never',
    },
    {
      key: '_id',
      label: 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPermissions(row as AdminUser)}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Permissions
          </button>
          {row.status === 'pending' && (
            <button
              onClick={() => handleApprove(id)}
              className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
            >
              Approve
            </button>
          )}
          {row.status !== 'pending' && row.role !== 'secretary' && (
            <button
              onClick={() => handleActivate(id, row.status)}
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

  const users = data ?? []
  const total = pagination?.total ?? 0

  if (!currentUser || !hasPermission(currentUser, PERMISSIONS.USER_MANAGE)) {
    return null
  }

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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="secretary">Super Admin</option>
          <option value="entrepreneur">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <DataTable columns={columns} data={users} loading={loading} emptyMessage="No users found." />
      <Pagination total={total} page={page} limit={20} onChange={setPage} />

      {/* Create Admin Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateForm({ ...defaultCreateForm }) }}
        title="Create Admin"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
              <input
                required
                type="password"
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-400">Minimum 6 characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
              <input
                type="text"
                value={createForm.mobile}
                onChange={(e) => setCreateForm((f) => ({ ...f, mobile: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Permissions</label>
            <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.includes(perm)}
                    onChange={() => toggleCreatePerm(perm)}
                    className="rounded text-green-700 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-700">
                    {PERMISSION_LABELS[perm] ?? perm}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateForm({ ...defaultCreateForm }) }}
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

      {/* View/Edit Permissions Modal */}
      <Modal
        open={!!permUser}
        onClose={() => setPermUser(null)}
        title={`Permissions — ${permUser?.name ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePerm(perm)}
                  className="rounded text-green-700 focus:ring-green-500"
                />
                <span className="text-xs text-gray-700">
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPermUser(null)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={savingPerms}
              className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {savingPerms ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
