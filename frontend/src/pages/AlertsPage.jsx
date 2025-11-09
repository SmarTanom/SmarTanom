import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
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
  const connectWS = useRealtimeStore(s => s.connectWS);
  const wsStatus = useRealtimeStore(s => s.wsStatus);
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

  // Establish WebSocket connection for real-time alerts; refetch on tab focus as a safety net
  useEffect(() => {
    // Connect to user-specific WebSocket stream; returns unsubscribe/cleanup
    const cleanupWS = typeof connectWS === 'function' ? connectWS() : undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // light refresh when user returns to the tab (covers missed pushes)
        try { fetchAlertsStore(); } catch (_) { }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (typeof cleanupWS === 'function') cleanupWS();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional polling fallback when WebSocket isn't connected
  useEffect(() => {
    if (wsStatus === 'connected') return; // no polling needed
    const id = setInterval(() => {
      try { fetchAlertsStore(); } catch (_) { }
    }, 60000); // 60s fallback
    return () => clearInterval(id);
  }, [wsStatus, fetchAlertsStore]);

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

  // Modal: which alert is currently opened for details (recommendation)
  const [activeAlert, setActiveAlert] = useState(null);

  // Close on Escape
  useEffect(() => {
    if (!activeAlert) return;
    const onKey = (e) => { if (e.key === 'Escape') setActiveAlert(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeAlert]);

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

      {/* Guidance text */}
      {!loadingInitial && !loadingAlerts && !errorAlerts && (
        <div style={{
          margin: '8px 16px 0',
          color: '#64748b',
          fontSize: '12px'
        }}>
          Tip: Tap an alert to open the device and mark it as read. Use “Mark all as read” to clear unread counters.
        </div>
      )}

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
                  onClick={(e) => {
                    if (e.target.closest('button')) return; // safety
                    // Auto mark as read when opening recommendation modal
                    if (!alert.read) {
                      try { markAsRead(alert); toast.success('Marked as read'); } catch (_) {}
                      // Optimistically set read state for modal
                      setActiveAlert({ ...alert, read: true });
                    } else {
                      setActiveAlert(alert);
                    }
                  }}
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
                    <p className="alert-item-message hint" style={{ opacity: 0.65, fontStyle: 'italic' }}>Tap to view recommendation</p>
                    <span className="alert-item-timestamp">{alert.timestamp}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Details Modal */}
      {activeAlert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          onClick={() => setActiveAlert(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 92vw)',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`alert-item-icon ${activeAlert.type}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center' }}>
                {getAlertIcon(activeAlert.icon)}
              </div>
              <div>
                <h3 id="alert-modal-title" style={{ margin: 0 }}>{activeAlert.title}</h3>
                <div style={{ color: '#64748b', fontSize: 12 }}>{activeAlert.device} • {activeAlert.timestamp}</div>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{activeAlert.message || 'No additional details.'}</div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => { handleAlertClick(activeAlert); }}
                style={{
                  background: PRIMARY_GREEN,
                  border: '1px solid rgba(51,148,50,0.4)',
                  color: 'white',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Open device
              </button>
              <button
                onClick={() => setActiveAlert(null)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(139,167,151,0.4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
