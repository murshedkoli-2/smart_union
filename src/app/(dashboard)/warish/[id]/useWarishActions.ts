'use client'

/**
 * Every mutation and download the warish detail page can perform.
 *
 * Pulled out of the page component so the page is layout and the workflow is
 * testable on its own. All of them share one `processing` flag, which is what
 * disables the whole action bar while any of them runs.
 */
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'
import type { Heir, WarishApplication, WarishEditFormState, WarishPageSettings } from '@/types/warish.types'
import {
  applicationFileName,
  buildApplicationHtml,
  buildCertificateHtml,
  certificateFileName,
  type CertificateLanguage,
} from './document-html'

interface Options {
  id: string
  application: WarishApplication | null
  settings: WarishPageSettings | null
  members: Heir[]
  refetch: () => void
}

/** Reads the error message the API returned, falling back to `fallback`. */
async function messageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return body.message || fallback
  } catch {
    return fallback
  }
}

export function useWarishActions({ id, application, settings, members, refetch }: Options) {
  const [processing, setProcessing] = useState(false)

  /** PATCH/POST, toast either way, refetch on success. */
  const mutate = useCallback(
    async (
      path: string,
      init: RequestInit,
      { success, failure }: { success: string; failure: string },
    ): Promise<boolean> => {
      setProcessing(true)
      const res = await apiCall(path, init)
      setProcessing(false)

      if (!res.ok) {
        toast.error(await messageFrom(res, failure))
        return false
      }

      toast.success(success)
      refetch()
      return true
    },
    [refetch],
  )

  const update = useCallback(
    (form: WarishEditFormState) =>
      mutate(
        `/api/warish/${id}`,
        { method: 'PATCH', body: JSON.stringify(form) },
        { success: 'Application updated successfully', failure: 'Failed to update' },
      ),
    [id, mutate],
  )

  const submitForReview = useCallback(
    () =>
      mutate(
        `/api/warish/${id}`,
        { method: 'PATCH', body: JSON.stringify({ status: 'pending' }) },
        { success: 'Application submitted successfully', failure: 'Submission failed' },
      ),
    [id, mutate],
  )

  const pay = useCallback(
    () =>
      mutate(
        `/api/warish/${id}/pay`,
        { method: 'POST' },
        { success: 'Payment processed successfully', failure: 'Payment failed' },
      ),
    [id, mutate],
  )

  const approve = useCallback(
    () =>
      mutate(
        `/api/warish/${id}/approve`,
        { method: 'POST' },
        { success: 'Application approved', failure: 'Approval failed' },
      ),
    [id, mutate],
  )

  /** Renders the certificate to a PDF and hands it to the browser. */
  const downloadCertificatePdf = useCallback(
    async (
      language: CertificateLanguage,
      certificateNo: string,
      verificationUrl: string,
    ): Promise<void> => {
      if (!application || !settings) return

      const qrDataUrl = verificationUrl
        ? await QRCode.toDataURL(verificationUrl, { width: 96, margin: 1 })
        : undefined

      const html = buildCertificateHtml({
        application,
        settings,
        members,
        language,
        certificateNo,
        qrDataUrl,
      })

      await downloadHtmlAsPdf(html, certificateFileName(application, language, id), {
        settleMs: 700,
      })
    },
    [application, settings, members, id],
  )

  const issueCertificate = useCallback(
    async (language: CertificateLanguage): Promise<void> => {
      if (!application || !settings) return
      setProcessing(true)

      const res = await apiCall(`/api/warish/${id}/issue`, {
        method: 'POST',
        body: JSON.stringify({ language }),
      })

      if (!res.ok) {
        toast.error(await messageFrom(res, 'Certificate issuance failed'))
        setProcessing(false)
        return
      }

      const issued = (await res.json()).data

      try {
        // The QR URL is built server-side from the certificate's verification
        // token. The client holds no token, so there is no fallback to build.
        await downloadCertificatePdf(language, issued?.certificate_no || '', issued?.qr_code_url || '')
        toast.success(
          `${language === 'bn' ? 'বাংলা' : 'English'} certificate saved & PDF downloaded!`,
        )
      } catch {
        toast.error('PDF generation failed. Certificate was saved — retry from the certificate link.')
      }

      refetch()
      setProcessing(false)
    },
    [application, settings, id, refetch, downloadCertificatePdf],
  )

  const redownloadCertificate = useCallback(
    async (language: CertificateLanguage): Promise<void> => {
      if (!application || !settings) return
      setProcessing(true)

      try {
        const ref = language === 'bn' ? application.certificate_id_bn : application.certificate_id_en
        const certificateRefId = typeof ref === 'string' ? ref : ref?._id

        let certificateNo = ''
        let verificationUrl = ''
        if (certificateRefId) {
          const res = await apiCall(`/api/certificates/${certificateRefId}`)
          if (res.ok) {
            const { data } = await res.json()
            certificateNo = data?.certificate_no || ''
            verificationUrl = data?.qr_code_url || ''
          }
        }

        await downloadCertificatePdf(language, certificateNo, verificationUrl)
      } catch {
        toast.error('PDF download failed.')
      }

      setProcessing(false)
    },
    [application, settings, downloadCertificatePdf],
  )

  const downloadApplicationPdf = useCallback(async (): Promise<void> => {
    if (!application || !settings) {
      toast.error('Application or system settings data not loaded yet.')
      return
    }

    setProcessing(true)
    try {
      const html = buildApplicationHtml({ application, settings, members })
      await downloadHtmlAsPdf(html, applicationFileName(application), {
        containerStyle: 'font-size:13px;',
      })
      toast.success('Application PDF downloaded successfully')
    } catch {
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [application, settings, members])

  return {
    processing,
    update,
    submitForReview,
    pay,
    approve,
    issueCertificate,
    redownloadCertificate,
    downloadApplicationPdf,
  }
}
