import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../assets/styles/UserDashboard.css';
import {
  Leaf,
  Settings,
  ChevronRight,
  AlertCircle,
  Wifi,
  RefreshCw,
  Droplets,
  Activity,
  Zap,
  Waves,
  Droplet,
  Thermometer,
  Wind,
  Sun,
  Cloud,
  User
} from 'lucide-react';

// Demo data (replace with API data later)
const devices = [
  { name: 'Porch SmarTanom', id: '0000000001', image: '/favicon.png' },
  { name: 'Greenhouse A', id: 'GH-A-01', image: '/favicon.png' },
  { name: 'Indoor Rack', id: 'RACK-02', image: '/favicon.png' },
];

const phHistory = [6.0, 6.1, 6.2, 6.3, 6.6, 6.2, 6.1, 6.2, 6.3, 6.25, 6.15, 6.2];

function PHBar({ v, i }) {
  const min = 6.0;
  const max = 6.6;
  const clamped = Math.min(max, Math.max(min, v));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <div className="ph-bar-wrapper" aria-label={`pH ${v.toFixed(1)}`}>
      <div className="ph-bar" style={{ height: `${pct}%`, animationDelay: `${i * 60}ms` }} />
      <div className="ph-bar-label">{v.toFixed(1)}</div>
    </div>
  );
}

export default function Dashboard() {
  const carouselRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Roughly compute active card based on scroll position
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth; // viewport width of carousel
      const cardW = w * 0.85; // matches flex-basis 85vw
      const gap = 16; // approximate gap from CSS
      const idx = Math.round(el.scrollLeft / (cardW + gap));
      setActiveIdx(Math.max(0, Math.min(devices.length - 1, idx)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const currentPH = useMemo(() => phHistory[phHistory.length - 1].toFixed(1), []);

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="dash-header" role="banner">
        <h1 className="dash-header-title">
          Hello, User <Leaf size={24} color="#32A86D" aria-hidden="true" />
        </h1>
        <button className="dash-header-settings" aria-label="Settings">
          <Settings size={24} color="#32A86D" />
        </button>
      </header>

      {/* Device carousel */}
      <section className="device-carousel-wrapper" aria-label="Your devices">
        <div className="device-carousel" ref={carouselRef}>
          {devices.map((d, i) => (
            <article className="device-card tap" key={d.id} aria-label={`${d.name} ${d.id}`}>
              <div className="device-card-media" aria-hidden="true">
                <img src={d.image} alt="Device" />
              </div>
              <div className="device-card-info">
                <div>
                  <h3 className="device-name">{d.name}</h3>
                  <p className="device-id">ID: {d.id}</p>
                </div>
                <div className="device-card-arrow">
                  <ChevronRight size={18} />
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="carousel-dots" role="tablist" aria-label="Device position">
          {devices.map((_, i) => (
            <span key={i} className={`carousel-dot ${i === activeIdx ? 'active' : ''}`} role="tab" aria-selected={i === activeIdx} />
          ))}
        </div>
      </section>

      <main className="dash-main" role="main">
        {/* Alert Summary */}
        <section className="card alert-card" aria-label="Alert summary">
          <div className="alert-card-top">
            <div className="alert-icon-wrapper">
              <AlertCircle size={24} color="#32A86D" strokeWidth={2.5} />
            </div>
            <button className="alert-card-expand" aria-label="Open alerts">
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
          <h3 className="alert-card-title">Alert Summary</h3>
          <div className="alert-card-message">EC too low (Inadequate nutrients)</div>
        </section>
        {/* Connectivity & Sync */}
        <section className="status-grid" aria-label="Status">
          <div className="status-box">
            <div className="status-icon-wrapper">
              <Wifi size={24} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Connectivity</span>
              <span className="status-value status-online">Online</span>
            </div>
          </div>
          <div className="status-box">
            <div className="status-icon-wrapper">
              <RefreshCw size={24} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Last Data Sync</span>
              <span className="status-value">3 minutes ago</span>
            </div>
          </div>
        </section>

        {/* Nutrient level */}
        <section className="card nutrient-card" aria-label="Nutrient level">
          <h3 className="nutrient-title">Nutrient Level</h3>
          <div className="nutrient-status">
            <Leaf size={20} color="#32A86D" strokeWidth={2.5} />
            <span className="nutrient-text">Low (Nutrient needs refilling)</span>
          </div>
        </section>

        {/* pH levels over time */}
        <section className="card ph-card" aria-label="pH levels over time">
          <div className="ph-card-header">
            <Activity size={20} color="#32A86D" />
            <span className="ph-card-title">pH Levels over time</span>
            <button className="range-switch" aria-label="Change range">Days ▾</button>
          </div>
          <div className="ph-legend">
            <span className="ph-legend-dot"></span>
            <span className="ph-legend-label">Porch SmarTanom</span>
          </div>
          <div className="ph-bars" role="img" aria-label="pH chart">
            {phHistory.map((v, i) => (
              <PHBar key={i} v={v} i={i} />
            ))}
          </div>
        </section>

        {/* Current pH level */}
        <section className="card current-ph" aria-label="Current pH">
          <div className="current-ph-icon-label">
            <Activity size={20} color="#32A86D" />
            <span className="current-ph-label">Current pH level</span>
          </div>
          <span className="current-ph-value">{currentPH} pH</span>
        </section>

        {/* Sensor grid */}
        <section className="sensor-grid" aria-label="Sensor data">
          <div className="sensor-cell">
            <Zap size={24} color="#32A86D" />
            <div className="sensor-cell-content">
              <span className="sensor-label">EC Levels</span>
              <span className="sensor-value">2.4 mS/cm</span>
            </div>
          </div>
          <div className="sensor-cell">
            <Waves size={24} color="#32A86D" />
            <div className="sensor-cell-content">
              <span className="sensor-label">TDS</span>
              <span className="sensor-value">950 ppm</span>
            </div>
          </div>
          <div className="sensor-cell">
            <Droplet size={24} color="#32A86D" />
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Level</span>
              <span className="sensor-value">85%</span>
            </div>
          </div>
          <div className="sensor-cell">
            <Droplets size={24} color="#32A86D" />
            <div className="sensor-cell-content">
              <span className="sensor-label">Turbidity</span>
              <span className="sensor-value">3 NTU</span>
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="card environment-card" aria-label="Environment conditions">
          <h3 className="environment-title">Environment Conditions</h3>
          <div className="environment-list">
            <div className="environment-row">
              <Thermometer size={20} color="#32A86D" />
              <span className="environment-label">Temperature</span>
              <span className="environment-value">24.2°C</span>
            </div>
            <div className="environment-row">
              <Wind size={20} color="#32A86D" />
              <span className="environment-label">Humidity</span>
              <span className="environment-value">68%</span>
            </div>
            <div className="environment-row">
              <Sun size={20} color="#32A86D" />
              <span className="environment-label">Light Intensity</span>
              <span className="environment-value">9,000 Lux</span>
            </div>
            <div className="environment-row">
              <Cloud size={20} color="#32A86D" />
              <span className="environment-label">CO₂ Level</span>
              <span className="environment-value">415 ppm</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item active" aria-current="page">
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item">
          <AlertCircle size={20} />
          <span>Alerts</span>
        </button>
        <button className="nav-item">
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
