import { useCallback, useEffect } from 'react'
import { useUser } from '@civic/auth/react'
import { authService } from '../services/authService'

export default function useTheme() {
  const { user } = useUser()

  const applyTheme = useCallback((theme) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [])

  const getTheme = useCallback(() => {
    if (user?.preferences?.theme) {
      return user.preferences.theme
    }
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme) {
      return storedTheme
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }, [user])

  useEffect(() => {
    const theme = getTheme()
    applyTheme(theme)
  }, [getTheme, applyTheme])

  const setTheme = useCallback(async (newTheme) => {
    applyTheme(newTheme)
    if (user) {
      try {
        await authService.updatePreferences({ theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
  }, [applyTheme, user])

  return {
    theme: getTheme(),
    setTheme,
    applyTheme,
  }
}
