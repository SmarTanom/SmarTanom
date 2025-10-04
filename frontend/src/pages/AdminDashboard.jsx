import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/Dashboard.css';

/**
 * Admin Dashboard
 * Administrative dashboard for managing all users and system-wide settings
 * Only accessible to users with admin role
 */
export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="dashboard-container admin-dashboard">
      <header className="dashboard-header admin-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <h1>SmarTanom Admin</h1>
            <span className="dashboard-role-badge admin-badge">Administrator</span>
          </div>
          <div className="dashboard-user-info">
            <div className="dashboard-user-details">
              <span className="dashboard-username">{user?.username || 'Admin'}</span>
              <span className="dashboard-email">{user?.email}</span>
            </div>
            <button 
              className="dashboard-signout-btn"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <h2>Admin Control Panel</h2>
            <p>Manage users, devices, and system settings.</p>
          </div>

          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <p className="stat-value">—</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Active Devices</h3>
                <p className="stat-value">—</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className="stat-content">
                <h3>System Health</h3>
                <p className="stat-value">—</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Revenue</h3>
                <p className="stat-value">—</p>
              </div>
            </div>
          </div>

          <div className="dashboard-placeholder">
            <div className="placeholder-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m8.66-13a9 9 0 1 1-17.32 0"></path>
                <path d="M3.34 6a9 9 0 0 0 17.32 12"></path>
              </svg>
            </div>
            <h3>Admin Dashboard Content Coming Soon</h3>
            <p>User management, device monitoring, and system analytics will appear here.</p>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 SmarTanom. All rights reserved.</p>
      </footer>
    </div>
  );
}
