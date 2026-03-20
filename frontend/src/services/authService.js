/**
 * Authentication Service (Frontend)
 *
 * Handles authentication state and communicates with the backend auth API.
 */

const apiClient = require('./apiClient');

class AuthService {
  constructor() {
    this._user = null;
    this._isLoading = false;
    this._listeners = [];
  }

  get user() {
    return this._user;
  }

  get isLoading() {
    return this._isLoading;
  }

  get isAuthenticated() {
    return this._user !== null;
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  _notify() {
    this._listeners.forEach((listener) =>
      listener({
        user: this._user,
        isLoading: this._isLoading,
        isAuthenticated: this.isAuthenticated,
      })
    );
  }

  setLoading(isLoading) {
    this._isLoading = isLoading;
    this._notify();
  }

  async checkSession() {
    try {
      this.setLoading(true);
      const response = await apiClient.get('/api/user');
      this._user = response.user || null;
      this._notify();
      return this._user;
    } catch (error) {
      this._user = null;
      this._notify();
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  initiateLogin() {
    window.location.href = `${apiClient.baseUrl}/api/auth/login`;
  }

  async logout() {
    try {
      this.setLoading(true);
      await apiClient.post('/api/auth/logout', {});
      this._user = null;
      this._notify();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await apiClient.patch('/api/user', { preferences });
      this._user = response.user;
      this._notify();
      return this._user;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  setUser(user) {
    this._user = user;
    this._notify();
  }

  clearUser() {
    this._user = null;
    this._notify();
  }
}

const authService = new AuthService();

module.exports = authService;
module.exports.AuthService = AuthService;
