import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../assets/styles/AlertsPage.css';
import {
  Leaf,
  AlertCircle,
  Loader,
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
  Bell
} from 'lucide-react';

import { useRealtimeStore } from '../store/realtimeStore';

// Helper: format a ISO date string to a relative time (minutes/hours/days ago)
function relativeTimeFromISO(iso) {
  try {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return 'just now';
    const now = new Date();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    // For older dates, show short locale date
    return then.toLocaleDateString();
  } catch (e) {
    return 'just now';
  }
}

// No local classification or templates anymore. We rely on backend alerts.

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// No plant recommendation templates on frontend; backend returns recommendation text with each alert.

export default function AlertsPage() {
  const navigate = useNavigate();
  const totalUnread = useRealtimeStore(s => s.totalUnread);
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('deviceId'); // Get device filter from URL
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  // Pull alerts and devices from the realtime store (same source Dashboard uses)
  const devices = useRealtimeStore(s => s.devices);
  const deviceAlerts = useRealtimeStore(s => s.deviceAlerts);
  const loadingInitial = useRealtimeStore(s => s.loadingInitial);
  const loadingAlerts = useRealtimeStore(s => s.loadingAlerts);
  const errorAlerts = useRealtimeStore(s => s.errorAlerts);
  const fetchInitial = useRealtimeStore(s => s.fetchInitial);
  const fetchAlertsStore = useRealtimeStore(s => s.fetchAlerts);
  const markAlertAsRead = useRealtimeStore(s => s.markAlertAsRead);
  const markAllDeviceAlertsRead = useRealtimeStore(s => s.markAllDeviceAlertsRead);
  const clearAlerts = useRealtimeStore(s => s.clearAlerts);

  const [filteredDeviceName, setFilteredDeviceName] = useState(null);

  // Ensure store is hydrated and alerts loaded
  useEffect(() => {
    const hasDevices = Array.isArray(devices) && devices.length > 0;
    // Clear locally cached alerts to avoid showing stale entries that may have been deleted server-side
    try { clearAlerts(); } catch (_) { }
    if (!hasDevices) {
      fetchInitial();
    } else {
      // refresh alerts each time deviceId filter changes to be safe
      fetchAlertsStore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // Update filtered device name
  useEffect(() => {
    if (deviceId && Array.isArray(devices)) {
      const did = Number(deviceId);
      const d = devices.find(x => x && x.id === did);
      const name = d ? (d.device_name || d.plant_name || d.name || `Device ${d.device_serial || d.id}`) : null;
      setFilteredDeviceName(name);
    } else {
      setFilteredDeviceName(null);
    }
  }, [deviceId, devices]);

  // Map store alerts into UI shape
  const mappedAlerts = useMemo(() => {
    if (!deviceAlerts || !devices) return [];
    const deviceNameById = new Map();
    devices.forEach(d => {
      if (d && d.id) {
        const name = d.device_name || d.plant_name || d.name || `Device ${d.device_serial || d.id}`;
        deviceNameById.set(d.id, name);
      }
    });

    const list = [];
    Object.entries(deviceAlerts).forEach(([didStr, alerts]) => {
      const did = Number(didStr);
      (alerts || []).forEach(a => {
        const createdIso = a.timestamp || a.created_at || new Date().toISOString();
        const sensor = a.sensor_type || a.metric || '';
        let icon = 'droplet';
        if (['tds', 'ec'].includes(sensor)) icon = 'zap';
        else if (['water_temperature', 'air_temperature', 'environment_temp', 'env_temp', 'temp', 'temperature'].includes(sensor)) icon = 'thermometer';
        else if (sensor === 'light') icon = 'sun';
        else if (sensor === 'humidity') icon = 'sprout';
        else if (sensor === 'turbidity') icon = 'waves';

        const type = a.severity === 'critical' ? 'critical' : (a.severity === 'warning' ? 'warning' : 'info');

        list.push({
          id: a.id || a.reading_id || `${did}:${sensor}:${createdIso}`,
          readingId: a.reading_id || a.id,
          type,
          icon,
          title: a.title || `${(sensor || 'Sensor').toUpperCase()} alert`,
          device: deviceNameById.get(did) || `Device ${did}`,
          deviceId: did,
          deviceSerial: null,
          message: a.body || a.message || '',
          timestamp: relativeTimeFromISO(createdIso),
          date: createdIso,
          read: !!a.is_read,
        });
      });
    });
    return list;
  }, [deviceAlerts, devices]);

  const filteredAlerts = mappedAlerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.type === 'critical';
    // Device filter
    if (deviceId) return String(alert.deviceId) === String(deviceId);
    return true;
  });

  // Ensure descending order by alert creation time
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const ta = a && a.date ? new Date(a.date).getTime() : 0;
    const tb = b && b.date ? new Date(b.date).getTime() : 0;
    return tb - ta; // newest first
  });

  const unreadCount = mappedAlerts.filter(a => !a.read && (!deviceId || String(a.deviceId) === String(deviceId))).length;

  const markAsRead = (alertObj) => {
    if (!alertObj?.deviceId || !alertObj?.readingId) return;
    try {
      markAlertAsRead(alertObj.deviceId, alertObj.readingId);
    } catch (_e) { /* ignore */ }
  };

  const markAllAsRead = () => {
    // If filtering to a device, mark all for that device, else all devices
    if (deviceId) {
      const did = Number(deviceId);
      markAllDeviceAlertsRead(did);
    } else {
      const ids = Object.keys(deviceAlerts || {});
      ids.forEach(id => markAllDeviceAlertsRead(Number(id)));
    }
  };

  const handleAlertClick = (alert) => {
    // Mark as read via store and navigate
    try { markAsRead(alert); } catch (_e) { }
    navigate(`/device/${alert.deviceId}`, { state: { deviceId: alert.deviceId, deviceName: alert.device, deviceSerial: alert.deviceSerial } });
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
      case 'sun':
        return <Sun size={20} strokeWidth={2.5} />;
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
            {deviceId && filteredDeviceName ? `${filteredDeviceName} Alerts` : 'Alerts'}
            <Bell size={28} color="rgba(17, 17, 17, 0.86)" strokeWidth={2.5} />
          </h1>
          {unreadCount > 0 && (
            <span className="alerts-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="alerts-header-actions">
          {deviceId && (
            <button
              className="show-all-devices-button"
              onClick={() => navigate('/alerts')}
              style={{
                background: 'none',
                border: '1px solid rgba(51, 148, 50, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'rgba(51, 148, 50, 0.8)',
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(51, 148, 50, 0.1)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'none'; }}
            >
              Show All Devices
            </button>
          )}
          {unreadCount > 0 && (
            <button className="mark-all-read-button" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* Loading / Error states */}
      {(loadingInitial || loadingAlerts) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          gap: '12px'
        }}>
          <Loader size={40} className="animate-spin" color={PRIMARY_GREEN} />
          <p style={{ color: '#666' }}>Loading alerts...</p>
        </div>
      )}
      {!loadingInitial && !loadingAlerts && errorAlerts && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40vh',
          gap: '12px'
        }}>
          <AlertCircle size={40} color="#e74c3c" />
          <p style={{ color: '#e74c3c' }}>{errorAlerts}</p>
          <button
            onClick={() => { fetchAlertsStore(); }}
            style={{
              padding: '8px 16px',
              background: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter buttons */}
      {!loadingInitial && !loadingAlerts && !errorAlerts && (
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
      )}

      {/* Alerts list */}
      {!loadingInitial && !loadingAlerts && !errorAlerts && (
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
              {sortedAlerts.map((alert) => (
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
      )}

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item active" aria-current="page" style={{ position: 'relative' }}>
          <AlertCircle size={20} />
          {totalUnread > 0 && (
            <span className="nav-notification-badge" style={{
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
            }}>
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
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
