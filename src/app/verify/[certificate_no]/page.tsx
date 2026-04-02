interface VerifyResponse {
  success: boolean
  message: string
  data?: {
    valid: boolean
    certificate_no: string
    status: string
    language?: string
    certificate_type?: string
    citizen?: {
      name_bn?: string
      name_en?: string
    }
    approved_by?: {
      name?: string
    }
    approved_at?: string
    fiscal_year?: string
  }
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificate_no: string }>
}) {
  const { certificate_no } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/verify/${encodeURIComponent(certificate_no)}`, {
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as VerifyResponse
  const data = payload.data
  const isValid = Boolean(data?.valid)
  const isPending = data?.status === 'pending'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
            isValid
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {isValid
            ? 'Certificate verified successfully.'
            : isPending
              ? 'Certificate is pending approval.'
              : payload.message || 'Certificate could not be verified.'}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Certificate Verification</h1>
        <p className="mt-2 text-sm text-slate-500">
          Public verification record for certificate <strong>{certificate_no}</strong>
        </p>

        {isValid && data ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Certificate No', value: data.certificate_no },
              { label: 'Status', value: data.status },
              { label: 'Type', value: data.certificate_type?.replace(/_/g, ' ') },
              { label: 'Language', value: data.language === 'bn' ? 'Bangla' : 'English' },
              {
                label: 'Citizen',
                value: data.citizen?.name_bn || data.citizen?.name_en || '-',
              },
              { label: 'Fiscal Year', value: data.fiscal_year || '-' },
              {
                label: 'Approved By',
                value: data.approved_by?.name || '-',
              },
              {
                label: 'Approved At',
                value: data.approved_at ? new Date(data.approved_at).toLocaleDateString('en-BD') : '-',
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-sm text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`mt-8 rounded-lg px-4 py-3 text-sm ${
              isPending
                ? 'border border-amber-200 bg-amber-50 text-amber-800'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {isPending
              ? 'This certificate is still pending approval. Public details are not available yet.'
              : payload.message || 'Certificate not found.'}
          </div>
        )}
      </div>
    </main>
  )
}
