import { requireServerPermission, serialize } from '@/lib/auth/server-session'
import { parsePagination } from '@/lib/utils/pagination'
import { PERMISSIONS } from '@/constants/permissions'
import * as CitizenService from '@/services/citizen.service'
import CitizensView, { type CitizenRow } from './CitizensView'

/**
 * Citizens list — a Server Component.
 *
 * Rows are fetched during the server render by calling the service layer
 * directly, so the browser receives a populated page instead of an empty shell
 * that then fetches over HTTP after hydration. Only the interactive shell
 * (filters, actions, modals) ships as client JavaScript.
 *
 * The permission gate is repeated here on purpose: calling the service layer
 * directly bypasses the API route middleware that would otherwise enforce it.
 */
export default async function CitizensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const actor = await requireServerPermission(
    '/citizens',
    ['secretary', 'entrepreneur'],
    PERMISSIONS.CITIZEN_VIEW,
  )

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const { page, limit } = parsePagination(query)

  const wardNo = Number(query.get('ward_no'))

  const [result, pending] = await Promise.all([
    CitizenService.listCitizens(
      {
        page,
        limit,
        search: query.get('search') ?? undefined,
        status: query.get('status') ?? undefined,
        ward_no: Number.isFinite(wardNo) && wardNo > 0 ? wardNo : undefined,
      },
      actor,
    ),
    // Badge count only — one document is enough to read `total`.
    CitizenService.listCitizens({ status: 'pending', limit: 1 }, actor),
  ])

  return (
    <CitizensView
      citizens={serialize(result.citizens) as unknown as CitizenRow[]}
      total={result.total}
      page={result.page}
      limit={result.limit}
      pendingCount={pending.total}
    />
  )
}
