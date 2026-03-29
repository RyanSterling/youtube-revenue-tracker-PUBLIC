import { useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function useApi() {
  const { getToken } = useAuth()

  const fetchApi = useCallback(async function<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()

    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `API error: ${res.status}`)
    }

    return res.json()
  }, [getToken])

  return { fetchApi }
}
