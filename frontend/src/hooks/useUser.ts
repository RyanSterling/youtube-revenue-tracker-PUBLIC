import { useState, useEffect } from 'react'
import { useApi } from './useApi'

interface User {
  id: string
  email: string
  name: string | null
  username: string | null
  plan: string
}

interface UseUserReturn {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setUsername: (username: string) => Promise<{ success: boolean; error?: string }>
}

export function useUser(): UseUserReturn {
  const { fetchApi } = useApi()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchUser() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchApi<{ user: User }>('/users/me')
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  async function setUsername(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await fetchApi<{ user: User }>('/users/username', {
        method: 'PATCH',
        body: JSON.stringify({ username }),
      })
      setUser(data.user)
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to set username'
      return { success: false, error: errorMsg }
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    setUsername,
  }
}
