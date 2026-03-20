/**
 * useAuth Hook
 *
 * React hook for authentication state management.
 * Provides user info, loading state, and auth actions.
 */

const { useState, useEffect, useCallback } = require('react');
const authService = require('../services/authService');

function useAuth() {
  const [user, setUser] = useState(authService.user);
  const [isLoading, setIsLoading] = useState(authService.isLoading);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(({ user, isLoading }) => {
      setUser(user);
      setIsLoading(isLoading);
    });

    authService.checkSession();

    return unsubscribe;
  }, []);

  const login = useCallback(() => {
    setError(null);
    authService.initiateLogin();
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const updatePreferences = useCallback(async (preferences) => {
    setError(null);
    try {
      return await authService.updatePreferences(preferences);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    login,
    logout,
    updatePreferences,
  };
}

module.exports = useAuth;
