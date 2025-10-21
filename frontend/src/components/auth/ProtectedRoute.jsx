import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStatus as useGlobalAuthStatus } from '../../contexts/AuthContext.jsx';
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
  const location = useLocation();
  // Use global AuthContext to avoid duplicate profile calls per page
  const { loading, isAuthenticated, user } = useGlobalAuthStatus();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner" />
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!isAuthenticated) {
    // Store current location for redirect after login
    const redirectTo = location.pathname !== '/' ? location.pathname + location.search : '/dashboard';
    return <Navigate to="/" state={{ from: redirectTo }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && !user?.is_admin && !user?.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content
  return children;
}

/**
 * Hook to get current authentication state
 */
export function useAuthStatus() {
  // Backward-compatible hook export that now proxies to global AuthContext
  return useGlobalAuthStatus();
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
