import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, AlertCircle, User, Plus, LogOut, Bell } from 'lucide-react';
import '../../assets/styles/UserLayout.css';
import { useRealtimeStore } from '../../store/realtimeStore';
import { useAuth } from '../../contexts/AuthContext';
import logoMarkWhite from '../../assets/images/logo-mark-white.png';

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const totalUnread = useRealtimeStore(s => s.totalUnread);
  const deviceAlerts = useRealtimeStore(s => s.deviceAlerts);
  const devices = useRealtimeStore(s => s.devices);
  const fetchInitial = useRealtimeStore(s => s.fetchInitial);
  const fetchAlerts = useRealtimeStore(s => s.fetchAlerts);
  const wsStatus = useRealtimeStore(s => s.wsStatus);
  const connectWS = useRealtimeStore(s => s.connectWS);
  const { user, logout } = useAuth();

  // Show username in sidebar (fallback to email); stop using full_name/firstName
  const displayName = user?.username || user?.email || 'User';
  const userEmail = user?.email || '';

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/');
    }
  };

  // Ensure unread counts reflect the latest data even outside Alerts page
  useEffect(() => {
    // Hydrate devices/alerts if needed
    const hasDevices = Array.isArray(devices) && devices.length > 0;
    if (!hasDevices) {
      try { fetchInitial(); } catch (_) {}
    }
    // Always try a light refresh of alerts on layout mount
    try { fetchAlerts(); } catch (_) {}

    // Connect WS for realtime updates; clean up on unmount
    const cleanup = typeof connectWS === 'function' ? connectWS() : undefined;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        try { fetchAlerts(); } catch (_) {}
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive a reliable unread count: prefer store totalUnread, fallback to summing deviceAlerts
  const sidebarUnread = useMemo(() => {
    const t = Number(totalUnread || 0);
    if (t > 0) return t;
    // Fallback: compute from deviceAlerts to avoid zero badge when alerts are loaded but counters lag
    try {
      let sum = 0;
      if (deviceAlerts && typeof deviceAlerts === 'object') {
        Object.values(deviceAlerts).forEach(arr => {
          if (Array.isArray(arr)) {
            sum += arr.filter(a => !a?.is_read).length;
          }
        });
      }
      return sum;
    } catch (_e) {
      return t;
    }
  }, [totalUnread, deviceAlerts]);

  return (
    <div className="user-layout-root">
      {/* Fixed Side Navigation (Desktop/Tablet Landscape) */}
      <aside className="user-sidebar">
        {/* Brand Section */}
        <div className="user-brand">
          <div className="user-brand-logo">
            <img src={logoMarkWhite} alt="SmarTanom" />
          </div>
          <div className="user-brand-text">
            <h1 className="user-brand-name">SMARTANOM</h1>
            <p className="user-brand-subtitle">User Dashboard</p>
          </div>
        </div>

        {/* Navigation Label */}
        <div className="user-side-nav-label">MENU</div>

        {/* Navigation Links */}
        <nav className="user-side-nav" aria-label="Main navigation">
          <button
            className={`user-side-link ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
            aria-current={isActive('/dashboard') ? 'page' : undefined}
          >
            <Leaf size={18} strokeWidth={2.5} />
            <span>Dashboard</span>
          </button>

          <button
            className="user-side-link"
            onClick={() => navigate('/add-device/setup')}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add New Device</span>
          </button>

          <button
            className={`user-side-link ${isActive('/alerts') ? 'active' : ''}`}
            onClick={() => navigate('/alerts')}
            aria-current={isActive('/alerts') ? 'page' : undefined}
            style={{ position: 'relative' }}
          >
            <Bell size={18} strokeWidth={2.5} />
            <span>Alerts</span>
            <span className="user-nav-badge">
              {sidebarUnread > 9 ? '9+' : String(sidebarUnread ?? 0)}
            </span>
          </button>

          <button
            className={`user-side-link ${isActive('/profile') ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
            aria-current={isActive('/profile') ? 'page' : undefined}
          >
            <User size={18} strokeWidth={2.5} />
            <span>Profile</span>
          </button>
          {/* Admin shortcut (visible only if user has admin/staff role) */}
          {(user?.role === 'admin' || user?.is_admin || user?.is_staff) && (
            <button
              className={`user-side-link ${isActive('/admin') ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              <Leaf size={18} strokeWidth={2.5} />
              <span>Admin Dashboard</span>
            </button>
          )}
        </nav>

        {/* User Section (Bottom) */}
        <div className="user-sidebar-footer">
          <div className="user-info-section">
            <div className="user-avatar-circle">
              <User size={20} strokeWidth={2.5} />
            </div>
            <div className="user-info-text">
              <p className="user-info-name">{displayName}</p>
              <p className="user-info-email">{userEmail}</p>
            </div>
          </div>

          <button className="user-logout-btn" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={2.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="user-main-content">
        {children}
      </main>

      {/* Mobile Bottom Navigation (remains unchanged) */}
      <nav className="user-bottom-nav" aria-label="Primary">
        <button
          className={`user-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          aria-current={isActive('/dashboard') ? 'page' : undefined}
        >
          <Leaf size={20} />
          <span>Tanom</span>
        </button>

        <button
          className={`user-nav-item ${isActive('/alerts') ? 'active' : ''}`}
          onClick={() => navigate('/alerts')}
          aria-current={isActive('/alerts') ? 'page' : undefined}
          style={{ position: 'relative' }}
        >
          <AlertCircle size={20} />
          {sidebarUnread > 0 && (
            <span className="user-nav-notification-badge">
              {sidebarUnread > 9 ? '9+' : String(sidebarUnread)}
            </span>
          )}
          <span>Alerts</span>
        </button>

        <button
          className={`user-nav-item ${isActive('/profile') ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
          aria-current={isActive('/profile') ? 'page' : undefined}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
        {(user?.role === 'admin' || user?.is_admin || user?.is_staff) && (
          <button
            className={`user-nav-item ${isActive('/admin') ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
            aria-current={isActive('/admin') ? 'page' : undefined}
          >
            <Leaf size={20} />
            <span>Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
}
