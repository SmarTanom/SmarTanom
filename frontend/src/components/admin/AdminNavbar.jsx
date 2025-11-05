import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Users,
  Bell,
  Settings,
  Plus
} from 'lucide-react';
import logoMarkWhite from '../../assets/images/logo-mark-white.png';

// Unified Admin navigation: renders the left sidebar on desktop and a bottom
// nav on mobile. Styles are defined in AdminLayout.css.
const AdminNavbar = () => {
  const navigate = useNavigate();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

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
            return (
              <button
                key={item.path}
                className={`side-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
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
    </>
  );
};

export default AdminNavbar;
