import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../assets/styles/AlertsPage.css';
import {
  Leaf,
  AlertCircle,
  User,
  TriangleAlert,
  Droplets,
  Zap,
  Thermometer,
  Waves,
  Sun,
  Sprout,
  ChevronRight,
  Filter,
  Bell,
  CheckCircle,
  X
} from 'lucide-react';

import { useRealtimeStore } from '../store/realtimeStore';

export default function AlertsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('deviceId'); // Get device filter from URL
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  
  // Use realtime store for alerts data
  const devices = useRealtimeStore(state => state.devices);
  const deviceAlerts = useRealtimeStore(state => state.deviceAlerts);
  const markAlertAsRead = useRealtimeStore(state => state.markAlertAsRead);
  const markAllDeviceAlertsRead = useRealtimeStore(state => state.markAllDeviceAlertsRead);
  const connectWS = useRealtimeStore(state => state.connectWS);
  const fetchInitial = useRealtimeStore(state => state.fetchInitial);

  // Initialize store and connect WebSocket
  useEffect(() => {
    const initAlerts = async () => {
      // Check authentication first
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Trigger store's initial device fetch
      await fetchInitial();
    };

    initAlerts();
    
    // Connect to WebSocket for real-time updates
    const unsub = connectWS();
    
    return () => {
      unsub && unsub();
    };
  }, [fetchInitial, connectWS, navigate]);

  // Helper functions for alert display
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="alert-icon alert-icon-critical" size={20} />;
      case 'warning':
        return <TriangleAlert className="alert-icon alert-icon-warning" size={20} />;
      default:
        return <AlertCircle className="alert-icon alert-icon-info" size={20} />;
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'alert-item-critical';
      case 'warning':
        return 'alert-item-warning';
      default:
        return 'alert-item-info';
    }
  };

  const formatTimeAgo = (timestamp) => {
    try {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'recently';
    }
  };

  const handleMarkAsRead = (deviceId, readingId, e) => {
    e.stopPropagation();
    if (deviceId && readingId) {
      markAlertAsRead(deviceId, readingId);
    }
  };

  const handleMarkAllRead = () => {
    if (deviceId) {
      markAllDeviceAlertsRead(deviceId);
    } else {
      // Mark all alerts as read for all devices
      devices.forEach(device => {
        markAllDeviceAlertsRead(device.id);
      });
    }
  };

  // Get all alerts from all devices or filter by deviceId
  const getAllAlerts = () => {
    if (deviceId) {
      return deviceAlerts[deviceId] || [];
    }
    
    // Combine alerts from all devices
    const allAlerts = [];
    Object.entries(deviceAlerts).forEach(([devId, alerts]) => {
      alerts.forEach(alert => {
        allAlerts.push({
          ...alert,
          device_id: devId,
          device_name: devices.find(d => d.id === devId)?.device_name || devices.find(d => d.id === devId)?.plant_name || `Device ${devId}`
        });
      });
    });
    
    return allAlerts;
  };

  const allAlerts = getAllAlerts();
  const filteredDeviceName = deviceId ? devices.find(d => d.id === deviceId)?.device_name || devices.find(d => d.id === deviceId)?.plant_name : null;

  // Filter alerts based on current filter
  const filteredAlerts = allAlerts.filter(alert => {
    if (filter === 'unread') return !alert.is_read;
    if (filter === 'critical') return alert.severity === 'critical';
    return true;
  });

  // Sort alerts by timestamp (newest first)
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const ta = a && a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b && b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta; // newest first
  });

  const unreadCount = allAlerts.filter(a => !a.is_read).length;

  return (
    <div className="alerts-page-root">
      {/* Header */}
      <header className="alerts-header">
        <div className="alerts-header-top">
          <h1 className="alerts-header-title">
            <AlertCircle size={32} />
            Alerts
            {unreadCount > 0 && (
              <span className="alerts-unread-badge">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              className="mark-all-read-button"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          )}
        </div>
        {filteredDeviceName && (
          <p style={{ color: '#8BA797', fontSize: '14px', margin: 0 }}>
            Showing alerts for: {filteredDeviceName}
          </p>
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
        {sortedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <AlertCircle size={48} color="#8BA797" strokeWidth={1.5} />
            <h3>No alerts to display</h3>
            <p>
              {deviceId && filteredDeviceName
                ? `${filteredDeviceName} has no alerts. Everything looks good!`
                : "You're all caught up! Check back later for updates."
              }
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {sortedAlerts.map((alert, index) => (
              <div
                key={alert.reading_id || `${alert.timestamp}-${index}`}
                className={`alert-item ${getSeverityClass(alert.severity)} ${alert.is_read ? 'alert-item-read' : 'alert-item-unread'}`}
              >
                <div className="alert-item-icon">
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="alert-item-content">
                  <div className="alert-item-header">
                    <h4 className="alert-item-title">{alert.title}</h4>
                    <span className="alert-item-time">{formatTimeAgo(alert.timestamp)}</span>
                  </div>
                  <p className="alert-item-body">{alert.body}</p>
                  {alert.device_name && (
                    <p className="alert-item-device">{alert.device_name}</p>
                  )}
                </div>

                {!alert.is_read && (
                  <button
                    className="alert-item-mark-read"
                    onClick={(e) => handleMarkAsRead(alert.device_id, alert.reading_id, e)}
                    title="Mark as read"
                    aria-label="Mark alert as read"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
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