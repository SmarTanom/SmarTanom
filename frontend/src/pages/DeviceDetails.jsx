import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// Mock log entries
const mockLogEntries = [
  {
    id: 1,
    type: 'warning',
    title: 'Inadequate nutrients',
    message: 'This SmarTanom EC is low (10 mS/cm refill: Part A (Calcium Nitrate) and Part B (Micronutrient mix).',
    time: '1m',
    date: '05/06/25'
  },
  {
    id: 2,
    type: 'success',
    title: 'New cycle started',
    message: 'You just started a new cycle, time to grow new plants.',
    time: '5m',
    date: '05/06/25'
  },
  {
    id: 3,
    type: 'harvest',
    title: 'Ready for harvest',
    message: 'Your SmarTanom is now ready for harvest. Harvest now to start a new cycle of plants.',
    time: '05/06/25',
    date: '05/06/25'
  },
  {
    id: 4,
    type: 'warning',
    title: 'Low water levels',
    message: 'Low water level detected. Refill reservoir with fresh water.',
    time: '05/06/25',
    date: '05/06/25'
  }
];

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('plants');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest

  const device = mockDevices[deviceId] || mockDevices['D000000001'];

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const sortedLogEntries = [...mockLogEntries].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.id - a.id; // Newest first
    }
    return a.id - b.id; // Oldest first
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'warning':
        return <TriangleAlert size={20} color="#E1554A" strokeWidth={2.5} />;
      case 'success':
        return <CircleAlert size={20} color="#32A86D" strokeWidth={2.5} />;
      case 'harvest':
        return <Sprout size={20} color="#32A86D" strokeWidth={2.5} />;
      default:
        return <CircleAlert size={20} color="#8BA797" strokeWidth={2.5} />;
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="device-details-root">
      {/* Header with background image */}
      <header className="device-header" style={{ backgroundImage: `url(${device.image})` }}>
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
        <h1 className="device-info-title">{device.name}</h1>
        <p className="device-info-id">ID: {device.id}</p>
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
              <Clock size={20} color="#32A86D" strokeWidth={2.5} />
              <p className="harvest-estimate-text">{device.plant.estimatedHarvestMessage}</p>
            </div>

            {/* Plant status */}
            <div className="plant-status-card">
              <Sprout size={18} color="#32A86D" strokeWidth={2.5} />
              <span className="plant-status-text">{device.plant.status}</span>
            </div>

            {/* Plant card */}
            <div className="plant-card">
              <div className="plant-card-image">
                <img src={device.plant.image} alt={device.plant.name} />
              </div>
              <div className="plant-card-info">
                <h3 className="plant-card-name">{device.plant.name}</h3>
                <p className="plant-card-variety">{device.plant.variety}</p>
              </div>
              <div className="plant-card-harvest">
                <span className="harvest-label">Harvest in</span>
                <span className="harvest-days">{device.plant.daysToHarvest} days</span>
              </div>
            </div>

            {/* Start new cycle button */}
            <button className="start-cycle-button">
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
                <Wifi size={20} color="#32A86D" strokeWidth={2.5} />
                <span className="settings-item-label">Connectivity</span>
              </div>
              <div className="settings-item-right">
                <span className="settings-item-value">Connected via Wifi</span>
                <ChevronRight size={20} color="#8BA797" />
              </div>
            </button>

            <button className="settings-item" onClick={() => console.log('Sensor Settings')}>
              <div className="settings-item-left">
                <Gauge size={20} color="#32A86D" strokeWidth={2.5} />
                <span className="settings-item-label">Sensor Settings</span>
              </div>
              <ChevronRight size={20} color="#8BA797" />
            </button>

            <button className="settings-item" onClick={() => console.log('Cycle Settings')}>
              <div className="settings-item-left">
                <RefreshCw size={20} color="#32A86D" strokeWidth={2.5} />
                <span className="settings-item-label">Cycle Settings</span>
              </div>
              <ChevronRight size={20} color="#8BA797" />
            </button>

            <button className="settings-item" onClick={() => console.log('SmarTanom Sync Settings')}>
              <div className="settings-item-left">
                <Database size={20} color="#32A86D" strokeWidth={2.5} />
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
