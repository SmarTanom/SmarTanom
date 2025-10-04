import React from 'react';
import {
  IconSettings,
  IconUsers,
  IconUser,
  IconBell,
  IconChevronRight,
  IconArrowUp,
  IconCloud,
  IconWifiCheck,
  IconDroplet,
  IconAlertTriangle,
  IconThermometer,
  IconSun,
  IconLeaf,
} from '../components/icons/DashboardIcons.jsx';
import './UserDashboard.css';

// Mock data hook - replace with real API call later
function useDashboardData() {
  return {
    user: { name: 'User' },
    device: {
      name: 'Porch SmarTanom',
      id: '000000001',
      image: null, // placeholder for device/plant image
    },
    alerts: [
      { severity: 'high', message: 'EC too low (Inadequate nutrients)' },
    ],
    connectivity: {
      status: 'online',
      lastSync: '3 minutes ago',
    },
    nutrients: {
      status: 'low',
      message: 'Nutrient needs refilling',
    },
    phData: {
      current: 6.2,
      history: [
        { time: '6:00 pm', value: 6.3 },
        { time: '6:02 pm', value: 6.5 },
        { time: '6:04 pm', value: 6.8 },
        { time: '6:06 pm', value: 7.0 },
        { time: '6:08 pm', value: 6.9 },
        { time: '6:10 pm', value: 6.7 },
        { time: '6:12 pm', value: 6.4 },
        { time: '6:14 pm', value: 6.2 },
      ],
    },
    sensors: {
      ecLevel: { value: 24, unit: 'mS/cm' },
      tds: { value: 950, unit: 'ppm' },
      waterLevel: { value: 82, unit: '%' },
      turbidity: { value: 1, unit: 'NTU' },
    },
    environment: {
      temperature: { value: 24.7, unit: '°C' },
      humidity: { value: 68, unit: '%' },
      lightIntensity: { value: 9000, unit: 'Lux' },
      co2Level: { value: 415, unit: 'ppm' },
    },
  };
}

