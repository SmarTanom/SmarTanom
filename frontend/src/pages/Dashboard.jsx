import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  IconLeaf, IconAlert, IconWifi, IconSync, IconDroplet, IconPH, IconEC, IconTDS, 
  IconWaterLevel, IconTurbidity, IconTemp, IconHumidity, IconLight 
} from '../components/icons/index.jsx';
import {
  IconSettings, IconUsers, IconUser, IconChevronRight, IconArrowUp, IconCloud, IconWifiCheck
} from '../components/icons/DashboardIcons.jsx';
import '../assets/styles/Dashboard.css';
import '../assets/styles/UserDashboard.css';

// Mock data hook matching reference image
function useDashboardData(user) {
  return useMemo(() => ({
    device: { 
      name: 'Porch SmarTanom', 
      id: 'ID: 000000001',
      image: '/placeholder-plant.jpg' // placeholder
    },
    alert: { level: 'error', msg: 'EC too low (Inadequate nutrients)' },
    connectivity: { status: 'Online', icon: 'check' },
    lastSync: '3 minutes ago',
    nutrientStatus: { level: 'Low', msg: 'Nutrient needs refilling', trend: 'up' },
    phHistory: [
      {time:'6:0 pm',val:6.5},{time:'6:1 pm',val:6.3},{time:'6:2 pm',val:6.6},{time:'6:3 pm',val:6.4},
      {time:'6:4 pm',val:6.8},{time:'6:5 pm',val:6.9},{time:'6:6 pm',val:7.2},{time:'6:7 pm',val:7.0},
      {time:'6:8 pm',val:6.5},{time:'6:9 pm',val:6.2},{time:'7:0 pm',val:6.4},{time:'7:1 pm',val:6.2}
    ],
    currentPH: 6.2,
    ecLevels: { msPerCm: 24, ppm: 950 },
    waterLevel: 82,
    turbidity: 1,
    environment: {
      temperature: '24.7°C',
      humidity: '68%',
      light: '9,000 Lux',
      co2: '415 ppm'
    }
  }), [user]);
}

