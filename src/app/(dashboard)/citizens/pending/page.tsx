import { requireServerPermission, serialize } from '@/lib/auth/server-session'
import { parsePagination } from '@/lib/utils/pagination'
import { PERMISSIONS } from '@/constants/permissions'
import * as CitizenService from '@/services/citizen.service'
import PendingCitizensView, { type PendingCitizenRow } from './PendingCitizensView'

/**
 * Pending citizen approvals — a Server Component.
 *
 * Gated on CITIZEN_APPROVE rather than CITIZEN_VIEW: this queue is the
 * approval workflow, and the actions on every row require that permission.
 */
export default async function PendingApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const actor = await requireServerPermission(
    '/citizens/pending',
    ['secretary', 'entrepreneur'],
    PERMISSIONS.CITIZEN_APPROVE,
  )

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const { page, limit } = parsePagination(query)

  const wardNo = Number(query.get('ward_no'))

  const result = await CitizenService.listCitizens(
    {
      page,
      limit,
      status: 'pending',
      search: query.get('search') ?? undefined,
      ward_no: Number.isFinite(wardNo) && wardNo > 0 ? wardNo : undefined,
    },
    actor,
  )

  return (
    <PendingCitizensView
      citizens={serialize(result.citizens) as unknown as PendingCitizenRow[]}
      total={result.total}
      page={result.page}
      limit={result.limit}
    />
  )
}
