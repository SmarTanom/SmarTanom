import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import './auth.css';

/**
 * ProtectedRoute component that ensures users are authenticated before accessing protected content
 *
 * Features:
 * - Checks for auth token in localStorage
 * - Validates token with backend
 * - Shows loading state during validation
 * - Redirects to landing page if not authenticated
 * - Preserves the intended destination for redirect after login
 */
export function ProtectedRoute({ children, requireAdmin = false }) {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          if (mounted) {
            setAuthState({
              loading: false,
              isAuthenticated: false,
              user: null,
              error: null
            });
          }
          return;
        }

        // Validate token with backend
        const profile = await authApi.getProfile(token);

        if (mounted) {
          setAuthState({
            loading: false,
            isAuthenticated: true,
            user: profile,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);

        // Clear invalid token
        localStorage.removeItem('authToken');

        if (mounted) {
          setAuthState({
            loading: false,
            isAuthenticated: false,
            user: null,
            error: error.message
          });
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Show loading spinner while checking authentication
  if (authState.loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner" />
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!authState.isAuthenticated) {
    // Store current location for redirect after login
    const redirectTo = location.pathname !== '/' ? location.pathname + location.search : '/dashboard';
    return <Navigate to="/" state={{ from: redirectTo }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && !authState.user?.is_admin && !authState.user?.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content
  return children;
}

/**
 * Hook to get current authentication state
 */
export function useAuthStatus() {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          if (mounted) {
            setAuthState({
              loading: false,
              isAuthenticated: false,
              user: null,
              error: null
            });
          }
          return;
        }

        const profile = await authApi.getProfile(token);

        if (mounted) {
          setAuthState({
            loading: false,
            isAuthenticated: true,
            user: profile,
            error: null
          });
        }
      } catch (error) {
        localStorage.removeItem('authToken');

        if (mounted) {
          setAuthState({
            loading: false,
            isAuthenticated: false,
            user: null,
            error: error.message
          });
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return authState;
}

/**
 * Higher-order component for protecting routes
 */
export function withAuthProtection(Component, options = {}) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute requireAdmin={options.requireAdmin}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
