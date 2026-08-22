import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import Citizen from '@/models/Citizen'
import Certificate from '@/models/Certificate'
import Tax from '@/models/Tax'
import WarishApplication from '@/models/WarishApplication'
import { getCurrentFiscalYear } from '@/lib/utils/serial-generator'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

interface Notification {
  id: string
  type: 'citizen' | 'certificate' | 'tax' | 'warish'
  title: string
  description: string
  count: number
  href: string
  permission: string
  priority: 'high' | 'medium' | 'low'
}

async function handler(req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> {
  const { role, permissions } = req.user
  const fiscalYear = getCurrentFiscalYear()

  const hasPermission = (perm: string) => {
    if (role === 'secretary') return true
    if (role === 'entrepreneur') return (permissions ?? []).includes(perm)
    return false
  }

  const notifications: Notification[] = []

  // Run all permission-gated queries in parallel
  const queries: Promise<void>[] = []

  if (hasPermission('citizen.approve')) {
    queries.push(
      Citizen.countDocuments({ status: 'pending' }).then(count => {
        if (count > 0) {
          notifications.push({
            id: 'pending-citizens',
            type: 'citizen',
            title: 'Pending Citizen Approvals',
            description: `${count} citizen registration${count > 1 ? 's' : ''} awaiting approval`,
            count,
            href: '/citizens/pending',
            permission: 'citizen.approve',
            priority: 'high',
          })
        }
      })
    )
  }

  if (hasPermission('certificate.approve')) {
    queries.push(
      Certificate.countDocuments({ status: 'pending' }).then(count => {
        if (count > 0) {
          notifications.push({
            id: 'pending-certificates',
            type: 'certificate',
            title: 'Pending Certificates',
            description: `${count} certificate${count > 1 ? 's' : ''} awaiting approval`,
            count,
            href: '/certificates?status=pending',
            permission: 'certificate.approve',
            priority: 'high',
          })
        }
      })
    )
  }

  if (hasPermission('tax.collect')) {
    queries.push(
      Tax.countDocuments({ status: 'unpaid', fiscal_year: fiscalYear }).then(count => {
        if (count > 0) {
          notifications.push({
            id: 'unpaid-taxes',
            type: 'tax',
            title: 'Unpaid Holding Taxes',
            description: `${count} unpaid tax record${count > 1 ? 's' : ''} for ${fiscalYear}`,
            count,
            href: '/tax?status=unpaid',
            permission: 'tax.collect',
            priority: 'medium',
          })
        }
      })
    )
  }

  if (hasPermission('warish.approve')) {
    queries.push(
      WarishApplication.countDocuments({ status: 'pending' }).then(count => {
        if (count > 0) {
          notifications.push({
            id: 'pending-warish',
            type: 'warish',
            title: 'Pending Warish Applications',
            description: `${count} warish/family application${count > 1 ? 's' : ''} awaiting review`,
            count,
            href: '/warish?status=pending',
            permission: 'warish.approve',
            priority: 'medium',
          })
        }
      })
    )
  }

  if (hasPermission('certificate.view')) {
    queries.push(
      Certificate.countDocuments({ status: 'draft' }).then(count => {
        if (count > 0) {
          notifications.push({
            id: 'draft-certificates',
            type: 'certificate',
            title: 'Draft Certificates',
            description: `${count} draft certificate${count > 1 ? 's' : ''} need to be submitted`,
            count,
            href: '/certificates?status=draft',
            permission: 'certificate.view',
            priority: 'low',
          })
        }
      })
    )
  }

  await Promise.all(queries)

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const totalCount = notifications.reduce((sum, n) => sum + n.count, 0)

  return successResponse({ notifications, totalCount })
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur'])(handler)),
)
