'use client'

/**
 * Holding-tax actions for one citizen: assess, collect, and print the receipt.
 *
 * Collecting a payment downloads its receipt immediately, so the two belong
 * together; keeping them here also keeps the PDF import lazy, off the page's
 * first load.
 */
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { apiCall } from '@/lib/utils/api-client'
import { downloadHtmlAsPdf } from '@/lib/utils/html-to-pdf'

export function useCitizenTax(citizenId: string, refetchTax: () => void) {
  const [assessing, setAssessing] = useState(false)
  const [payingTaxId, setPayingTaxId] = useState<string | null>(null)

  const downloadReceipt = useCallback(async (paymentId: string): Promise<void> => {
    try {
      const res = await apiCall(`/api/payments/${paymentId}/tax-receipt`, { method: 'GET' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Failed to fetch receipt data' }))
        toast.error(body.message || 'Failed to fetch receipt data.')
        return
      }

      const { data } = await res.json()
      const { generateTaxReceiptHtml } = await import('@/lib/utils/tax-receipt-render')

      // 'contain' so the receipt is never cropped — a clipped bottom would cut
      // off the amount, which is the part that matters on a payment receipt.
      await downloadHtmlAsPdf(
        generateTaxReceiptHtml(data),
        `holding-tax-receipt-${data.payment?.receipt_no || 'receipt'}.pdf`,
        { fit: 'contain', quality: 0.95, containerStyle: 'margin:0; padding:0;' },
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate receipt PDF.')
    }
  }, [])

  const assess = useCallback(
    async (fiscalYear: string, amount: string): Promise<boolean> => {
      setAssessing(true)
      const res = await apiCall(`/api/citizens/${citizenId}/tax`, {
        method: 'POST',
        body: JSON.stringify({ fiscal_year: fiscalYear, amount: Number(amount) }),
      })
      setAssessing(false)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.message ?? 'Failed to assess holding tax.')
        return false
      }

      toast.success('Holding tax assessed successfully.')
      refetchTax()
      return true
    },
    [citizenId, refetchTax],
  )

  const pay = useCallback(
    async (taxId: string): Promise<void> => {
      setPayingTaxId(taxId)
      try {
        const res = await apiCall(`/api/citizens/${citizenId}/tax/${taxId}/pay`, { method: 'POST' })

        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Failed to pay holding tax.' }))
          toast.error(body.message ?? 'Failed to pay holding tax.')
          return
        }

        const { data } = await res.json()
        toast.success('Holding tax paid successfully.')
        refetchTax()

        if (data?.payment?._id) await downloadReceipt(data.payment._id)
      } catch {
        toast.error('Failed to pay holding tax. Please try again.')
      } finally {
        setPayingTaxId(null)
      }
    },
    [citizenId, refetchTax, downloadReceipt],
  )

  return { assessing, payingTaxId, assess, pay, downloadReceipt }
}
