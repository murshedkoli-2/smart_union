'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  alt: string
  size?: number
  className?: string
}

export default function CertificateQrCode({ value, alt, size = 112, className }: Props) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [size, value])

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
      />
    )
  }

  return <Image src={src} alt={alt} width={size} height={size} className={className} unoptimized />
}
