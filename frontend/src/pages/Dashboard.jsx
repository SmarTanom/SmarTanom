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
  User
} from 'lucide-react';
import { MdScience } from 'react-icons/md';

// Simple hash function to seed PRNG from device ID
const hashStringToSeed = (str) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

// Seeded PRNG (mulberry32)
const mulberry32 = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Generate pH history with seeded randomness
const generatePHHistory = (rng) => {
  const points = [];
  const baseValues = [6.1, 6.15, 6.2, 6.25, 6.3, 6.35, 6.4, 6.5, 6.55, 6.6, 6.55, 6.5, 6.45, 6.4, 6.35, 6.3];
  for (let i = 0; i < 60; i++) {
    const baseIdx = i % baseValues.length;
    const noise = (rng() - 0.5) * 0.08;
    points.push(Math.min(6.6, Math.max(6.0, baseValues[baseIdx] + noise)));
  }
  return points;
};

// Generate per-device mock data
const generateDeviceData = (deviceId) => {
  const seed = hashStringToSeed(deviceId);
  const rng = mulberry32(seed);
  
  const connectivity = rng() > 0.2 ? 'Online' : 'Offline';
  const syncMinutes = Math.floor(rng() * 60) + 1;
  const lastSyncLabel = syncMinutes === 1 ? '1 minute ago' : `${syncMinutes} minutes ago`;
  
  const alerts = [
    'EC too low (Inadequate nutrients)',
    'pH trending high - check solution',
    'Water level below threshold',
    'Temperature outside optimal range'
  ];
  const alertText = alerts[Math.floor(rng() * alerts.length)];
  
  const nutrients = ['Low (Nutrient needs refilling)', 'Optimal', 'High (Reduce concentration)'];
  const nutrientText = nutrients[Math.floor(rng() * nutrients.length)];
  
  return {
    alertText,
    connectivity,
    lastSyncLabel,
    nutrientText,
    phHistory: generatePHHistory(mulberry32(seed + 1000)),
    sensors: {
      ec: 0.8 + rng() * 2.0,
      tds: 400 + rng() * 800,
      waterLevel: 60 + rng() * 35,
      turbidity: 1.5 + rng() * 3.0
    },
    environment: {
      temperature: 20 + rng() * 8,
      humidity: 50 + rng() * 30,
      light: 5000 + rng() * 10000
    }
  };
};

// Initialize devices with per-device data
const initDevices = () => [
  { name: 'Porch SmarTanom', id: '0000000001', image: '/favicon.png', data: generateDeviceData('0000000001') },
  { name: 'Greenhouse A', id: 'GH-A-01', image: '/favicon.png', data: generateDeviceData('GH-A-01') },
  { name: 'Indoor Rack', id: 'RACK-02', image: '/favicon.png', data: generateDeviceData('RACK-02') },
];

const devices = initDevices();

