import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Settings, Users, AlertCircle, Database } from 'lucide-react';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;

  const navItems = [
    { path: '/admin', icon: Home, label: 'Dashboard' },
    { path: '/admin/devices', icon: Database, label: 'Devices' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/alerts', icon: AlertCircle, label: 'Alerts' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="admin-navbar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path;
        
        return (
          <button
            key={item.path}
            className={`admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default AdminNavbar;
