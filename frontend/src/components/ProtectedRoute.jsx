import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication and/or specific roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.requiredRole - Required role ('admin' or 'user'). If not specified, any authenticated user can access.
 * @param {string} props.redirectTo - Custom redirect path (default: '/')
 */
export default function ProtectedRoute({ children, requiredRole, redirectTo = '/' }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #016b22 0%, #013d13 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '14px', opacity: 0.9 }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated - redirect to landing page
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    // Admin-only route
    if (requiredRole === 'admin' && !isAdmin) {
      // Regular user trying to access admin route - redirect to user dashboard
      return <Navigate to="/dashboard" replace />;
    }

    // User-only route (prevent admin from accessing if needed)
    if (requiredRole === 'user' && isAdmin) {
      // Admin trying to access user-only route - redirect to admin dashboard
      return <Navigate to="/admin" replace />;
    }
  }

  // Authorized - render children
  return <>{children}</>;
}
