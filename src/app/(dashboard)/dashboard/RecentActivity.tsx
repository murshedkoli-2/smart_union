'use client'

/** The last few audit-log entries, newest first. */
import Link from 'next/link'
import type { DashboardActivity } from '@/types/dashboard.types'
import type { TranslationKey } from '@/lib/i18n'

type Translate = (key: TranslationKey) => string

const MAX_ENTRIES = 10

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  register: 'bg-blue-100 text-blue-700',
  create: 'bg-purple-100 text-purple-700',
  approve: 'bg-teal-100 text-teal-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
}

/** Actions are dotted paths like "citizen.approve"; match on the verb. */
function ActionBadge({ action }: { action: string }) {
  const key = Object.keys(ACTION_COLORS).find((verb) => action.includes(verb)) ?? 'create'
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ACTION_COLORS[key]}`}>
      {action}
    </span>
  )
}

export function timeAgo(date: string): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function RecentActivity({
  entries,
  t,
}: {
  entries?: DashboardActivity[]
  t: Translate
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{t('recentActivity')}</h3>
        <Link
          href="/admin/audit-logs"
          className="text-xs text-green-700 hover:text-green-800 font-medium"
        >
          View All →
        </Link>
      </div>
      {!entries || entries.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">{t('noActivity')}</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {entries.slice(0, MAX_ENTRIES).map((log) => (
            <li
              key={log._id}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-xs text-gray-500 font-medium">{log.target_model}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    by {log.user_id?.name ?? 'System'}
                    {log.user_id?.role && (
                      <span className="ml-1 text-gray-300">
                        ({log.user_id.role.replace(/_/g, ' ')})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500 font-medium">{timeAgo(log.createdAt)}</p>
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleTimeString('en-BD', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
