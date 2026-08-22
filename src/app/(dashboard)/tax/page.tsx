import { requireServerPermission, serialize } from '@/lib/auth/server-session'
import { parsePagination } from '@/lib/utils/pagination'
import { PERMISSIONS } from '@/constants/permissions'
import * as TaxService from '@/services/tax.service'
import TaxView, { type TaxRecordRow, type TaxSummaryData } from './TaxView'

/**
 * Holding tax list — a Server Component.
 *
 * Records and the paid/due totals are fetched during the server render. Open
 * to citizens, whom listTaxRecords scopes to their own records, matching
 * GET /api/tax.
 */
export default async function HoldingTaxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const actor = await requireServerPermission(
    '/tax',
    ['secretary', 'entrepreneur', 'citizen'],
    PERMISSIONS.TAX_VIEW,
  )

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const { page, limit } = parsePagination(query)

  const [result, summary] = await Promise.all([
    TaxService.listTax(
      {
        page,
        limit,
        fiscal_year: query.get('fiscal_year') ?? undefined,
        status: query.get('status') ?? undefined,
      },
      actor,
    ),
    TaxService.getTaxSummary(actor),
  ])

  return (
    <TaxView
      taxes={serialize(result.records) as unknown as TaxRecordRow[]}
      summary={serialize(summary) as unknown as TaxSummaryData}
      total={result.total}
      page={result.page}
      limit={result.limit}
    />
  )
}
