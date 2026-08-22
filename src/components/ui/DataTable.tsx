'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A table row.
 *
 * `any` here is deliberate and scoped to this file. DataTable is intentionally
 * schema-agnostic — it renders whatever list it is handed — so at this boundary
 * the cell value genuinely has no static type. Typing it `unknown` instead
 * pushes a cast into all ~145 render callbacks across 13 pages, and those casts
 * are unchecked, so nothing is actually verified: it trades real noise for
 * imaginary safety.
 *
 * Callers that want real checking pass a row type: `Column<Citizen>[]` types
 * `row` exactly, and that is the direction new code should go.
 */
export type Row = Record<string, any>

export interface Column<T = Row> {
  key: string
  label: string
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T = Row> {
  columns: Column<T>[]
  data: T[]
  loading: boolean
  emptyMessage?: string
}

export default function DataTable<T = Row>({
  columns,
  data,
  loading,
  emptyMessage,
}: DataTableProps<T>) {
  const { t } = useLanguage()
  const empty = emptyMessage ?? t('noData')

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                {empty}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              // T is unconstrained so callers can pass their own interfaces
              // (which lack an index signature). Column lookup is by string
              // key, so indexing happens through Row here.
              const cells = row as Row
              return (
                <tr key={cells._id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {col.render ? col.render(cells[col.key], row) : (cells[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
