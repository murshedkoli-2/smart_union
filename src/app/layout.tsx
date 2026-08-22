import type { Metadata } from 'next'
import { Geist, Hind_Siliguri } from 'next/font/google'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const hindSiliguri = Hind_Siliguri({
  variable: '--font-bangla-ui',
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
})

/**
 * Every page renders per request.
 *
 * Required by the nonce-based CSP: a statically prerendered page is built once
 * and served from cache, so the inline scripts baked into it cannot carry the
 * nonce that this request's policy names — the browser would block Next's
 * hydration script and the page would render blank. Verified: before this,
 * static routes served 16 script tags with 0 nonce attributes while dynamic
 * routes served 16 of 16.
 *
 * The cost is small here. Every page is a client component that fetches its
 * data after hydration, so what was being cached was an empty shell.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'Smart Union Parishad',
    template: '%s | Smart Union Parishad',
  },
  description: 'Smart Union Parishad Management System — Government of Bangladesh',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" className={`${geist.variable} ${hindSiliguri.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LanguageProvider>
          {children}
          <ToastProvider />
        </LanguageProvider>
      </body>
    </html>
  )
}
