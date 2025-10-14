import React from 'react';
import { AlertCircle, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { useRealtimeStore } from '../store/realtimeStore';
import './RecentAlerts.css';

/**
 * RecentAlerts Component
 * Displays a list of recent alerts for the current device with real-time updates.
 * Includes mark-as-read functionality and auto-syncs with WebSocket broadcasts.
 */
const RecentAlerts = ({ deviceId, maxAlerts = 10 }) => {
  const deviceAlerts = useRealtimeStore(state => state.deviceAlerts[deviceId] || []);
  const markAlertAsRead = useRealtimeStore(state => state.markAlertAsRead);
  const markAllDeviceAlertsRead = useRealtimeStore(state => state.markAllDeviceAlertsRead);

  // Get only the most recent alerts up to maxAlerts
  const recentAlerts = deviceAlerts.slice(0, maxAlerts);
  const unreadCount = recentAlerts.filter(a => !a.is_read).length;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="alert-icon alert-icon-critical" size={20} />;
      case 'warning':
        return <AlertTriangle className="alert-icon alert-icon-warning" size={20} />;
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

  const handleMarkAsRead = (readingId, e) => {
    e.stopPropagation();
    if (deviceId && readingId) {
      markAlertAsRead(deviceId, readingId);
    }
  };

  const handleMarkAllRead = () => {
    if (deviceId && unreadCount > 0) {
      markAllDeviceAlertsRead(deviceId);
    }
  };

  if (recentAlerts.length === 0) {
    return (
      <div className="recent-alerts-section">
        <div className="recent-alerts-header">
          <h3 className="recent-alerts-title">Recent Alerts</h3>
        </div>
        <div className="recent-alerts-empty">
          <CheckCircle className="empty-icon" size={48} />
          <p className="empty-message">No alerts</p>
          <p className="empty-subtitle">All systems operating normally</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-alerts-section">
      <div className="recent-alerts-header">
        <div className="header-left">
          <h3 className="recent-alerts-title">Recent Alerts</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="mark-all-read-btn"
            onClick={handleMarkAllRead}
            title="Mark all as read"
          >
            <CheckCircle size={16} />
            Mark all read
          </button>
        )}
      </div>

      <div className="recent-alerts-list">
        {recentAlerts.map((alert, index) => (
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
            </div>

            {!alert.is_read && (
              <button
                className="alert-item-mark-read"
                onClick={(e) => handleMarkAsRead(alert.reading_id, e)}
                title="Mark as read"
                aria-label="Mark alert as read"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentAlerts;
