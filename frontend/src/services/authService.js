import { apiClient } from './apiClient'

class AuthService {
  constructor() {
    this._user = null
    this._listeners = new Set()
  }

  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    const state = {
      user: this._user,
      isLoading: false,
      isAuthenticated: this._user !== null,
    }
    this._listeners.forEach((fn) => fn(state))
  }

  setUser(user) {
    this._user = user
    this._notify()
  }

  clearUser() {
    this._user = null
    this._notify()
  }

  async checkSession() {
    try {
      const data = await apiClient.get('/api/user')
      this._user = data.user
    } catch {
      this._user = null
    }
    this._notify()
  }

  async updatePreferences(preferences) {
    const data = await apiClient.patch('/api/user', { preferences })
    this._user = data.user
    this._notify()
    return data.user
  }
}

export const authService = new AuthService()
