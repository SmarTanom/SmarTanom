import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/DeviceDetails.css';
import {
  ChevronLeft,
  MoreVertical,
  Clock,
  Sprout,
  Leaf,
  AlertCircle,
  User,
  ChevronRight,
  ChevronDown,
  TriangleAlert,
  CircleAlert,
  Droplets,
  Wifi,
  Gauge,
  RefreshCw,
  Database
} from 'lucide-react';

import { getDeviceById } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Mock data - will be replaced with real device data from props/API
const mockDevices = {
  'D000000001': {
    name: 'Porch SmarTanom',
    id: 'D000000001',
    image: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop',
    plant: {
      name: 'Romaine Lettuce',
      variety: 'Romaine',
      image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop',
      status: 'Growing now',
      daysToHarvest: 35,
      estimatedHarvestMessage: 'Romaine Lettuce is estimated to be ready for harvest in 35 days.'
    }
  },
  'D000000002': {
    name: 'Greenhouse A',
    id: 'D000000002',
    image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop',
    plant: {
      name: 'Basil',
      variety: 'Sweet Basil',
      image: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&auto=format&fit=crop',
      status: 'Growing now',
      daysToHarvest: 21,
      estimatedHarvestMessage: 'Basil is estimated to be ready for harvest in 21 days.'
    }
  },
  'D000000003': {
    name: 'Indoor Rack',
    id: 'D000000003',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop',
    plant: {
      name: 'Spinach',
      variety: 'Baby Spinach',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop',
      status: 'Growing now',
      daysToHarvest: 28,
      estimatedHarvestMessage: 'Spinach is estimated to be ready for harvest in 28 days.'
    }
  }
};