function PHBar({ v, i }) {
  const min = 6.0;
  const max = 6.6;
  const clamped = Math.min(max, Math.max(min, v));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <div className="ph-bar-wrapper" aria-label={`pH ${v.toFixed(1)}`}>
      <div className="ph-bar" style={{ height: `${pct}%`, animationDelay: `${Math.min(i * 20, 800)}ms` }} />
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

  const currentDevice = devices[activeIdx];
  const data = currentDevice.data;
  const currentPH = useMemo(() => data.phHistory[data.phHistory.length - 1].toFixed(1), [activeIdx]);

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="dash-header" role="banner">
        <h1 className="dash-header-title">
          Hello, User <span className="dash-header-emoji">🌿</span>
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
            <div className="icon-circle">
              <AlertCircle size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <button className="alert-card-expand" aria-label="Open alerts">
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
          <h3 className="alert-card-title">Alert Summary</h3>
          <div className="alert-card-message">{data.alertText}</div>
        </section>
        {/* Connectivity & Sync */}
        <section className="status-grid" aria-label="Status">
          <div className="status-box">
            <div className="icon-circle">
              <Wifi size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Connectivity</span>
              <span className={`status-value ${data.connectivity === 'Online' ? 'status-online' : 'status-offline'}`}>{data.connectivity}</span>
            </div>
          </div>
          <div className="status-box">
            <div className="icon-circle">
              <RefreshCw size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Last Data Sync</span>
              <span className="status-value">{data.lastSyncLabel}</span>
            </div>
          </div>
        </section>

        {/* Nutrient level */}
        <section className="card nutrient-card" aria-label="Nutrient level">
          <h3 className="nutrient-title">Nutrient Level</h3>
          <div className="nutrient-status">
            <div className="icon-circle">
              <Leaf size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <span className="nutrient-text">{data.nutrientText}</span>
          </div>
        </section>

        {/* pH levels over time */}
        <section className="card ph-card" aria-label="pH levels over time">
          <div className="ph-card-header">
            <div className="icon-circle">
              <Activity size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <span className="ph-card-title">pH Levels over time</span>
            <button className="range-switch" aria-label="Change range">Days ▾</button>
          </div>
          <div className="ph-legend">
            <span className="ph-legend-dot"></span>
            <span className="ph-legend-label">{currentDevice.name}</span>
          </div>
          <div className="ph-chart-container">
            <div className="ph-y-axis">
              <span className="ph-y-label">6.6 pH</span>
              <span className="ph-y-label">6.5 pH</span>
              <span className="ph-y-label">6.4 pH</span>
              <span className="ph-y-label">6.3 pH</span>
              <span className="ph-y-label">6.2 pH</span>
              <span className="ph-y-label">6.1 pH</span>
              <span className="ph-y-label">6.0 pH</span>
            </div>
            <div className="ph-bars" role="img" aria-label="pH chart">
              {data.phHistory.map((v, i) => (
                <PHBar key={i} v={v} i={i} />
              ))}
            </div>
          </div>
          <div className="ph-x-axis">
            {[0, 0, 0, 0, 0, 0, 0].map((_, i) => (
              <span key={i} className="ph-x-label">0</span>
            ))}
          </div>
        </section>

        {/* Current pH level */}
        <section className="card current-ph" aria-label="Current pH">
          <div className="current-ph-left">
            <div className="icon-circle">
              <Activity size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <span className="current-ph-label">Current pH level</span>
          </div>
          <span className="current-ph-value">{currentPH} pH</span>
        </section>

        {/* Sensor grid */}
        <section className="sensor-grid" aria-label="Sensor data">
          <div className="sensor-cell">
            <div className="icon-circle">
              <Zap size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">EC Levels</span>
              <span className="sensor-value">{data.sensors.ec.toFixed(1)} mS/cm</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Waves size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">TDS</span>
              <span className="sensor-value">{Math.round(data.sensors.tds)} ppm</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplet size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Level</span>
              <span className="sensor-value">{Math.round(data.sensors.waterLevel)}%</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplets size={20} color="#32A86D" strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Turbidity</span>
              <span className="sensor-value">{data.sensors.turbidity.toFixed(1)} NTU</span>
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="card environment-card" aria-label="Environment conditions">
          <h3 className="environment-title">Environment Conditions</h3>
          <div className="environment-list">
            <div className="environment-row">
              <div className="icon-circle">
                <Thermometer size={20} color="#32A86D" strokeWidth={2.5} />
              </div>
              <span className="environment-label">Temperature</span>
              <span className="environment-value">{data.environment.temperature.toFixed(1)}°C</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Wind size={20} color="#32A86D" strokeWidth={2.5} />
              </div>
              <span className="environment-label">Humidity</span>
              <span className="environment-value">{Math.round(data.environment.humidity)}%</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Sun size={20} color="#32A86D" strokeWidth={2.5} />
              </div>
              <span className="environment-label">Light Intensity</span>
              <span className="environment-value">{Math.round(data.environment.light).toLocaleString()} Lux</span>
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
