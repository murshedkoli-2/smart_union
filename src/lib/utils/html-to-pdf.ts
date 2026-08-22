'use client'

/**
 * Renders an HTML string to an A4 PDF and downloads it.
 *
 * This pipeline — build a hidden off-screen container, wait for fonts and
 * images, rasterise with html2canvas, place the bitmap into a jsPDF page —
 * was duplicated in five places (three handlers in the warish detail page plus
 * the certificate and citizen detail pages), each with slightly different
 * waits and scale factors, and each leaking the container on some error paths.
 *
 * html2canvas and jsPDF stay dynamically imported: together they are a large
 * dependency that only matters when someone actually downloads a document, and
 * this app is used on slow connections.
 */

export interface HtmlToPdfOptions {
  /** Render width in CSS pixels. 794px ≈ A4 at 96dpi. */
  width?: number
  /**
   * Delay before rasterising, to let webfonts and images settle. Bengali
   * webfonts in particular render blank if captured too early.
   */
  settleMs?: number
  /** Canvas scale. 2 keeps Bengali glyphs legible in print. */
  scale?: number
  /** Extra CSS applied to the off-screen container. */
  containerStyle?: string
  /** Page size. Certificates print on A5, documents on A4. */
  format?: 'a4' | 'a5'
  /**
   * How the bitmap is placed on the page.
   * - 'width'  : spans the full page width, clipped if taller (the default).
   * - 'contain': scaled to fit entirely and centred — used for receipts, where
   *              cropping the bottom would cut off the amount.
   */
  fit?: 'width' | 'contain'
  /** JPEG quality, 0-1. */
  quality?: number
  /**
   * CSS selector for the element to rasterise, instead of the container.
   * Certificate HTML is a full document, so its first child can be a <style>
   * tag rather than the page body.
   */
  selector?: string
}

export async function downloadHtmlAsPdf(
  html: string,
  filename: string,
  options: HtmlToPdfOptions = {},
): Promise<void> {
  const {
    width = 794,
    settleMs = 600,
    scale = 2,
    containerStyle = '',
    format = 'a4',
    fit = 'width',
    quality = 0.97,
    selector,
  } = options

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const container = document.createElement('div')
  container.style.cssText = `position:fixed; left:-9999px; top:0; width:${width}px; background:#fff; ${containerStyle}`
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    await new Promise((resolve) => setTimeout(resolve, settleMs))

    const target = selector
      ? ((container.querySelector(selector) as HTMLElement | null) ?? container)
      : container

    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      allowTaint: true,
      width,
      windowWidth: width,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL('image/jpeg', quality)

    if (fit === 'contain') {
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
      const renderWidth = canvas.width * ratio
      const renderHeight = canvas.height * ratio
      pdf.addImage(
        imgData,
        'JPEG',
        (pageWidth - renderWidth) / 2,
        (pageHeight - renderHeight) / 2,
        renderWidth,
        renderHeight,
      )
    } else {
      const renderedHeight = pageWidth * (canvas.height / canvas.width)
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(renderedHeight, pageHeight))
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  } finally {
    // finally, not the happy path: several of the original copies left the
    // hidden container in the DOM whenever rasterising threw.
    container.remove()
  }
}
