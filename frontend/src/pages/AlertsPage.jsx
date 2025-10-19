import React, { useState } from 'react';
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

import { getUserDevices } from '../services/api/devices.js';
import { listAlerts } from '../services/api/alerts.js';
import { useRealtimeStore } from '../store/realtimeStore';

// Local persistence for read alerts (database alerts only)
const READ_STORAGE_KEY = 'alerts.readingIds';

function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_e) {
    return new Set();
  }
}

function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (_e) {
    // ignore
  }
}

// Check if an alert has been marked as read before (supports legacy and new keys)
function isPersistedRead(alert) {
  const readingIds = loadIdSet(READ_STORAGE_KEY);
  if (!alert) return false;
  if (alert.readingId && readingIds.has(alert.readingId)) return true;
  // Backward compatibility: some older persisted entries used a different key
  if (alert.legacyReadingId && readingIds.has(alert.legacyReadingId)) return true;
  return false;
}

function persistMarkRead(alert) {
  if (!alert || !alert.readingId) return;
  const s = loadIdSet(READ_STORAGE_KEY);
  s.add(alert.readingId);
  saveIdSet(READ_STORAGE_KEY, s);
  try {
    window.dispatchEvent(new Event('alerts-read-updated'));
  } catch (_e) { }
}

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
  // Alerts state initialized as empty - only real database alerts will be shown
  const [alerts, setAlerts] = useState([]);
  const [filteredDeviceName, setFilteredDeviceName] = useState(null); // Store device name when filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // On first mount, apply persisted read flags to initial alerts
  React.useEffect(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: isPersistedRead(a) || a.read }))); // preserve existing read true
  }, []);

  // On mount: fetch user's bound devices (for device name lookup) and alerts from backend
  React.useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get devices for name lookup
        const devicesResp = await getUserDevices();
        const devices = devicesResp && devicesResp.results ? devicesResp.results : devicesResp;

        // Fetch alerts from backend with optional device filter
        const res = await listAlerts({ deviceId, ordering: '-created_at' });
        const results = res && res.results ? res.results : (Array.isArray(res) ? res : []);

        // Map device id to display name
        const deviceNameById = new Map();
        if (Array.isArray(devices)) {
          devices.forEach(d => {
            if (d && d.id) {
              const name = d.device_name || d.plant_name || `Device ${d.device_serial || d.id}`;
              deviceNameById.set(d.id, name);
            }
          });
        }

        // Set filtered device name if filtering
        if (deviceId) {
          const did = Number(deviceId);
          const dn = deviceNameById.get(did) || null;
          setFilteredDeviceName(dn);
        } else {
          setFilteredDeviceName(null);
        }

        const mapped = (results || []).map(a => {
          const id = a.id;
          const deviceIdVal = a.device || (a.sensor && a.sensor.device) || null;
          const deviceName = (deviceIdVal && deviceNameById.get(deviceIdVal)) || a.device_name || `Device ${a.device_serial || deviceIdVal || ''}`;
          const createdIso = a.created_at || a.created || a.timestamp || a.date || new Date().toISOString();
          // Choose icon based on metric
          const metric = a.metric || '';
          let icon = 'droplet';
          if (['tds', 'ec'].includes(metric)) icon = 'zap';
          else if (['water_temperature', 'air_temperature', 'environment_temp', 'env_temp', 'temp'].includes(metric)) icon = 'thermometer';
          else if (metric === 'light') icon = 'sun';
          else if (metric === 'humidity') icon = 'sprout';
          else if (metric === 'turbidity') icon = 'waves';

          // Map severity to UI type
          const type = a.severity === 'critical' ? 'critical' : (a.severity === 'warning' ? 'warning' : 'info');

          const title = a.title || `${(metric || 'Sensor').toUpperCase()} alert`;
          const message = a.recommendation || a.message || a.body || a.description || '';

          const readingKey = `${deviceIdVal || 'dev'}:${metric || 'metric'}:${createdIso}`;
          const legacyKey = a.legacy_key || a.id || createdIso;

          const obj = {
            id,
            type,
            icon,
            title,
            device: deviceName,
            deviceId: deviceIdVal,
            deviceSerial: a.device_serial || null,
            message,
            timestamp: relativeTimeFromISO(createdIso),
            date: createdIso,
            read: false,
            readingId: readingKey,
            legacyReadingId: legacyKey,
          };
          if (isPersistedRead(obj)) obj.read = true;
          return obj;
        });

        if (!mounted) return;
        setAlerts(mapped);
      } catch (err) {
        // Non-fatal; alerts page should still render (empty if no database alerts)
        // eslint-disable-next-line no-console
        console.warn('AlertsPage: failed to fetch alerts', err);
        if (mounted) setError('Failed to load alerts');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAlerts();
    return () => { mounted = false; };
  }, [deviceId]);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.type === 'critical';
    return true;
  });

  // Ensure descending order by alert creation time
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const ta = a && a.date ? new Date(a.date).getTime() : 0;
    const tb = b && b.date ? new Date(b.date).getTime() : 0;
    return tb - ta; // newest first
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        // persist
        persistMarkRead(alert);
        return { ...alert, read: true };
      }
      return alert;
    }));
  };

  const markAllAsRead = () => {
    setAlerts(prev => {
      // persist all alerts currently present
      prev.forEach(a => persistMarkRead(a));
      try { window.dispatchEvent(new Event('alerts-read-updated')); } catch (_e) { }
      return prev.map(alert => ({ ...alert, read: true }));
    });
  };

  const handleAlertClick = (alert) => {
    // Persist and update state immediately before navigating
    try { persistMarkRead(alert); } catch (_e) { }
    try { window.dispatchEvent(new Event('alerts-read-updated')); } catch (_e) { }
    setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
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
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(51, 148, 50, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
              }}
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
      {loading && (
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
      {!loading && error && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40vh',
          gap: '12px'
        }}>
          <AlertCircle size={40} color="#e74c3c" />
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button
            onClick={() => {
              // re-trigger effect by toggling a trivial state or calling fetch again; simplest: rely on deviceId dep
              // For same deviceId, force reload by flipping a query param fragment
              setLoading(true);
              setError(null);
              // naive retry: just call the effect's fetch again by temporarily pushing a no-op state update
              // we can simulate by updating the URL with the same params to retrigger useEffect
              // but simpler: directly invoke the inner fetch via a small inline function
              (async () => {
                // mimic effect by updating searchParams (optional). Here we just refresh the page section by resetting state
                const evt = new Event('popstate');
                window.dispatchEvent(evt);
              })();
            }}
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
      {!loading && !error && (
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
      {!loading && !error && (
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
