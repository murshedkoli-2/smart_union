'use client'

import { useEffect, useState, useCallback } from 'react'
import { refreshAccessToken } from '@/lib/utils/api-client'

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
      const token =
        typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null

      const doFetch = (t: string | null) =>
        fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          credentials: 'include',
        })

      try {
        let res = await doFetch(token)

        // On 401: silently refresh token and retry once
        if (res.status === 401 && typeof window !== 'undefined') {
          const newToken = await refreshAccessToken()
          if (newToken) {
            res = await doFetch(newToken)
          } else {
            // Refresh failed — redirect to login
            sessionStorage.clear()
            document.cookie = 'access_token=; max-age=0; path=/'
            window.location.href = '/login'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, url, depsKey])

  return { data, loading, error, refetch, pagination }
}
