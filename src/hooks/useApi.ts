'use client'

import { useEffect, useState, useCallback } from 'react'
import { refreshSession, redirectToLogin } from '@/lib/utils/api-client'

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useApi<T>(
  url: string,
  deps?: unknown[]
): { data: T | null; loading: boolean; error: string | null; refetch: () => void; pagination: PaginationMeta | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [tick, setTick] = useState(0)

  const depsKey = deps ? JSON.stringify(deps) : ''

  const refetch = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      // Auth travels as an httpOnly cookie — nothing to attach by hand.
      const doFetch = () =>
        fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

      try {
        let res = await doFetch()

        // On 401: silently refresh the session and retry once. refreshSession()
        // is deduplicated, so several hooks mounting together issue one refresh.
        if (res.status === 401 && typeof window !== 'undefined') {
          const refreshed = await refreshSession()
          if (refreshed) {
            res = await doFetch()
          } else {
            redirectToLogin()
            return
          }
        }

        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)

        const json = await res.json()
        if (!cancelled) {
          if (json.success === false) {
            setError(json.message ?? 'Request failed')
          } else {
            setData(json.data ?? json)
            if (json.pagination) {
              setPagination(json.pagination)
            }
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError((err as Error).message ?? 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
     
  }, [tick, url, depsKey])

  return { data, loading, error, refetch, pagination }
}
