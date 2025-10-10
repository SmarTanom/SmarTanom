import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AlertsPage.css';
import {
  Leaf,
  AlertCircle,
  User,
  TriangleAlert,
  Droplets,
  Zap,
  Thermometer,
  Sprout,
  ChevronRight,
  Filter,
  Bell
} from 'lucide-react';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Mock alerts data
const mockAlerts = [
  {
    id: 1,
    type: 'critical',
    icon: 'droplet',
    title: 'Low water levels',
    device: 'Porch SmarTanom',
    deviceId: 'D000000001',
    message: 'Low water level detected. Refill reservoir with fresh water immediately.',
    timestamp: '2 minutes ago',
    date: '2025-10-10T14:30:00',
    read: false
  },
  {
    id: 2,
    type: 'warning',
    icon: 'zap',
    title: 'Inadequate nutrients',
    device: 'Greenhouse A',
    deviceId: 'D000000002',
    message: 'EC is low (10 mS/cm). Refill: Part A (Calcium Nitrate) and Part B (Micronutrient mix).',
    timestamp: '15 minutes ago',
    date: '2025-10-10T14:17:00',
    read: false
  },
  {
    id: 3,
    type: 'info',
    icon: 'sprout',
    title: 'Ready for harvest',
    device: 'Indoor Rack',
    deviceId: 'D000000003',
    message: 'Your plants are now ready for harvest. Harvest now to start a new cycle.',
    timestamp: '1 hour ago',
    date: '2025-10-10T13:32:00',
    read: false
  },
  {
    id: 4,
    type: 'warning',
    icon: 'thermometer',
    title: 'High temperature detected',
    device: 'Greenhouse A',
    deviceId: 'D000000002',
    message: 'Temperature is above optimal range (32°C). Check ventilation system.',
    timestamp: '2 hours ago',
    date: '2025-10-10T12:32:00',
    read: true
  },
  {
    id: 5,
    type: 'critical',
    icon: 'zap',
    title: 'Nutrient solution depleted',
    device: 'Porch SmarTanom',
    deviceId: 'D000000001',
    message: 'EC reading critically low. Immediate refill required to prevent plant stress.',
    timestamp: '3 hours ago',
    date: '2025-10-10T11:32:00',
    read: true
  },
  {
    id: 6,
    type: 'info',
    icon: 'sprout',
    title: 'New cycle started',
    device: 'Indoor Rack',
    deviceId: 'D000000003',
    message: 'You started a new growing cycle. Monitor plant progress over the next few days.',
    timestamp: '5 hours ago',
    date: '2025-10-10T09:32:00',
    read: true
  }
];

export default function AlertsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  const [alerts, setAlerts] = useState(mockAlerts);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.type === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const handleAlertClick = (alert) => {
    markAsRead(alert.id);
    navigate(`/device/${alert.deviceId}`);
  };

  const getAlertIcon = (iconType) => {
    switch (iconType) {
      case 'droplet':
        return <Droplets size={20} strokeWidth={2.5} />;
      case 'zap':
        return <Zap size={20} strokeWidth={2.5} />;
      case 'thermometer':
        return <Thermometer size={20} strokeWidth={2.5} />;
      case 'sprout':
        return <Sprout size={20} strokeWidth={2.5} />;
      default:
        return <AlertCircle size={20} strokeWidth={2.5} />;
    }
  };

  return (
    <div className="alerts-page-root">
      {/* Header */}
      <header className="alerts-header">
        <div className="alerts-header-top">
          <h1 className="alerts-header-title">
            Alerts
            <Bell size={28} color="rgba(17, 17, 17, 0.86)" strokeWidth={2.5} />
          </h1>
          {unreadCount > 0 && (
            <span className="alerts-unread-badge">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-read-button" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </header>

      {/* Filter buttons */}
      <div className="alerts-filters">
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-button ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`filter-button ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical
        </button>
      </div>

      {/* Alerts list */}
      <main className="alerts-content">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <AlertCircle size={48} color="#8BA797" strokeWidth={1.5} />
            <h3>No alerts to display</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="alerts-list">
            {filteredAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`alert-item ${alert.type} ${alert.read ? 'read' : 'unread'}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="alert-item-indicator" />
                <div className={`alert-item-icon ${alert.type}`}>
                  {getAlertIcon(alert.icon)}
                </div>
                <div className="alert-item-content">
                  <div className="alert-item-header">
                    <h3 className="alert-item-title">{alert.title}</h3>
                    {!alert.read && <span className="unread-dot" />}
                  </div>
                  <p className="alert-item-device">{alert.device}</p>
                  <p className="alert-item-message">{alert.message}</p>
                  <span className="alert-item-timestamp">{alert.timestamp}</span>
                </div>
                <ChevronRight size={20} color="#8BA797" className="alert-item-chevron" />
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item active" aria-current="page">
          <AlertCircle size={20} />
          <span>Alerts</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
