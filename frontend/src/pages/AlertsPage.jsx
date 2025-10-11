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
  Waves,
  Sun,
  Sprout,
  ChevronRight,
  Filter,
  Bell
} from 'lucide-react';

import { getUserDevices } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';

// Local persistence for read alerts
const READ_STORAGE_KEY = 'alerts.readingIds';
const MOCK_READ_STORAGE_KEY = 'alerts.mockIds';

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

function isPersistedRead(alert) {
  const readingIds = loadIdSet(READ_STORAGE_KEY);
  const mockIds = loadIdSet(MOCK_READ_STORAGE_KEY);
  if (alert && alert.readingId && readingIds.has(alert.readingId)) return true;
  if (alert && !alert.readingId && typeof alert.id !== 'undefined' && mockIds.has(String(alert.id))) return true;
  return false;
}

function persistMarkRead(alert) {
  if (!alert) return;
  if (alert.readingId) {
    const s = loadIdSet(READ_STORAGE_KEY);
    s.add(alert.readingId);
    saveIdSet(READ_STORAGE_KEY, s);
  } else if (typeof alert.id !== 'undefined') {
    const s = loadIdSet(MOCK_READ_STORAGE_KEY);
    s.add(String(alert.id));
    saveIdSet(MOCK_READ_STORAGE_KEY, s);
  }
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

// TDS thresholds (optimal range and tolerance window)
const TDS_MIN = 800;
const TDS_MAX = 1500;
const TDS_TOLERANCE = 200; // within 200 units of the bounds shows a warning

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
  // Alerts state initialized from mock alerts; we'll fetch real pH and prepend an alert if needed
  const [alerts, setAlerts] = useState(mockAlerts);

  // On first mount, apply persisted read flags to initial alerts
  React.useEffect(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: isPersistedRead(a) || a.read }))); // preserve existing read true
  }, []);

  // On mount: fetch user's bound devices -> find pH sensors -> fetch recent readings
  React.useEffect(() => {
    let mounted = true;
    const fetchRecentPhReadings = async () => {
      try {
        const devicesResp = await getUserDevices();
        const devices = devicesResp && devicesResp.results ? devicesResp.results : devicesResp;
        if (!devices || devices.length === 0) return;

        // We'll collect out-of-range pH readings (low <6 or high >7) across all devices
        const abnormalReadings = [];

        // For each device, fetch its sensors and pH readings
        await Promise.all(devices.map(async (device) => {
          try {
            if (!device || !device.id) return;
            const sensorsResp = await getDeviceSensors(device.id);
            const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
            if (!sensors || sensors.length === 0) return;

            // Consider pH, water_level, tds, turbidity, light, humidity and air_temperature (DHT22) sensors
            // Backend uses 'air_temperature' for DHT22 (air temp + humidity)
            const relevantSensors = sensors.filter(s => ['ph', 'water_level', 'tds', 'turbidity', 'light', 'humidity', 'air_temperature'].includes(s.sensor_type));
            if (!relevantSensors || relevantSensors.length === 0) return;

            // Fetch recent sensor data for each relevant sensor so we can show multiple alerts
            await Promise.all(relevantSensors.map(async (sensor) => {
              try {
                const dataResp = await getSensorData(sensor.id, 60);
                const data = dataResp && dataResp.results ? dataResp.results : dataResp;
                const readings = Array.isArray(data) ? data : (data ? [data] : []);

                readings.forEach(r => {
                  const val = r && typeof r.value !== 'undefined' ? r.value : null;
                  if (val === null) return;

                  if (sensor.sensor_type === 'ph') {
                    // Flag readings that are outside the desired pH window: <6 or >7
                    if (val < 6 || val > 7) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'water_level') {
                    // Water level: 0 -> critical; <=40 -> warning
                    if (val === 0 || val <= 40) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'tds') {
                    // TDS rules (per user):
                    // - No alert for 1000..1300
                    // - Orange (warning) for 800..999 and 1301..1500
                    // - Red (critical) for <800 and >1500
                    const v = Number(val);
                    if (v < 800) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    } else if (v >= 800 && v <= 999) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    } else if (v >= 1000 && v <= 1300) {
                      // within safe mid-range — no alert
                    } else if (v >= 1301 && v <= 1500) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    } else if (v > 1500) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'turbidity') {
                    // Turbidity classification:
                    // raw > 2100 => Clear (no alert)
                    // raw > 1800 => Cloudy (warning)
                    // else => Turbid (critical)
                    const raw = Number(val);
                    if (raw > 2100) {
                      // Clear — do not push an alert
                    } else if (raw > 1800) {
                      // Cloudy — warning
                      abnormalReadings.push({ device, sensor, reading: r });
                    } else {
                      // Turbid — critical
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'light') {
                    // Light: critical when above 1500 lux
                    const lux = Number(val);
                    if (lux > 1500) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'humidity') {
                    // Humidity: ideal range 50-70% — alert when outside
                    const h = Number(val);
                    if (Number.isFinite(h) && (h < 50 || h > 70)) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'air_temperature') {
                    // Air temperature (DHT22): ideal range 18-26°C — alert when outside
                    const t = Number(val);
                    if (Number.isFinite(t) && (t < 18 || t > 26)) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  }
                });
              } catch (e) {
                // ignore sensor-level failures
                // eslint-disable-next-line no-console
                console.warn('AlertsPage: failed to fetch data for sensor', sensor && sensor.id, e);
              }
            }));

          } catch (e) {
            // ignore device-level failures
            // eslint-disable-next-line no-console
            console.warn('AlertsPage: failed to fetch sensors/data for device', device && device.id, e);
          }
        }));

        if (!mounted) return;

        if (abnormalReadings.length === 0) return;

        // Build alerts for each out-of-range reading, avoiding duplicates by reading id/timestamp
        setAlerts(prev => {
          const next = [...prev];
          // find numeric id base
          let nextId = Math.max(0, ...next.map(a => Number(a.id) || 0)) + 1;

          abnormalReadings
            // sort newest-first by reading.created_at (if available)
            .sort((a, b) => {
              const ta = a.reading && (a.reading.created_at || a.reading.timestamp) ? new Date(a.reading.created_at || a.reading.timestamp).getTime() : 0;
              const tb = b.reading && (b.reading.created_at || b.reading.timestamp) ? new Date(b.reading.created_at || b.reading.timestamp).getTime() : 0;
              return tb - ta;
            })
            .forEach(({ device, sensor, reading }) => {
              const readingKey = reading.id || reading.created_at || reading.timestamp || JSON.stringify(reading);
              // skip if already represented
              const exists = next.some(a => a.readingId && a.readingId === readingKey);
              if (exists) return;

              const latestIso = reading.created_at || reading.timestamp || new Date().toISOString();
              const val = reading.value;

              // Determine alert content based on sensor type
              let title = 'Alert';
              let type = 'warning';
              let message = '';
              let icon = 'droplet';
              if (reading && reading.sensor_type && reading.sensor_type === 'water_level') {
                // Some backends put sensor_type on sensor object; however our local 'sensor' object is available as well.
              }

              if (sensor && sensor.sensor_type === 'ph') {
                const isLow = val < 6;
                const isHigh = val > 7;
                title = isLow ? 'Low pH detected' : 'High pH detected';
                type = isLow ? 'critical' : 'critical';
                if (isLow) {
                  message = `pH reading is ${val}. pH below 6 can severely limit nutrient uptake and stress plants. Slowly raise pH using a pH Up solution (follow product dosing), mix thoroughly and re-check in 10-15 minutes.`;
                } else {
                  message = `pH reading is ${val}. pH above 7 reduces availability of key nutrients. Slowly lower pH using a pH Down solution (follow product dosing), mix thoroughly and re-check in 10-15 minutes.`;
                }
                // use droplet icon
                icon = 'droplet';
              } else if (sensor && sensor.sensor_type === 'water_level') {
                const isEmpty = Number(val) === 0;
                const isLowLevel = Number(val) <= 40 && Number(val) > 0;
                title = isEmpty ? 'Water level empty' : 'Low water level';
                type = isEmpty ? 'critical' : 'warning';
                if (isEmpty) {
                  message = `Water level is 0% — reservoir empty. Refill with fresh nutrient solution immediately, check pumps for priming issues, and inspect for leaks.`;
                } else {
                  message = `Water level is ${val}%. Low reservoir level (<=40%). Refill soon and verify auto-refill settings or inspect for slow leaks.`;
                }
                icon = 'droplet';
              } else if (sensor && sensor.sensor_type === 'tds') {
                const v = Number(val);
                // Map severity according to user's exact rules
                if (v < 800) {
                  type = 'critical';
                  title = 'TDS critically low';
                  message = `TDS is ${v} ppm — solution is too weak. Increase nutrient concentration according to product instructions, mix thoroughly and re-check TDS/EC.`;
                } else if (v >= 800 && v <= 999) {
                  type = 'warning';
                  title = 'TDS low warning';
                  message = `TDS is ${v} ppm — approaching the lower bound. Monitor and consider topping up nutrients to maintain target range.`;
                } else if (v >= 1000 && v <= 1300) {
                  // no alert — but this branch should not run because readings in this range are filtered out earlier
                } else if (v >= 1301 && v <= 1500) {
                  type = 'warning';
                  title = 'TDS high warning';
                  message = `TDS is ${v} ppm — approaching the upper bound. Consider diluting the solution or reducing dosing frequency.`;
                } else if (v > 1500) {
                  type = 'critical';
                  title = 'TDS critically high';
                  message = `TDS is ${v} ppm — solution is too concentrated. Perform a partial or full reservoir drain and refill with fresh solution, and check dosing equipment.`;
                }
                icon = 'zap';
              } else if (sensor && sensor.sensor_type === 'turbidity') {
                const raw = Number(val);
                if (raw > 2100) {
                  // Clear — shouldn't appear because we filtered earlier, but provide fallback
                  title = 'Water clarity OK';
                  type = 'info';
                  message = `Turbidity reading ${raw} — water is clear. No action required.`;
                } else if (raw > 1800) {
                  title = 'Water cloudy';
                  type = 'warning';
                  message = `Turbidity reading ${raw} — water is cloudy. Inspect filters, clean debris, and consider a partial water change if clarity does not improve.`;
                } else {
                  title = 'Water turbid';
                  type = 'critical';
                  message = `Turbidity reading ${raw} — water is turbid (high suspended solids). Perform a reservoir drain and refill, clean filters and tubing, and sanitize the reservoir if needed.`;
                }
                icon = 'waves';
              } else if (sensor && sensor.sensor_type === 'light') {
                const lux = Number(val);
                // Light above threshold is considered critical (very bright sunlight)
                type = 'critical';
                title = 'Very bright sunlight detected';
                message = `Light reading is ${lux} lux — very bright. Provide shading, move plants out of direct sun, or reduce supplemental lighting to prevent leaf scorch and heat stress.`;
                icon = 'sun';
              } else if (sensor && sensor.sensor_type === 'humidity') {
                const h = Number(val);
                // ideal 50-70% -> we only arrive here if out of range
                if (h < 50) {
                  type = 'warning';
                  title = 'Low humidity detected';
                  message = `Humidity is ${h}% — below ideal (50-70%). Increase humidity with misters, pebble trays, humidifiers, or reduce ventilation; monitor for stress.`;
                } else {
                  type = 'warning';
                  title = 'High humidity detected';
                  message = `Humidity is ${h}% — above ideal (50-70%). Improve ventilation, reduce misting, and consider dehumidification to prevent mold and fungal issues.`;
                }
                icon = 'sprout';
              } else if (sensor && sensor.sensor_type === 'air_temperature') {
                const t = Number(val);
                // ideal 18-26°C -> we only arrive here if out of range
                if (t < 18) {
                  type = 'warning';
                  title = 'Low temperature detected';
                  message = `Temperature is ${t}°C — below ideal (18–26°C). Increase heating, insulate the space, or reduce night cooling to maintain optimal growth.`;
                } else {
                  type = 'warning';
                  title = 'High temperature detected';
                  message = `Temperature is ${t}°C — above ideal (18–26°C). Improve ventilation, add shading, or activate cooling to reduce heat stress.`;
                }
                icon = 'thermometer';
              } else {
                // fallback
                title = 'Sensor alert';
                type = 'warning';
                message = `Sensor reading is ${val}. Review sensor placement, calibration and system status for guidance.`;
              }

              const alertObj = {
                id: nextId++,
                type,
                icon: icon || 'droplet',
                title,
                device: device.device_name || device.device_serial || `Device ${device.id}`,
                deviceId: device.id,
                deviceSerial: device.device_serial || null,
                message,
                timestamp: relativeTimeFromISO(latestIso),
                date: latestIso,
                read: false,
                // metadata for deduplication / tracking
                readingId: readingKey,
              };

              // Set read state from persistence if this reading was previously read
              if (isPersistedRead(alertObj)) {
                alertObj.read = true;
              }

              // prepend so newest appear first
              next.unshift(alertObj);
            });

          return next;
        });
      } catch (err) {
        // Non-fatal; alerts page should still render mock alerts
        // eslint-disable-next-line no-console
        console.warn('AlertsPage: failed to fetch recent pH readings', err);
      }
    };

    fetchRecentPhReadings();
    return () => { mounted = false; };
  }, []);

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
      return prev.map(alert => ({ ...alert, read: true }));
    });
  };

  const handleAlertClick = (alert) => {
    // Persist and update state immediately before navigating
    try { persistMarkRead(alert); } catch (_e) { }
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
        {sortedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <AlertCircle size={48} color="#8BA797" strokeWidth={1.5} />
            <h3>No alerts to display</h3>
            <p>You're all caught up! Check back later for updates.</p>
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
