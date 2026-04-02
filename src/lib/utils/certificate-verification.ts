export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }

  return 'http://localhost:3000'
}

export function buildCertificateVerificationPath(certificateNo: string): string {
  return `/verify/${encodeURIComponent(certificateNo)}`
}

export function buildCertificateVerificationUrl(certificateNo: string): string {
  return `${getAppBaseUrl()}${buildCertificateVerificationPath(certificateNo)}`
}
