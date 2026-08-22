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

/**
 * Path a QR code points at.
 *
 * Takes the certificate's `verification_token`, never its `certificate_no`.
 * Certificate numbers are sequential, so using one here would let anyone
 * enumerate the register — see lib/utils/verification-token.
 */
export function buildCertificateVerificationPath(verificationToken: string): string {
  return `/verify/${encodeURIComponent(verificationToken)}`
}

export function buildCertificateVerificationUrl(verificationToken: string): string {
  return `${getAppBaseUrl()}${buildCertificateVerificationPath(verificationToken)}`
}