// pH Chart Component with animation
function PhChart({ data, currentValue }) {
  if (!data || data.length === 0) return null;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.05;

  const chartMin = minVal - padding;
  const chartMax = maxVal + padding;
  const chartRange = chartMax - chartMin;

  const barWidth = 100 / data.length;

  return (
    <div className="ph-chart-container">
      <div className="ph-chart">
        {data.map((point, idx) => {
          const heightPercent = ((point.value - chartMin) / chartRange) * 70 + 30;
          return (
            <div
              key={idx}
              className="ph-bar-wrapper"
              style={{ width: `${barWidth}%` }}
            >
              <div
                className="ph-bar"
                style={{
                  height: `${heightPercent}%`,
                  animationDelay: `${idx * 50}ms`,
                }}
                title={`${point.time}: ${point.value} pH`}
              />
              <div className="ph-time-label">{point.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const data = useDashboardData();

  return (
    <div className="user-dashboard" role="main" aria-live="polite">
      {/* Header with greeting and settings */}
      <header className="dashboard-header">
        <div className="greeting">
          <IconLeaf size={24} color="#16a34a" />
          <h1>Hello, {data.user.name}</h1>
        </div>
        <button className="settings-btn" aria-label="Settings">
          <IconSettings size={24} color="#333" />
        </button>
      </header>

      {/* Device Carousel (single device for now) */}
      <section className="device-carousel">
        <div className="device-card">
          <div className="device-image">
            {data.device.image ? (
              <img src={data.device.image} alt={data.device.name} />
            ) : (
              <div className="device-placeholder">
                <IconLeaf size={48} color="#ffffff" />
              </div>
            )}
          </div>
          <div className="device-info">
            <h2>{data.device.name}</h2>
            <p className="device-id">ID: {data.device.id}</p>
            <IconChevronRight size={20} color="#fff" />
          </div>
        </div>
      </section>

      {/* Alert Summary */}
      {data.alerts && data.alerts.length > 0 && (
        <section className="alert-summary">
          <div className="alert-header">
            <IconAlertTriangle size={20} color="#dc2626" />
            <h3>Alert Summary</h3>
          </div>
          {data.alerts.map((alert, idx) => (
            <div key={idx} className={`alert-item severity-${alert.severity}`}>
              {alert.message}
            </div>
          ))}
          <button className="alert-expand">
            <IconChevronRight size={16} color="#666" />
          </button>
        </section>
      )}

      {/* Connectivity and Sync Status */}
      <div className="status-row">
        <div className="status-card connectivity">
          <IconWifiCheck size={20} color="#16a34a" />
          <div>
            <div className="status-label">Connectivity</div>
            <div className="status-value online">{data.connectivity.status}</div>
          </div>
        </div>
        <div className="status-card sync">
          <div>
            <div className="status-label">Last Data Sync</div>
            <div className="status-value">{data.connectivity.lastSync}</div>
          </div>
        </div>
      </div>

      {/* Nutrient Status */}
      <section className="nutrient-card">
        <div className="nutrient-header">
          <IconDroplet size={20} color="#0ea5e9" />
          <h3>Nutrients</h3>
        </div>
        <div className="nutrient-status">
          <IconArrowUp size={18} color="#16a34a" />
          <span className={`status-${data.nutrients.status}`}>
            {data.nutrients.status.charAt(0).toUpperCase() + data.nutrients.status.slice(1)} ({data.nutrients.message})
          </span>
        </div>
      </section>

      {/* pH Levels Chart */}
      <section className="ph-section">
        <div className="ph-header">
          <h3>pH Levels over time</h3>
          <p className="ph-subtitle">{data.device.name}</p>
        </div>
        <PhChart data={data.phData.history} currentValue={data.phData.current} />
        <div className="current-ph">
          <span className="ph-label">Current pH Level:</span>
          <span className="ph-value">{data.phData.current} pH</span>
        </div>
      </section>

      {/* Sensor Data Grid */}
      <section className="sensor-grid">
        <div className="sensor-card large-ph">
          <div className="sensor-value">{data.phData.current}</div>
          <div className="sensor-label">PH</div>
        </div>
        <div className="sensor-card">
          <div className="sensor-label">EC Levels</div>
          <div className="sensor-value">{data.sensors.ecLevel.value} {data.sensors.ecLevel.unit}</div>
        </div>
        <div className="sensor-card">
          <div className="sensor-label">TDS</div>
          <div className="sensor-value">{data.sensors.tds.value} {data.sensors.tds.unit}</div>
        </div>
        <div className="sensor-card">
          <div className="sensor-label">Water Level</div>
          <div className="sensor-value">{data.sensors.waterLevel.value} {data.sensors.waterLevel.unit}</div>
        </div>
        <div className="sensor-card">
          <div className="sensor-label">Turbidity</div>
          <div className="sensor-value">{data.sensors.turbidity.value} {data.sensors.turbidity.unit}</div>
        </div>
      </section>

      {/* Environment Conditions */}
      <section className="environment-section">
        <h3>Environment Conditions</h3>
        <div className="environment-grid">
          <div className="env-item">
            <IconThermometer size={20} color="#666" />
            <span className="env-label">Temperature</span>
            <span className="env-value">{data.environment.temperature.value} {data.environment.temperature.unit}</span>
          </div>
          <div className="env-item">
            <IconDroplet size={20} color="#0ea5e9" />
            <span className="env-label">Humidity</span>
            <span className="env-value">{data.environment.humidity.value} {data.environment.humidity.unit}</span>
          </div>
          <div className="env-item">
            <IconSun size={20} color="#f59e0b" />
            <span className="env-label">Light Intensity</span>
            <span className="env-value">{data.environment.lightIntensity.value.toLocaleString()} {data.environment.lightIntensity.unit}</span>
          </div>
          <div className="env-item">
            <IconCloud size={20} color="#666" />
            <span className="env-label">CO₂ Level</span>
            <span className="env-value">{data.environment.co2Level.value} {data.environment.co2Level.unit}</span>
          </div>
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-btn active" aria-current="page">
          <IconLeaf size={24} color="#2E8B57" />
          <span>Tanom</span>
        </button>
        <button className="nav-btn">
          <IconBell size={24} color="#888" />
          <span>Alerts</span>
        </button>
        <button className="nav-btn">
          <IconUser size={24} color="#888" />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
