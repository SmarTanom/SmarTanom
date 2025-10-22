import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStatus as useGlobalAuthStatus } from '../../contexts/AuthContext.jsx';
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
  const location = useLocation();
  const { loading, isAuthenticated, user } = useGlobalAuthStatus();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="protected-route-spinner" />
      </div>
    );
  }

  // Redirect authenticated users
  if (isAuthenticated) {
    // Check if there's a redirect destination in state (from ProtectedRoute)
    const from = location.state?.from;
    // If no explicit "from" path, route admins to /admin by default
    const isAdmin = user?.is_admin === true || user?.is_staff === true || user?.role === 'admin';
    const destination = from || (isAdmin ? '/admin' : redirectTo);
    return <Navigate to={destination} replace />;
  }

  // Render public content for non-authenticated users
  return children;
}

export default PublicRoute;
