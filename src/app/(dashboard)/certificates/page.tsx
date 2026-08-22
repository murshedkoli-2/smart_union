import { requireServerPermission, serialize } from '@/lib/auth/server-session'
import { parsePagination } from '@/lib/utils/pagination'
import * as CertificateService from '@/services/certificate.service'
import CertificatesView, { type CertificateRow } from './CertificatesView'

/**
 * Certificates list — a Server Component.
 *
 * Open to citizens as well as staff; listCertificates scopes a citizen to
 * their own records, so no extra permission is required beyond a valid
 * session, matching GET /api/certificates.
 */
export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const actor = await requireServerPermission('/certificates', [
    'secretary',
    'entrepreneur',
    'citizen',
  ])

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const { page, limit } = parsePagination(query)

  const result = await CertificateService.listCertificates(
    {
      page,
      limit,
      language: query.get('language') ?? undefined,
      certificate_type: query.get('certificate_type') ?? undefined,
      status: query.get('status') ?? undefined,
    },
    actor,
  )

  return (
    <CertificatesView
      certificates={serialize(result.certificates) as unknown as CertificateRow[]}
      total={result.total}
      page={result.page}
      limit={result.limit}
    />
  )
}
