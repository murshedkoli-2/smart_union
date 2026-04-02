'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'
import { type AppUser, hasPermission } from '@/hooks/useUser'
import { PERMISSIONS } from '@/constants/permissions'

type NavItem = { href: string; labelKey: TranslationKey; icon: string; permission?: string }
type NavGroup = { sectionKey: TranslationKey; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    sectionKey: 'overview',
    items: [{ href: '/dashboard', labelKey: 'dashboard', icon: '⌘' }],
  },
  {
    sectionKey: 'citizensSection',
    items: [
      { href: '/citizens', labelKey: 'citizens', icon: '👤', permission: PERMISSIONS.CITIZEN_VIEW },
    ],
  },
  {
    sectionKey: 'finance',
    items: [
      { href: '/tax', labelKey: 'tax', icon: '🏛', permission: PERMISSIONS.TAX_VIEW },
      { href: '/cashbook', labelKey: 'cashbook', icon: '📒', permission: PERMISSIONS.CASHBOOK_VIEW },
    ],
  },
  {
    sectionKey: 'services',
    items: [
      { href: '/certificates', labelKey: 'certificates', icon: '📜', permission: PERMISSIONS.CERTIFICATE_VIEW },
      { href: '/warish/templates', labelKey: 'certificateTemplates', icon: '📝', permission: PERMISSIONS.TEMPLATE_MANAGE },
      { href: '/warish', labelKey: 'warish', icon: '⚖', permission: PERMISSIONS.WARISH_VIEW },
      { href: '/relief', labelKey: 'relief', icon: '🎁', permission: PERMISSIONS.RELIEF_VIEW },
    ],
  },
  {
    sectionKey: 'adminSection',
    items: [
      { href: '/admin/system-settings', labelKey: 'systemSettings', icon: '⚙', permission: PERMISSIONS.SETTINGS_MANAGE },
      { href: '/admin/users', labelKey: 'users', icon: '👥', permission: PERMISSIONS.USER_MANAGE },
      { href: '/admin/audit-logs', labelKey: 'auditLogs', icon: '📋', permission: PERMISSIONS.AUDIT_VIEW },
    ],
  },
]

const CITIZEN_NAV: NavGroup[] = [
  {
    sectionKey: 'overview',
    items: [{ href: '/dashboard', labelKey: 'dashboard', icon: '⌘' }],
  },
  {
    sectionKey: 'services',
    items: [
      { href: '/citizens/profile', labelKey: 'myProfile', icon: '👤' },
      { href: '/certificates', labelKey: 'myCertificates', icon: '📜' },
      { href: '/warish', labelKey: 'myWarishApps', icon: '⚖' },
    ],
  },
  {
    sectionKey: 'finance',
    items: [
      { href: '/tax', labelKey: 'myTax', icon: '🏛' },
    ],
  },
]

interface SidebarProps {
  user: AppUser
  open: boolean
  onClose: () => void
}

export default function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-gray-200 bg-white
          transform transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:translate-x-0
          ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {/* Logo + close button row */}
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Smart Union Parishad"
              width={40}
              height={40}
              priority
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold leading-tight text-green-800">
                {t('appName')}
              </h1>
              <p className="mt-0.5 truncate text-xs text-gray-400">{t('appSubtitle')}</p>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:hidden"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {(user.role === 'citizen' ? CITIZEN_NAV : NAV).map((group) => {
            const visibleItems = group.items.filter(item => 
              !item.permission || hasPermission(user, item.permission)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.sectionKey}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t(group.sectionKey)}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
                            active
                              ? 'bg-green-50 font-medium text-green-800'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span className="text-base leading-none">{item.icon}</span>
                          {t(item.labelKey)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
