import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, AlertCircle, User } from 'lucide-react';

/**
 * Bottom navigation used across top-level screens.
 * Props:
 *  - active: 'tanom' | 'alerts' | 'profile'
 *  - totalUnread: number (to show alerts badge)
 *  - className?: string
 */
export default function BottomNav({ active = 'tanom', totalUnread = 0, className = '' }) {
  const navigate = useNavigate();

  const isActive = (key) => active === key;

  return (
    <nav className={`bottom-nav ${className}`.trim()} aria-label="Primary">
      <button
        className={`nav-item ${isActive('tanom') ? 'active' : ''}`.trim()}
        aria-current={isActive('tanom') ? 'page' : undefined}
        onClick={() => navigate('/dashboard')}
      >
        <Leaf size={20} />
        <span>Tanom</span>
      </button>

      <button
        className={`nav-item ${isActive('alerts') ? 'active' : ''}`.trim()}
        aria-current={isActive('alerts') ? 'page' : undefined}
        onClick={() => navigate('/alerts')}
        style={{ position: 'relative' }}
      >
        <AlertCircle size={20} />
        {totalUnread > 0 && (
          <span
            className="nav-notification-badge"
            style={{
              position: 'absolute',
              top: '8px',
              right: '18px',
              backgroundColor: '#e74c3c',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              border: '2px solid white',
              minWidth: '16px',
            }}
          >
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
        <span>Alerts</span>
      </button>

      <button
        className={`nav-item ${isActive('profile') ? 'active' : ''}`.trim()}
        aria-current={isActive('profile') ? 'page' : undefined}
        onClick={() => navigate('/profile')}
      >
        <User size={20} />
        <span>Profile</span>
      </button>
    </nav>
  );
}
