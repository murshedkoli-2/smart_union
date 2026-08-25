'use client'

import type { WarishListStats } from '@/types/warish.types'

type Tone = 'neutral' | 'amber' | 'emerald' | 'gray'

// Written out per tone rather than interpolated: Tailwind only ships classes
// it can see as complete strings in the source.
const TONES: Record<Tone, { card: string; label: string; value: string; hint: string }> = {
  neutral: {
    card: 'bg-white border-gray-100',
    label: 'text-gray-400',
    value: 'text-gray-900',
    hint: 'text-gray-400',
  },
  amber: {
    card: 'bg-amber-50 border-amber-100',
    label: 'text-amber-500',
    value: 'text-amber-700',
    hint: 'text-amber-400',
  },
  emerald: {
    card: 'bg-emerald-50 border-emerald-100',
    label: 'text-emerald-500',
    value: 'text-emerald-700',
    hint: 'text-emerald-400',
  },
  gray: {
    card: 'bg-gray-50 border-gray-200',
    label: 'text-gray-400',
    value: 'text-gray-600',
    hint: 'text-gray-400',
  },
}

function StatCard({
  tone,
  label,
  value,
  hint,
}: {
  tone: Tone
  label: string
  value: number
  hint: string
}) {
  const theme = TONES[tone]
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${theme.card}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${theme.label}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold ${theme.value}`}>{value}</p>
      <p className={`mt-1 text-xs ${theme.hint}`}>{hint}</p>
    </div>
  )
}

export default function StatCards({
  stats,
  lang,
}: {
  stats: WarishListStats
  lang: string
}) {
  const bn = lang === 'bn'

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        tone="neutral"
        label={bn ? 'মোট' : 'Total'}
        value={stats.total}
        hint={bn ? 'সব আবেদন' : 'All applications'}
      />
      <StatCard
        tone="amber"
        label={bn ? 'অপেক্ষমাণ' : 'Pending'}
        value={stats.pending}
        hint={bn ? 'পর্যালোচনার অপেক্ষায়' : 'Awaiting review'}
      />
      <StatCard
        tone="emerald"
        label={bn ? 'অনুমোদিত' : 'Approved'}
        value={stats.approved}
        hint={bn ? 'সার্টিফিকেট ইস্যু করা হয়েছে' : 'Certificates issued'}
      />
      <StatCard
        tone="gray"
        label={bn ? 'খসড়া' : 'Drafts'}
        value={stats.draft}
        hint={bn ? 'জমা দেওয়া হয়নি' : 'Not submitted'}
      />
    </div>
  )
}
