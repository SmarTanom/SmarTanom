import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const AuthContext = createContext(null);

/**
 * Authentication Context Provider
 * Manages user authentication state, role, and session persistence
 * 
 * User Roles:
 * - 'admin': Admin users with elevated privileges (access AdminDashboard)
 * - 'user': Regular users (access Dashboard)
 * - null: Unauthenticated
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check if user has an active session
   * In production, this would validate with backend API
   */
  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('smartanom_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        // TODO: Validate token with backend API
        // For now, trust localStorage
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('smartanom_user');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in user after successful authentication
   * @param {Object} userData - User data from backend
   * @param {string} userData.email - User email
   * @param {string} userData.username - User username
   * @param {string} userData.role - User role ('admin' or 'user')
   * @param {string} userData.token - Authentication token
   * @param {boolean} userData.isNewUser - Whether user just completed setup
   */
  const signIn = async (userData) => {
    try {
      // Prefer backend-provided role; fallback to simple heuristic in dev
      const role = userData.role || (userData.email?.toLowerCase().includes('admin') ? 'admin' : 'user');

      const user = {
        email: userData.email,
        username: userData.username,
        role,
        token: userData.token || `mock-token-${Date.now()}`,
        isNewUser: userData.isNewUser || false,
        authenticated: true,
      };

      setUser(user);
      localStorage.setItem('smartanom_user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  /**
   * Sign out user and clear session
   */
  const signOut = async () => {
    try {
      // TODO: Call backend logout endpoint
      setUser(null);
      localStorage.removeItem('smartanom_user');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  /**
   * Update user data (e.g., after profile changes)
   */
  const updateUser = (updates) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('smartanom_user', JSON.stringify(updatedUser));
  };

  /**
   * Check if user has admin role
   */
  const isAdmin = useMemo(() => {
    return user?.role === 'admin';
  }, [user]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useMemo(() => {
    return !!user?.authenticated;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      isAdmin,
      signIn,
      signOut,
      updateUser,
    }),
    [user, loading, isAuthenticated, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
