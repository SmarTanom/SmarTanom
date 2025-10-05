import React from 'react';
import '../assets/styles/UserDashboard.css';
import {
  IconLeaf,
  IconSettings,
  IconChevronRight,
  IconAlert,
  IconWifi,
  IconSync,
  IconDroplet,
  IconPH,
  IconEC,
  IconTDS,
  IconWaterLevel,
  IconTemp,
  IconHumidity,
  IconLight,
  IconArrowUp,
  IconCloud,
  IconUsers,
  IconUser
} from '../components/icons/index.jsx';

// Mock data (to be replaced with API integration later)
const phHistory = [6.2, 6.1, 6.3, 6.4, 6.5, 6.2, 6.3];
const metrics = [
  { label: 'NUTRIENTS (EC)', value: '1.8 mS/cm', icon: IconEC },
  { label: 'TDS', value: '950 ppm', icon: IconTDS },
  { label: 'WATER LVL', value: '72 %', icon: IconWaterLevel },
  { label: 'RESERVOIR', value: '18.4 °C', icon: IconTemp },
  { label: 'HUMIDITY', value: '62 %', icon: IconHumidity },
  { label: 'LIGHT', value: '18.2 klux', icon: IconLight },
];

const environment = [
  { label: 'AIR TEMP', value: '24.5 °C', icon: IconTemp },
  { label: 'HUMIDITY', value: '58 %', icon: IconHumidity },
  { label: 'CO2 (est)', value: '640 ppm', icon: IconCloud },
  { label: 'OCCUPANCY', value: '—', icon: IconUsers },
];

const Bar = ({ value, index, max = 7 }) => {
  // Convert pH (approx 5.5 - 6.8 expected) into relative height – clamp inside sensible range
  const clamped = Math.min(Math.max(value, 5.0), 7.0);
  const heightPct = ((clamped - 5.0) / (7.0 - 5.0)) * 100; // 0% at 5.0, 100% at 7.0
  return (
    <div className="ph-bar-wrapper" aria-label={`pH ${value}`}>      
      <div
        className="ph-bar"
        style={{ height: `${heightPct}%`, animationDelay: `${index * 80}ms` }}
      />
      <div className="ph-bar-label">{value.toFixed(1)}</div>
    </div>
  );
};

export default function Dashboard() {
  return (
    <div className="user-dashboard-root">
      {/* Header */}
      <header className="ud-header-new" role="banner">
        <div className="ud-greeting">
          <IconLeaf size={22} color="#0a7a35" aria-hidden="true" />
          <h1>Hello, Grower</h1>
        </div>
        <button className="ud-settings-btn" aria-label="Settings">
          <IconSettings size={22} />
        </button>
      </header>

      <main className="ud-main-new" role="main">
        {/* Device Hero Card */}
        <section className="ud-device-hero" aria-labelledby="device-hero-heading">
          <div className="device-card">
            <div className="device-image" aria-hidden="true">
              <img src="/favicon.png" alt="Device" />
            </div>
            <div className="device-info">
              <h2 id="device-hero-heading">Greenhouse A</h2>
              <p className="device-id">Device ID: GH-A-01</p>
            </div>
            <button className="device-chevron" aria-label="View device details">
              <IconChevronRight size={22} />
            </button>
          </div>
        </section>

        {/* Alert Summary */}
        <section className="ud-alert-summary" aria-labelledby="alert-summary-heading">
          <div className="alert-header">
            <IconAlert size={18} color="#d32f2f" />
            <span id="alert-summary-heading">Alerts</span>
            <button className="alert-expand" aria-label="Expand alerts list">⋯</button>
          </div>
          <div className="alert-message alert-error" role="alert">
            Nutrient EC slightly low – consider adjustment.
          </div>
        </section>

        {/* Status Row */}
        <section className="ud-status-row" aria-label="Status overview">
          <div className="status-item">
            <div className="status-icon connectivity"><IconWifi size={20} /></div>
            <div className="status-content">
              <div className="status-label">Connectivity</div>
              <div className="status-value status-online">Online</div>
            </div>
          </div>
          <div className="status-item">
            <div className="status-icon sync"><IconSync size={20} /></div>
            <div className="status-content">
              <div className="status-label">Sync</div>
              <div className="status-value">2 min ago</div>
            </div>
          </div>
        </section>

        {/* Nutrient Status */}
        <section className="ud-nutrient-status" aria-labelledby="nutrient-status-heading">
          <div className="nutrient-header">
            <IconDroplet size={18} />
            <span id="nutrient-status-heading">Nutrients</span>
          </div>
          <div className="nutrient-alert">
            <span className="nutrient-level">EC 1.8</span>
            <span className="nutrient-message">– within optimal range</span>
          </div>
        </section>

        {/* pH Chart */}
        <section className="ud-ph-section" aria-labelledby="ph-section-heading">
          <div className="ph-chart-header">
            <IconPH size={18} />
            <span id="ph-section-heading">pH (7d)</span>
            <button className="ph-days-btn" aria-label="Change pH range">7d ▾</button>
          </div>
          <div className="ph-bar-chart" role="img" aria-label="pH values over last 7 days">
            <div className="ph-bar-container">
              {phHistory.map((v, i) => <Bar key={i} value={v} index={i} />)}
            </div>
            <div className="ph-chart-title">Daily pH Readings</div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="ud-metrics-grid" aria-label="Key metrics">
          {metrics.map((m, i) => {
            const Ico = m.icon;
            return (
              <div className="metric-card" key={i}>
                <Ico size={22} />
                <div className="metric-content">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Environment Conditions */}
        <section className="ud-environment" aria-labelledby="environment-heading">
          <h3 id="environment-heading" className="env-title">Environment</h3>
          <div className="env-grid">
            {environment.map((e, i) => {
              const EI = e.icon;
              return (
                <div className="env-item" key={i}>
                  <EI size={22} />
                  <div className="env-content">
                    <div className="env-label">{e.label}</div>
                    <div className="env-value">{e.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="ud-bottom-nav-new" aria-label="Primary">
        <button className="nav-btn active" aria-current="page">
          <IconLeaf size={20} />
          <span>Dashboard</span>
        </button>
        <button className="nav-btn">
          <IconWifi size={20} />
          <span>Devices</span>
        </button>
        <button className="nav-btn">
          <IconUser size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
