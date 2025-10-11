import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Simple component to test authentication state
 * This can be temporarily added to any page to debug auth issues
 */
export function AuthDebugInfo() {
  const { isAuthenticated, user, loading, error } = useAuth();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Auth Debug Info</h4>
      <div>Loading: {loading ? 'Yes' : 'No'}</div>
      <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
      <div>User: {user ? JSON.stringify(user, null, 2) : 'None'}</div>
      <div>Error: {error || 'None'}</div>
      <div>Token: {localStorage.getItem('authToken') ? 'Present' : 'Missing'}</div>
    </div>
  );
}

export default AuthDebugInfo;
