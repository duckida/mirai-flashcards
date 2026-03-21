import { useCallback } from 'react'
import { useUser } from '@civic/auth/react'
import { authService } from '../services/authService'

export default function useAuth() {
  const { user, signIn, signOut, isLoading } = useUser()

  const logout = useCallback(async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }, [signOut])

  const updatePreferences = useCallback(async (preferences) => {
    try {
      return await authService.updatePreferences(preferences)
    } catch (err) {
      console.error('Update preferences error:', err)
      throw err
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error: null,
    login: signIn,
    logout,
    updatePreferences,
  }
}