// Bar chart for pH levels over time with proper scaling
function PHBarChart({ data }) {
  if (!data?.length) return null;
  const vals = data.map(d => d.val);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min;
  
  // Calculate percentage for better visual distribution
  const getHeight = (val) => {
    if (range === 0) return 50;
    return ((val - min) / range) * 70 + 30; // 30-100% range for better visuals
  };
  
  return (
    <div className="ph-bar-chart">
      <div className="ph-bar-container">
        {data.map((d, i) => (
          <div key={i} className="ph-bar-wrapper">
            <div 
              className="ph-bar" 
              style={{ 
                height: `${getHeight(d.val)}%`,
                animationDelay: `${i * 50}ms`
              }}
              aria-label={`${d.time}: ${d.val} pH`}
              title={`${d.time}: pH ${d.val}`}
            />
            {i % 2 === 0 && <span className="ph-bar-label">{d.time}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple metric card with icon
function MetricCard({ icon: Icon, label, value, size = 'normal' }) {
  return (
    <div className={`metric-card ${size}`}>
      <Icon size={size === 'large' ? 28 : 22} color="#0a7a35" strokeWidth={2} />
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const data = useDashboardData(user);

  const handleSignOut = async () => {
    try { await signOut(); navigate('/', { replace: true }); } catch (e) { console.error(e); }
  };

  return (
    <div className="user-dashboard-root">
      {/* Header with greeting and settings */}
      <header className="ud-header-new">
        <div className="ud-greeting">
          <h1>Hello, {user?.username || 'User'}</h1>
          <IconLeaf size={24} color="#0a7a35" strokeWidth={2.5} />
        </div>
        <button className="ud-settings-btn" aria-label="Settings">
          <IconSettings size={24} color="#666" strokeWidth={2} />
        </button>
      </header>

      <main className="ud-main-new">
        {/* Device Card */}
        <section className="ud-device-hero">
          <div className="device-card">
            <div className="device-image">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23c8e6c9' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' font-size='48' text-anchor='middle' dy='.3em'%3E🌱%3C/text%3E%3C/svg%3E" alt="Plant" />
            </div>
            <div className="device-info">
              <h2>{data.device.name}</h2>
              <p className="device-id">{data.device.id}</p>
            </div>
            <button className="device-chevron" aria-label="View device details">
              <IconChevronRight size={24} color="#757575" />
            </button>
          </div>
        </section>

        {/* Alert Summary */}
        <section className="ud-alert-summary">
          <div className="alert-header">
            <IconAlert size={20} color="#d32f2f" strokeWidth={2} />
            <span>Alert Summary</span>
            <button className="alert-expand">›</button>
          </div>
          <div className={`alert-message alert-${data.alert.level}`}>
            {data.alert.msg}
          </div>
        </section>

        {/* Status Row */}
        <section className="ud-status-row">
          <div className="status-item">
            <div className="status-icon connectivity">
              <IconWifiCheck size={22} color="#4caf50" strokeWidth={2.5} />
            </div>
            <div className="status-content">
              <div className="status-label">Connectivity</div>
              <div className="status-value status-online">{data.connectivity.status}</div>
            </div>
          </div>
          <div className="status-item">
            <div className="status-icon sync">
              <IconSync size={20} color="#4caf50" strokeWidth={2} />
            </div>
            <div className="status-content">
              <div className="status-label">Last Synced</div>
              <div className="status-value">{data.lastSync}</div>
            </div>
          </div>
        </section>

        {/* Nutrient Status */}
        <section className="ud-nutrient-status">
          <div className="nutrient-header">
            <IconDroplet size={20} color="#0a7a35" strokeWidth={2} />
            <span>Nutrients</span>
          </div>
          <div className="nutrient-alert">
            <IconArrowUp size={16} color="#0a7a35" strokeWidth={2.5} />
            <span className="nutrient-level">{data.nutrientStatus.level}</span>
            <span className="nutrient-message">({data.nutrientStatus.msg})</span>
          </div>
        </section>

        {/* pH Chart */}
        <section className="ud-ph-section">
          <div className="ph-chart-header">
            <IconDroplet size={18} color="#0a7a35" strokeWidth={2} />
            <span>pH Levels over time</span>
            <button className="ph-days-btn">Days ›</button>
          </div>
          <PHBarChart data={data.phHistory} />
        </section>

        {/* Current Metrics Grid */}
        <section className="ud-metrics-grid">
          <MetricCard icon={IconPH} label="Current pH level" value={`${data.currentPH} PH`} size="large" />
          <MetricCard icon={IconEC} label="EC Levels" value={`${data.ecLevels.msPerCm} mS/cm`} />
          <MetricCard icon={IconTDS} label="EC Levels" value={`${data.ecLevels.ppm} ppm`} />
        </section>

        {/* Water & Turbidity */}
        <section className="ud-metrics-grid">
          <MetricCard icon={IconWaterLevel} label="Water Level" value={`${data.waterLevel}%`} />
          <MetricCard icon={IconTurbidity} label="Turbidity" value={`${data.turbidity} NTU`} />
        </section>

        {/* Environment Conditions */}
        <section className="ud-environment">
          <h3 className="env-title">Environment Conditions</h3>
          <div className="env-grid">
            <div className="env-item">
              <IconTemp size={20} color="#0a7a35" strokeWidth={2} />
              <div className="env-content">
                <div className="env-label">Temperature</div>
                <div className="env-value">{data.environment.temperature}</div>
              </div>
            </div>
            <div className="env-item">
              <IconHumidity size={20} color="#0a7a35" strokeWidth={2} />
              <div className="env-content">
                <div className="env-label">Humidity</div>
                <div className="env-value">{data.environment.humidity}</div>
              </div>
            </div>
            <div className="env-item">
              <IconLight size={20} color="#0a7a35" strokeWidth={2} />
              <div className="env-content">
                <div className="env-label">Light Intensity</div>
                <div className="env-value">{data.environment.light}</div>
              </div>
            </div>
            <div className="env-item">
              <IconCloud size={20} color="#0a7a35" strokeWidth={2} />
              <div className="env-content">
                <div className="env-label">CO₂ Level</div>
                <div className="env-value">{data.environment.co2}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="ud-bottom-nav-new">
        <button className="nav-btn active" aria-label="Team">
          <IconUsers size={24} strokeWidth={2} />
          <span>Team</span>
        </button>
        <button className="nav-btn" aria-label="Alerts">
          <IconAlert size={24} strokeWidth={2} />
          <span>Alerts</span>
        </button>
        <button className="nav-btn" aria-label="Profile">
          <IconUser size={24} strokeWidth={2} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
