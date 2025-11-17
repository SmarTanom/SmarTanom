import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Users,
  Bell,
  Settings,
  Plus,
  Leaf,
  LogOut
} from 'lucide-react';
import logoMarkWhite from '../../assets/images/logo-mark-white.png';
import '../../assets/styles/AdminLayout.css';

// Unified Admin navigation: renders the left sidebar on desktop and a bottom
// nav on mobile. Styles are defined in AdminLayout.css.
const AdminNavbar = () => {
  const navigate = useNavigate();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/devices', icon: Boxes, label: 'Devices' },
    { path: '/admin/create', icon: Plus, label: 'Create' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/alerts', icon: Bell, label: 'Alerts' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' }
  ];

  // Active state: root '/admin' must match exactly; others match exact or nested
  const isActive = (path) => {
    if (path === '/admin') return currentPath === '/admin';
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
    } catch (e) {}
    navigate('/login');
    window.location.reload();
  };

  return (
    <>
      {/* Desktop/Tablet sidebar */}
      <aside className="admin-sidebar" aria-label="Admin sidebar">
        <div className="brand">
          <div className="brand-logo">
            <img src={logoMarkWhite} alt="SmarTanom" />
          </div>
          <div className="brand-text">
            <div className="brand-name">SmarTanom</div>
            <div className="brand-subtitle">Dashboard</div>
          </div>
        </div>

        <div className="side-nav-label">MENU</div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAlerts = item.path === '/admin/alerts';
            return (
              <React.Fragment key={item.path}>
                <button
                  className={`side-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
                {isAlerts && (
                  <button
                    className={`side-link ${isActive('/dashboard') ? 'active' : ''}`}
                    onClick={() => {
                      setPendingPath('/dashboard');
                      setConfirmOpen(true);
                    }}
                  >
                    <Leaf size={18} />
                    <span>User Dashboard</span>
                  </button>
                )}
              </React.Fragment>
            );
          })}
          {/* Logout action */}
          <button className="side-link" onClick={() => setLogoutConfirmOpen(true)}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="system-status">
          <span className="status-dot online" />
          <div>
            <div className="status-title">System Online</div>
            <div className="status-sub">All services operational</div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="admin-bottom-nav" aria-label="Admin navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`bn-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Confirm switch modal */}
      {confirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h3>Switch to User Dashboard?</h3>
            <p>
              You are about to leave the Admin area and open the User Dashboard. This may change available features and
              filters. Do you want to continue?
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button
                className="confirm-btn confirm-primary"
                onClick={() => {
                  const target = pendingPath || '/dashboard';
                  setConfirmOpen(false);
                  navigate(target);
                }}
              >
                Yes, switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {logoutConfirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h3>Sign out</h3>
            <p>Are you sure you want to sign out? You can sign back in anytime using your email.</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-secondary" onClick={() => setLogoutConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="confirm-btn confirm-primary"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  handleLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNavbar;
