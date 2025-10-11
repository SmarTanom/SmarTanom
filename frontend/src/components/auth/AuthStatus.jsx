import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Shield } from 'lucide-react';
import './auth.css';

/**
 * AuthStatus component that displays current authentication state
 * Can be used in navigation bars, headers, or anywhere auth info is needed
 */
export function AuthStatus({ className = '', showUserInfo = true, showLogoutButton = true }) {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even on error
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className={`auth-status loading ${className}`}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`auth-status not-authenticated ${className}`}>
        <button
          onClick={() => navigate('/')}
          className="auth-login-btn"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className={`auth-status authenticated ${className}`}>
      {showUserInfo && user && (
        <div className="auth-user-info">
          <User size={16} />
          <span className="auth-username">
            {user.username || user.email || 'User'}
          </span>
          {user.is_admin && (
            <Shield size={14} className="auth-admin-badge" title="Administrator" />
          )}
        </div>
      )}

      {showLogoutButton && (
        <button
          onClick={handleLogout}
          className="auth-logout-btn"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Simple hook to get authentication status for conditional rendering
 */
export function useIsAuthenticated() {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading };
}

/**
 * Higher-order component that only renders children if user is authenticated
 */
export function AuthenticatedOnly({ children, fallback = null }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // or loading spinner
  }

  return isAuthenticated ? children : fallback;
}

/**
 * Higher-order component that only renders children if user is not authenticated
 */
export function UnauthenticatedOnly({ children, fallback = null }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // or loading spinner
  }

  return !isAuthenticated ? children : fallback;
}

/**
 * Higher-order component that only renders children if user is admin
 */
export function AdminOnly({ children, fallback = null }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return null; // or loading spinner
  }

  const isAdmin = isAuthenticated && (user?.is_admin || user?.is_staff);
  return isAdmin ? children : fallback;
}

export default AuthStatus;
