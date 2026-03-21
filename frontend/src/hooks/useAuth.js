import { useState, useEffect, useCallback } from 'react'
import { useCivicAuth } from '@civic/auth'
import { authService } from '../services/authService'

export default function useAuth() {
  const civicAuth = useCivicAuth()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (civicAuth.isLoading) {
      setIsLoading(true)
      return
    }

    if (civicAuth.user) {
      const userData = {
        id: civicAuth.user.id,
        email: civicAuth.user.email,
        name: civicAuth.user.name,
        picture: civicAuth.user.picture,
      }
      authService.setUser(userData)
      setUser(userData)
    } else {
      authService.clearUser()
      setUser(null)
    }
    setIsLoading(false)
  }, [civicAuth.isLoading, civicAuth.user])

  const login = useCallback(() => civicAuth.signIn(), [civicAuth])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await civicAuth.signOut()
    } catch (err) {
      setError(err.message)
    }
  }, [civicAuth])

  const updatePreferences = useCallback(async (preferences) => {
    setError(null)
    try {
      return await authService.updatePreferences(preferences)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  return {
    user,
    isLoading: isLoading || civicAuth.isLoading,
    isAuthenticated: !!civicAuth.user,
    error,
    login,
    logout,
    updatePreferences,
  }
}
