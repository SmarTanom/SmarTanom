import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../../services/apiClient';
import './auth.css';

/**
 * PublicRoute component for pages that should only be accessible to non-authenticated users
 * (like login, signup, landing pages)
 *
 * Features:
 * - Redirects authenticated users to dashboard or intended destination
 * - Shows loading state during auth check
 * - Handles redirect destination from state
 */
export function PublicRoute({ children, redirectTo = '/dashboard' }) {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    user: null
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
              user: null
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
            user: profile
          });
        }
      } catch (error) {
        // Clear invalid token
        localStorage.removeItem('authToken');

        if (mounted) {
          setAuthState({
            loading: false,
            isAuthenticated: false,
            user: null
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

  // Redirect authenticated users
  if (authState.isAuthenticated) {
    // Check if there's a redirect destination in state (from ProtectedRoute)
    const from = location.state?.from;
    const destination = from || redirectTo;
    return <Navigate to={destination} replace />;
  }

  // Render public content for non-authenticated users
  return children;
}

export default PublicRoute;
