import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/apiClient.js';

const AuthContext = createContext(null);

/**
 * Enhanced AuthProvider that manages global authentication state
 *
 * Features:
 * - Provides authentication state throughout the app
 * - Handles login/logout operations
 * - Automatically checks token validity on app start
 * - Provides methods for authentication operations
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    user: null,
    token: null,
    error: null
  });

  // Initialize auth state on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setAuthState({
          loading: false,
          isAuthenticated: false,
          user: null,
          token: null,
          error: null
        });
        return;
      }

      // Validate token with backend
      const profile = await authApi.getProfile(token);

      setAuthState({
        loading: false,
        isAuthenticated: true,
        user: profile,
        token,
        error: null
      });
    } catch (error) {
      console.error('Auth status check failed:', error);

      // Clear invalid token
      localStorage.removeItem('authToken');

      setAuthState({
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: error.message
      });
    }
  };

  const login = async (token, user) => {
    try {
      // Store token
      localStorage.setItem('authToken', token);

      // If user data not provided, fetch it
      let userData = user;
      if (!userData && token) {
        userData = await authApi.getProfile(token);
      }

      setAuthState({
        loading: false,
        isAuthenticated: true,
        user: userData,
        token,
        error: null
      });

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);

      // Clear invalid token
      localStorage.removeItem('authToken');

      setAuthState(prev => ({
        ...prev,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: error.message
      }));

      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const token = authState.token || localStorage.getItem('authToken');

      if (token) {
        // Attempt to notify backend of logout
        try {
          await authApi.logout(token);
        } catch (error) {
          // Continue with logout even if backend call fails
          console.warn('Backend logout failed:', error);
        }
      }

      // Clear local state
      localStorage.removeItem('authToken');

      setAuthState({
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      });

      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);

      // Force clear state even on error
      localStorage.removeItem('authToken');

      setAuthState({
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      });

      return { success: false, error: error.message };
    }
  };

  const updateUser = (userData) => {
    setAuthState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
  };

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: null
    }));
  };

  const value = {
    ...authState,
    login,
    logout,
    updateUser,
    clearError,
    checkAuthStatus,
    refreshAuth: checkAuthStatus // alias for convenience
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook to get authentication status (loading, isAuthenticated, user)
 */
export function useAuthStatus() {
  const { loading, isAuthenticated, user, error } = useAuth();
  return { loading, isAuthenticated, user, error };
}

/**
 * Hook for authentication operations (login, logout)
 */
export function useAuthActions() {
  const { login, logout, updateUser, clearError, refreshAuth } = useAuth();
  return { login, logout, updateUser, clearError, refreshAuth };
}

export default AuthProvider;
