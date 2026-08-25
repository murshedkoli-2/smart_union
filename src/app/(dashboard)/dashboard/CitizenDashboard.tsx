'use client'

/**
 * What a citizen sees: their own documents and taxes, plus the services they
 * can start. No union-wide totals — a citizen has no business seeing those.
 */
import Link from 'next/link'
import type { DashboardStats } from '@/types/dashboard.types'

type Lang = string

/** Bangla/English pair, picked at render. */
const pick = (lang: Lang, bn: string, en: string) => (lang === 'bn' ? bn : en)

function WelcomeBanner({ lang, name }: { lang: Lang; name: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-900 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10 relative">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white opacity-10 blur-3xl" />
      <div className="absolute -bottom-10 right-32 h-32 w-32 rounded-full bg-emerald-400 opacity-20 blur-2xl" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {pick(lang, `স্মার্ট ইউনিয়নে স্বাগতম, ${name}!`, `Welcome to Smart Union, ${name}!`)}
          </h2>
          <p className="text-emerald-50 text-sm max-w-xl leading-relaxed">
            {pick(
              lang,
              'আপনার হাতের মুঠোয় নির্বিঘ্ন ইউনিয়ন সেবা। সার্টিফিকেট থেকে শুরু করে হোল্ডিং ট্যাক্স, অনলাইনে সহজেই আপনার নাগরিক দায়িত্ব এবং আবেদন পরিচালনা করুন।',
              'Experience seamless union services at your fingertips. From certificates to holding taxes, manage your civic responsibilities and applications effortlessly online.',
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row shrink-0 gap-3">
          <Link
            href="/certificates"
            className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-5 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-white/20 hover:scale-[1.02] shadow-sm"
          >
            {pick(lang, 'সার্টিফিকেটের আবেদন', 'Apply Certificate')}
          </Link>
          <Link
            href="/tax"
            className="rounded-xl bg-white px-5 py-2.5 text-center text-sm font-bold text-teal-800 shadow-md transition-all hover:bg-emerald-50 hover:scale-[1.02] hover:shadow-lg"
          >
            {pick(lang, 'ট্যাক্স পরিশোধ করুন', 'Pay Your Tax')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Nudge to finish, or wait for, profile approval — nothing once approved. */
function ProfileNotice({ lang, status }: { lang: Lang; status?: string }) {
  if (!status) {
    return (
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 items-center justify-center h-10 w-10 bg-blue-100 rounded-full text-blue-600 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">
              {pick(lang, 'প্রোফাইল সেটআপ সম্পন্ন করুন', 'Complete Your Setup')}
            </h3>
            <p className="text-sm text-blue-700 mt-1 max-w-2xl">
              {pick(
                lang,
                'সমস্ত ইউনিয়ন পরিষেবা আনলক করতে আপনাকে আপনার প্রোফাইল সম্পূর্ণ করতে হবে। নিশ্চিত করুন আপনার ঠিকানা এবং এনআইডি তথ্য যাচাইকৃত।',
                'You need to complete your profile structure to unlock all union services natively. Ensure your address and NID info is verified to proceed.',
              )}
            </p>
          </div>
        </div>
        <Link
          href="/citizens/profile"
          className="shrink-0 text-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        >
          {pick(lang, 'প্রোফাইল সেটআপ করুন →', 'Setup Profile →')}
        </Link>
      </div>
    )
  }

  if (status !== 'pending') return null

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex shrink-0 items-center justify-center h-10 w-10 bg-amber-100 rounded-full text-amber-600 sm:mt-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-bold text-amber-900">
          {pick(lang, 'প্রোফাইল পর্যালোচনার অধীনে আছে', 'Profile Under Review')}
        </h3>
        <p className="text-sm text-amber-800 mt-0.5 max-w-2xl">
          {pick(
            lang,
            'আপনার জমাকৃত প্রোফাইল ইউনিয়ন অনুমোদনের অপেক্ষায় রয়েছে। আপনার যাচাইকরণ সম্পন্ন হওয়ার সাথে সাথে আপনি আবেদন শুরু করতে পারবেন।',
            'Your submitted profile is waiting for union approval. You can start applying right after your verification is complete.',
          )}
        </p>
      </div>
    </div>
  )
}

type TileTone = 'amber' | 'emerald' | 'teal' | 'rose'

const TILE_TONES: Record<TileTone, { card: string; label: string; value: string }> = {
  amber: {
    card: 'border-amber-100 from-white to-amber-50',
    label: 'text-amber-600/70',
    value: 'text-amber-700',
  },
  emerald: {
    card: 'border-emerald-100 from-white to-emerald-50',
    label: 'text-emerald-600/70',
    value: 'text-emerald-700',
  },
  teal: {
    card: 'border-teal-100 from-white to-teal-50',
    label: 'text-teal-600/70',
    value: 'text-teal-700',
  },
  rose: {
    card: 'border-rose-100 from-white to-rose-50',
    label: 'text-rose-600/70',
    value: 'text-rose-700',
  },
}

function Tile({
  tone,
  emoji,
  label,
  value,
  href,
  children,
}: {
  tone: TileTone
  emoji: string
  label: string
  value: string | number
  /** Omitted for a tile that is not a link. */
  href?: string
  children?: React.ReactNode
}) {
  const theme = TILE_TONES[tone]
  const className = `group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${theme.card}`

  const body = (
    <>
      <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] transition-transform duration-500 group-hover:scale-125">
        {emoji}
      </div>
      <p className={`text-xs font-bold uppercase tracking-wider ${theme.label}`}>{label}</p>
      <p className={`mt-3 text-4xl font-black tracking-tight ${theme.value}`}>{value}</p>
      {children}
    </>
  )

  return href ? (
    <Link href={href} className={`${className} block`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function ServiceCard({
  href,
  tone,
  icon,
  title,
  description,
  cta,
}: {
  href: string
  tone: 'emerald' | 'purple' | 'orange'
  icon: React.ReactNode
  title: string
  description: string
  cta: string
}) {
  const theme = {
    emerald: {
      border: 'hover:border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
      title: 'group-hover:text-emerald-700',
      cta: 'text-emerald-600',
    },
    purple: {
      border: 'hover:border-purple-200',
      badge: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600',
      title: 'group-hover:text-purple-700',
      cta: 'text-purple-600',
    },
    orange: {
      border: 'hover:border-orange-200',
      badge: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600',
      title: 'group-hover:text-orange-700',
      cta: 'text-orange-600',
    },
  }[tone]

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${theme.border}`}
    >
      <div
        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 transform group-hover:rotate-3 group-hover:text-white shadow-sm group-hover:shadow-md ${theme.badge}`}
      >
        {icon}
      </div>
      <h4 className={`text-base font-bold text-gray-900 transition-colors ${theme.title}`}>{title}</h4>
      <p className="mt-2 text-xs font-medium text-gray-500 leading-relaxed max-w-xs">{description}</p>
      <div
        className={`mt-auto pt-4 flex items-center text-xs font-bold invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all ${theme.cta}`}
      >
        {cta}
      </div>
    </Link>
  )
}

const CERTIFICATE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const FAMILY_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const TAX_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function CitizenDashboard({
  stats,
  lang,
  name,
}: {
  stats: DashboardStats
  lang: Lang
  name: string
}) {
  return (
    <>
      <WelcomeBanner lang={lang} name={name} />
      <ProfileNotice lang={lang} status={stats.citizen_status} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Tile
          tone="amber"
          emoji="📜"
          href="/certificates"
          label={pick(lang, 'আমার সার্টিফিকেটসমূহ', 'My Certificates')}
          value={stats.certificates.total}
        >
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700/80 bg-amber-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-amber-200/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {stats.certificates.pending} {pick(lang, 'অপেক্ষমাণ', 'pending')}
          </div>
        </Tile>

        <Tile
          tone="emerald"
          emoji="✅"
          href="/certificates"
          label={pick(lang, 'অনুমোদিত ও প্রস্তুত', 'Approved & Ready')}
          value={stats.certificates.approved}
        >
          <div className="mt-4 text-xs font-bold text-emerald-700/80 bg-emerald-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-emerald-200/50">
            {pick(lang, 'যাচাইকৃত নথিপত্র', 'Verified Documents')}
          </div>
        </Tile>

        <Tile
          tone="teal"
          emoji="🏛"
          href="/tax"
          label={pick(lang, 'পরিশোধিত ট্যাক্স', 'Taxes Settled')}
          value={`৳ ${stats.tax.paid.toLocaleString()}`}
        >
          <div className="mt-4 text-xs font-bold text-teal-700/80 bg-teal-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-teal-200/50 mb-0.5">
            {pick(lang, 'চলতি অর্থবছর', 'Current Fiscal Year')}
          </div>
        </Tile>

        <Tile
          tone="rose"
          emoji="⚠️"
          label={pick(lang, 'বকেয়া ট্যাক্স', 'Taxes Unpaid')}
          value={`৳ ${stats.tax.unpaid.toLocaleString()}`}
        >
          {stats.tax.unpaid > 0 ? (
            <div className="mt-4">
              <Link
                href="/tax"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 underline decoration-rose-200/50 underline-offset-4 decoration-2"
              >
                {pick(lang, 'পরিশোধ করুন ', 'Pay Now ')}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-xs font-bold text-rose-700/80 bg-rose-100/60 w-fit px-2.5 py-1.5 rounded-lg border border-rose-200/50 mb-0.5">
              {pick(lang, 'সব ক্লিয়ার', 'All Clear')}
            </div>
          )}
        </Tile>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          {pick(lang, 'আপনার দ্রুত সেবাসমূহ', 'Your Quick Services')}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ServiceCard
          href="/certificates"
          tone="emerald"
          icon={CERTIFICATE_ICON}
          title={pick(lang, 'ডিজিটাল সার্টিফিকেটসমূহ', 'Digital Certificates')}
          description={pick(
            lang,
            'ইউনিয়ন পোর্টালের মাধ্যমে নিরাপদে নাগরিকত্ব, চারিত্রিক বা ট্রেড লাইসেন্স সার্টিফিকেটের জন্য আবেদন করুন।',
            'Apply for citizenship, character, or trade license certificates securely through your union portal.',
          )}
          cta={pick(lang, 'আবেদন করুন →', 'Apply Now →')}
        />
        <ServiceCard
          href="/warish"
          tone="purple"
          icon={FAMILY_ICON}
          title={pick(lang, 'ওয়ারিশ ও পরিবার', 'Warish & Family')}
          description={pick(
            lang,
            'অনলাইনে সহজেই ওয়ারিশ বা পারিবারিক সনদের জন্য আবেদন করুন।',
            'Request structured verified inheritance (Warish) or family certificates easily online.',
          )}
          cta={pick(lang, 'আবেদন করুন →', 'Request →')}
        />
        <ServiceCard
          href="/tax"
          tone="orange"
          icon={TAX_ICON}
          title={pick(lang, 'হোল্ডিং ট্যাক্স', 'Holding Taxes')}
          description={pick(
            lang,
            'স্বয়ংক্রিয় এবং স্বচ্ছ পেমেন্ট রেকর্ডের মাধ্যমে আপনার হোল্ডিং অ্যাসেসমেন্ট ট্র্যাক এবং পূরণ করুন।',
            'Track and fulfill your holding assessments with automated transparent payment records.',
          )}
          cta={pick(lang, 'ট্যাক্স দেখুন →', 'View Taxes →')}
        />
      </div>
    </>
  )
}
