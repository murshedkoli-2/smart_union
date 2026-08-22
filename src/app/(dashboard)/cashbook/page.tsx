import { requireServerPermission, serialize } from '@/lib/auth/server-session'
import { parsePagination } from '@/lib/utils/pagination'
import { PERMISSIONS } from '@/constants/permissions'
import * as CashbookService from '@/services/cashbook.service'
import CashbookView, { type CashbookEntryRow } from './CashbookView'

/**
 * Cashbook — a Server Component.
 *
 * Entries and the income/expense totals are computed during the server render,
 * which also removes the two loading skeletons the client version needed while
 * it waited on its own API calls.
 *
 * The permission gate is repeated here because calling the service layer
 * directly bypasses the API route middleware.
 */
export default async function CashbookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const actor = await requireServerPermission(
    '/cashbook',
    ['secretary', 'entrepreneur'],
    PERMISSIONS.CASHBOOK_VIEW,
  )

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const { page, limit } = parsePagination(query)
  const fiscalYear = query.get('fiscal_year') ?? undefined

  const [result, summary] = await Promise.all([
    CashbookService.listEntries(
      {
        page,
        limit,
        fiscal_year: fiscalYear,
        source: query.get('source') ?? undefined,
        entry_type: query.get('entry_type') ?? undefined,
      },
      actor,
    ),
    CashbookService.getSummary({ fiscal_year: fiscalYear }, actor),
  ])

  return (
    <CashbookView
      entries={serialize(result.entries) as unknown as CashbookEntryRow[]}
      summary={{
        total_income: summary.total_income,
        total_expense: summary.total_expense,
        net_balance: summary.net_balance,
      }}
      total={result.total}
      page={result.page}
      limit={result.limit}
    />
  )
}