// Helper: relative time from ISO
function relativeTimeFromISO(iso) {
  try {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return 'just now';
    const now = new Date();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch (_e) {
    return 'just now';
  }
}

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('plants');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logEntries, setLogEntries] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function fetchDevice() {
      try {
        setLoading(true);
        setError(null);
        const id = deviceId || (location.state && location.state.deviceId);
        if (!id) {
          // fallback to mock if no id
          if (mounted) setDevice(mockDevices['D000000001']);
          return;
        }
        const resp = await getDeviceById(id);
        const dev = resp && resp.id ? resp : (resp && resp.results ? resp.results : resp);
        if (mounted) setDevice(dev);
      } catch (e) {
        console.warn('DeviceDetails: failed to load device', e);
        if (mounted) {
          setError('Failed to load device');
          setDevice(mockDevices[deviceId] || mockDevices['D000000001']);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDevice();
    return () => { mounted = false; };
  }, [deviceId, location.state]);

  // Build alert entries for this device in the Log tab
  useEffect(() => {
    let mounted = true;
    async function fetchDeviceAlerts() {
      try {
        // only fetch when viewing the log tab
        if (activeTab !== 'log') return;
        const id = (device && (device.id || device.device_id)) || deviceId || (location.state && location.state.deviceId);
        if (!id) return;
        const sensorsResp = await getDeviceSensors(id);
        const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
        if (!Array.isArray(sensors) || sensors.length === 0) {
          if (mounted) setLogEntries([]);
          return;
        }

        const relevantSensors = sensors.filter(s => ['ph', 'water_level', 'tds', 'turbidity', 'light', 'humidity', 'air_temperature'].includes(s.sensor_type));

        const abnormalReadings = [];
        await Promise.all(relevantSensors.map(async (sensor) => {
          try {
            const dataResp = await getSensorData(sensor.id, 60);
            const data = dataResp && dataResp.results ? dataResp.results : dataResp;
            const readings = Array.isArray(data) ? data : (data ? [data] : []);
            readings.forEach(r => {
              const val = r && typeof r.value !== 'undefined' ? r.value : null;
              if (val === null) return;
              const vNum = Number(val);
              if (sensor.sensor_type === 'ph') {
                if (vNum < 6 || vNum > 7) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'water_level') {
                if (vNum === 0 || vNum <= 40) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'tds') {
                if (vNum < 800 || (vNum >= 800 && vNum <= 999) || (vNum >= 1301 && vNum <= 1500) || vNum > 1500) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'turbidity') {
                if (!(vNum > 2100)) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'light') {
                if (vNum > 1500) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'humidity') {
                if (vNum < 50 || vNum > 70) abnormalReadings.push({ sensor, reading: r });
              } else if (sensor.sensor_type === 'air_temperature') {
                if (vNum < 18 || vNum > 26) abnormalReadings.push({ sensor, reading: r });
              }
            });
          } catch (_e) { /* ignore a sensor failure */ }
        }));

        // Build entries with specific messages mirroring AlertsPage
        let nextId = 1;
        const built = abnormalReadings
          .sort((a, b) => {
            const ta = a.reading && (a.reading.created_at || a.reading.timestamp) ? new Date(a.reading.created_at || a.reading.timestamp).getTime() : 0;
            const tb = b.reading && (b.reading.created_at || b.reading.timestamp) ? new Date(b.reading.created_at || b.reading.timestamp).getTime() : 0;
            return tb - ta;
          })
          .map(({ sensor, reading }) => {
            const val = Number(reading.value);
            const iso = reading.created_at || reading.timestamp || new Date().toISOString();
            let type = 'warning';
            let title = 'Alert';
            let message = `Reading is ${val}`;
            if (sensor.sensor_type === 'ph') {
              if (val < 6) {
                type = 'critical';
                title = 'Low pH detected';
                message = `pH is ${val}. Raise pH using pH Up, mix thoroughly, and re-check in 10–15 minutes.`;
              } else {
                type = 'critical';
                title = 'High pH detected';
                message = `pH is ${val}. Lower pH using pH Down, mix thoroughly, and re-check in 10–15 minutes.`;
              }
            } else if (sensor.sensor_type === 'water_level') {
              if (val === 0) {
                type = 'critical';
                title = 'Water level empty';
                message = `Water level 0% — refill immediately, prime pumps, and check for leaks.`;
              } else {
                type = 'warning';
                title = 'Low water level';
                message = `Water level ${val}% — refill soon and verify auto-refill or inspect for leaks.`;
              }
            } else if (sensor.sensor_type === 'tds') {
              if (val < 800) {
                type = 'critical';
                title = 'TDS critically low';
                message = `TDS ${val} ppm — solution too weak. Increase nutrients and re-check.`;
              } else if (val <= 999) {
                type = 'warning';
                title = 'TDS low warning';
                message = `TDS ${val} ppm — near lower bound. Consider topping up nutrients.`;
              } else if (val <= 1500) {
                type = 'warning';
                title = 'TDS high warning';
                message = `TDS ${val} ppm — near upper bound. Consider dilution or reduce dosing.`;
              } else {
                type = 'critical';
                title = 'TDS critically high';
                message = `TDS ${val} ppm — too concentrated. Drain/refill and check dosing.`;
              }
            } else if (sensor.sensor_type === 'turbidity') {
              if (val > 2100) {
                type = 'info';
                title = 'Water clarity OK';
                message = `Turbidity ${val} — clear water.`;
              } else if (val > 1800) {
                type = 'warning';
                title = 'Water cloudy';
                message = `Turbidity ${val} — cloudy. Clean filters and consider partial change.`;
              } else {
                type = 'critical';
                title = 'Water turbid';
                message = `Turbidity ${val} — turbid. Drain/refill, clean filters and tubing.`;
              }
            } else if (sensor.sensor_type === 'light') {
              type = 'critical';
              title = 'Very bright sunlight detected';
              message = `Light ${val} lux — very bright. Provide shading or reduce lighting.`;
            } else if (sensor.sensor_type === 'humidity') {
              if (val < 50) {
                type = 'warning';
                title = 'Low humidity detected';
                message = `Humidity ${val}% — increase humidity (misters, trays, humidifier).`;
              } else {
                type = 'warning';
                title = 'High humidity detected';
                message = `Humidity ${val}% — improve ventilation or dehumidify.`;
              }
            } else if (sensor.sensor_type === 'air_temperature') {
              if (val < 18) {
                type = 'warning';
                title = 'Low temperature detected';
                message = `Temperature ${val}°C — increase heating or insulation.`;
              } else {
                type = 'warning';
                title = 'High temperature detected';
                message = `Temperature ${val}°C — improve ventilation, add shading or cooling.`;
              }
            }
            return {
              id: nextId++,
              type,
              title,
              message,
              time: relativeTimeFromISO(iso),
              date: new Date(iso).toLocaleDateString(),
              createdAt: iso,
            };
          });

        if (mounted) setLogEntries(built);
      } catch (e) {
        console.warn('DeviceDetails: failed to build device alerts', e);
        if (mounted) setLogEntries([]);
      }
    }
    fetchDeviceAlerts();
    return () => { mounted = false; };
  }, [activeTab, device, deviceId, location.state]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const sortedLogEntries = [...logEntries].sort((a, b) => {
    if (sortOrder === 'desc') {
      return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)); // Newest first
    }
    return (new Date(a.createdAt || 0)) - (new Date(b.createdAt || 0)); // Oldest first
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'warning':
        return <TriangleAlert size={20} color="#E1554A" strokeWidth={2.5} />;
      case 'critical':
        return <TriangleAlert size={20} color="#E1554A" strokeWidth={2.5} />;
      case 'success':
        return <CircleAlert size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />;
      case 'harvest':
        return <Sprout size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />;
      default:
        return <CircleAlert size={20} color="#8BA797" strokeWidth={2.5} />;
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const resolvedDevice = device || (mockDevices[deviceId] || mockDevices['D000000001']);

  // Use plant photo if available, otherwise fall back to mock image or default
  const headerImage = (device && device.plant_photo_url)
    ? device.plant_photo_url
    : (resolvedDevice.image || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop');  return (
    <div className="device-details-root">
      {/* Header with background image */}
      <header className="device-header" style={{ backgroundImage: `url(${headerImage})` }}>
        <div className="device-header-overlay">
          <button className="back-button" onClick={handleGoBack}>
            <ChevronLeft size={20} />
            <span>Go back</span>
          </button>
          <button className="more-button" aria-label="More options">
            <MoreVertical size={24} />
          </button>
        </div>
      </header>

      {/* Device info */}
      <div className="device-info-section">
        <h1 className="device-info-title">{resolvedDevice.device_name || resolvedDevice.name || (location.state && location.state.deviceName) || 'Device'}</h1>
        <p className="device-info-id">Serial: {resolvedDevice.device_serial || (location.state && location.state.deviceSerial) || resolvedDevice.id || deviceId}</p>
      </div>

      {/* Tabs */}
      <nav className="device-tabs" role="tablist">
        <button
          className={`device-tab ${activeTab === 'plants' ? 'active' : ''}`}
          onClick={() => setActiveTab('plants')}
          role="tab"
          aria-selected={activeTab === 'plants'}
        >
          PLANTS
        </button>
        <button
          className={`device-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
          role="tab"
          aria-selected={activeTab === 'log'}
        >
          LOG
        </button>
        <button
          className={`device-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
        >
          SETTINGS
        </button>
      </nav>

      {/* Content */}
      <main className="device-content">
        {activeTab === 'plants' && (
          <>
            {/* Harvest estimate */}
            <div className="harvest-estimate">
              <Clock size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              <p className="harvest-estimate-text">
                {(device && device.plant_name)
                  ? `Growing ${device.plant_name}${device.plant_variety ? ` (${device.plant_variety})` : ''} - ${device.plant_status || 'Active'}`
                  : (resolvedDevice.plant ? resolvedDevice.plant.estimatedHarvestMessage : 'Device is running normally.')
                }
              </p>
            </div>

            {/* Plant status */}
            <div className="plant-status-card">
              <Sprout size={18} color={PRIMARY_GREEN} strokeWidth={2.5} />
              <span className="plant-status-text">
                {(device && device.plant_status) || (resolvedDevice.plant ? resolvedDevice.plant.status : 'Active')}
              </span>
            </div>

            {/* Plant card */}
            <div className="plant-card">
              <div className="plant-card-image">
                <img
                  src={
                    (device && device.plant_photo_url)
                      ? device.plant_photo_url
                      : ((resolvedDevice.plant && resolvedDevice.plant.image) || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop')
                  }
                  alt={
                    (device && device.plant_name)
                      ? device.plant_name
                      : ((resolvedDevice.plant && resolvedDevice.plant.name) || 'Plant')
                  }
                />
              </div>
              <div className="plant-card-content">
                <div className="plant-card-info">
                  <h3 className="plant-card-name">
                    {(device && device.plant_name) || (resolvedDevice.plant ? resolvedDevice.plant.name : '—')}
                  </h3>
                  <p className="plant-card-variety">
                    {(device && device.plant_variety) || (resolvedDevice.plant ? resolvedDevice.plant.variety : '—')}
                  </p>
                </div>
                <div className="plant-card-harvest">
                  <span className="harvest-label">
                    {(device && device.plant_status) || (resolvedDevice.plant ? `Harvest in ${resolvedDevice.plant.daysToHarvest} days` : '—')}
                  </span>
                </div>
              </div>
            </div>

            {/* Start new cycle button */}
            <button
              className="start-cycle-button"
              onClick={() => navigate('/start-cycle')}
            >
              Start New Cycle
            </button>
          </>
        )}

        {activeTab === 'log' && (
          <>
            {/* Sort by header */}
            <div className="log-header">
              <span className="log-header-label">Sort by:</span>
              <button className="log-sort-button" onClick={toggleSortOrder}>
                <span>Date: {sortOrder === 'desc' ? 'Descending' : 'Ascending'}</span>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Log entries */}
            <div className="log-entries">
              {sortedLogEntries.map((entry) => (
                <div key={entry.id} className="log-entry">
                  <div className="log-entry-icon">
                    {getLogIcon(entry.type)}
                  </div>
                  <div className="log-entry-content">
                    <div className="log-entry-header">
                      <h4 className="log-entry-title">{entry.title}</h4>
                      <span className="log-entry-time">{entry.time}</span>
                    </div>
                    <p className="log-entry-message">{entry.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="settings-list">
            <button className="settings-item" onClick={() => console.log('Connectivity')}>
              <div className="settings-item-left">
                <Wifi size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
                <span className="settings-item-label">Connectivity</span>
              </div>
              <div className="settings-item-right">
                <span className="settings-item-value">Connected via Wifi</span>
                <ChevronRight size={20} color="#8BA797" />
              </div>
            </button>

            <button className="settings-item" onClick={() => console.log('Sensor Settings')}>
              <div className="settings-item-left">
                <Gauge size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
                <span className="settings-item-label">Sensor Settings</span>
              </div>
              <ChevronRight size={20} color="#8BA797" />
            </button>

            <button className="settings-item" onClick={() => console.log('Cycle Settings')}>
              <div className="settings-item-left">
                <RefreshCw size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
                <span className="settings-item-label">Cycle Settings</span>
              </div>
              <ChevronRight size={20} color="#8BA797" />
            </button>

            <button className="settings-item" onClick={() => console.log('SmarTanom Sync Settings')}>
              <div className="settings-item-left">
                <Database size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
                <span className="settings-item-label">SmarTanom Sync Settings</span>
              </div>
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item active" aria-current="page" onClick={() => navigate('/dashboard')}>
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/alerts')}>
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
