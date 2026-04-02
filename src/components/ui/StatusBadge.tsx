'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  locked: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  deleted: 'bg-rose-100 text-rose-700',
}

const STATUS_KEYS: Record<string, TranslationKey> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  locked: 'locked',
  draft: 'draft',
  paid: 'paid',
  unpaid: 'unpaid',
  active: 'active',
  inactive: 'inactive',
  deleted: 'deleted',
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage()
  const key = status?.toLowerCase()
  const colorClass = STATUS_COLORS[key] ?? 'bg-gray-100 text-gray-600'
  const label = STATUS_KEYS[key] ? t(STATUS_KEYS[key]) : status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}>
      {label}
    </span>
  )
}
