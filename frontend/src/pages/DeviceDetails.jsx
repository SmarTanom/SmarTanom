import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/DeviceDetails.css';
import {
  ChevronLeft,
  MoreVertical,
  Clock,
  Leaf,
  AlertCircle,
  User,
  ChevronRight,
  ChevronDown,
  TriangleAlert,
  CircleAlert,
  Sprout,
  Wifi,
  Gauge,
  RefreshCw,
  Database,
  Camera,
  Upload,
  X
} from 'lucide-react';

import { getDeviceById, uploadPlantPhoto, resetDeviceWiFi } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';
import { getDeviceReservoirs } from '../services/api/reservoirs.js';
import { listPlants } from '../services/api/plants.js';
import { useRealtimeStore } from '../store/realtimeStore';
import { wsClient } from '../services/websocketClient';

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

// Helper: relative time from ISO (short)
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

// Plant-based classification logic (adapted from AlertsPage)
const DEFAULT_PROXIMITY_MIN = 50; // ppm or units
const DEFAULT_PROXIMITY_MAX = 200;

function computeProximityBuffer(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { low: DEFAULT_PROXIMITY_MIN, high: DEFAULT_PROXIMITY_MIN };
  const span = Math.max(0, max - min);
  const base = span * 0.1; // 10%
  const buf = Math.min(DEFAULT_PROXIMITY_MAX, Math.max(DEFAULT_PROXIMITY_MIN, base));
  return { low: buf, high: buf };
}

function classifyValue(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return { severity: 'none', reason: null };
  }
  const { low: proxLow, high: proxHigh } = computeProximityBuffer(min, max);
  if (value < min) return { severity: 'critical', reason: 'below_min', proxLow, proxHigh };
  if (value > max) return { severity: 'critical', reason: 'above_max', proxLow, proxHigh };
  if (value <= min + proxLow) return { severity: 'warning', reason: 'near_min', proxLow, proxHigh };
  if (value >= max - proxHigh) return { severity: 'warning', reason: 'near_max', proxLow, proxHigh };
  return { severity: 'none', reason: null, proxLow, proxHigh };
}

function classifyTDS(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.ppm_min, plant.ppm_max);
}
function classifyEC(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.ec_min, plant.ec_max);
}
function classifyPH(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.ph_min, plant.ph_max);
}
function classifyWaterTemp(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.water_temp_min, plant.water_temp_max);
}
// Environment metrics removed (light, air temperature, humidity)

// Removed PLANT_RECOMMENDATION_TEMPLATES and recommendations logic; keep API but no-op for safety
function enrichAlertMessage(_plantInfo, _sensorType, _classificationReason, baseMessage) {
  return baseMessage;
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
  const [reservoir, setReservoir] = useState(null);

  // Real-time data integration
  const deviceData = useRealtimeStore(state => state.deviceData[deviceId]);
  const connectWS = useRealtimeStore(state => state.connectWS);
  const fetchInitial = useRealtimeStore(state => state.fetchInitial);
  const totalUnread = useRealtimeStore(state => state.totalUnread);
  const deviceAlertsStore = useRealtimeStore(state => state.deviceAlerts);
  const loadingInitial = useRealtimeStore(state => state.loadingInitial);
  const loadingAlerts = useRealtimeStore(state => state.loadingAlerts);
  const errorAlerts = useRealtimeStore(state => state.errorAlerts);
  const fetchAlertsStore = useRealtimeStore(state => state.fetchAlerts);
  const markAlertAsRead = useRealtimeStore(state => state.markAlertAsRead);
  const markAllDeviceAlertsRead = useRealtimeStore(state => state.markAllDeviceAlertsRead);

  // Plant photo change states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

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

        // Fetch reservoirs for this device and pick the most recent entry
        try {
          const targetId = (dev && (dev.id || dev.device_id)) || id;
          if (targetId) {
            const resResp = await getDeviceReservoirs(targetId);
            const list = (resResp && resResp.results) ? resResp.results : resResp;
            if (mounted) {
              if (Array.isArray(list) && list.length > 0) {
                setReservoir(list[0]); // API orders by -created_at; take latest
              } else {
                setReservoir(null);
              }
            }
          }
        } catch (_e) {
          if (mounted) setReservoir(null);
        }
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

  // Initialize real-time data and WebSocket connection
  useEffect(() => {
    const initRealtime = async () => {
      // Check authentication first
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Initialize real-time store
      await fetchInitial();
    };

    initRealtime();

    // Connect to WebSocket for real-time updates
    const unsub = connectWS();

    return () => {
      unsub && unsub();
    };
  }, [fetchInitial, connectWS, navigate]);

  // Build log entries from store alerts for THIS device only
  useEffect(() => {
    let mounted = true;
    const buildFromStore = async () => {
      try {
        if (activeTab !== 'log') return;
        const didRaw = (device && (device.id || device.device_id)) || deviceId || (location.state && location.state.deviceId);
        if (!didRaw) return;
        const did = Number(didRaw);

        const alerts = (deviceAlertsStore && deviceAlertsStore[did]) || [];
        if ((!alerts || alerts.length === 0) && !loadingAlerts) {
          // Try to refresh if nothing yet
          await fetchAlertsStore();
        }

        const list = (alerts || []).map(a => {
          const iso = a.timestamp || a.created_at || new Date().toISOString();
          const severity = a.severity || a.type || 'info';
          return {
            id: a.id || a.reading_id || `${did}:${iso}`,
            readingId: a.reading_id || a.id,
            type: severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'info'),
            title: a.title || 'Alert',
            message: a.body || a.message || '',
            time: relativeTimeFromISO(iso),
            date: new Date(iso).toLocaleDateString(),
            createdAt: iso,
            isRead: !!a.is_read,
          };
        });

        if (mounted) setLogEntries(list);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('DeviceDetails: failed to build alerts from store', e);
        if (mounted) setLogEntries([]);
      }
    };
    buildFromStore();
    return () => { mounted = false; };
  }, [activeTab, device, deviceId, location.state, deviceAlertsStore, loadingAlerts, fetchAlertsStore]);

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
  // Removed in-component alert/log rendering; LOG tab will navigate to AlertsPage.

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // Photo change handlers
  const handleOpenPhotoModal = () => {
    setShowPhotoModal(true);
    setPhotoError(null);
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoError(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Please select a valid image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoError(null);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      setPhotoError('Please select a photo first');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const deviceIdToUse = device?.id || deviceId;
      console.log('📸 Uploading photo for device:', deviceIdToUse);
      console.log('📄 File details:', {
        name: photoFile.name,
        type: photoFile.type,
        size: photoFile.size
      });

      const response = await uploadPlantPhoto(deviceIdToUse, photoFile);
      console.log('✅ Upload successful:', response);

      // Update device with new photo URL
      setDevice(prev => ({
        ...prev,
        plant_photo_url: response.plant_photo_url || response.data?.plant_photo_url
      }));

      // Clean up and close modal
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      handleClosePhotoModal();

    } catch (error) {
      console.error('❌ Failed to upload photo:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });

      // Show more specific error messages
      let errorMessage = 'Failed to upload photo. Please try again.';
      if (error.status === 403) {
        errorMessage = 'Permission denied. Only the device owner can upload photos.';
      } else if (error.status === 400) {
        errorMessage = error.data?.error || 'Invalid photo file. Please try a different image.';
      }

      setPhotoError(errorMessage);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResetWiFi = async () => {
    if (!device || !device.id) {
      alert('Device not found');
      return;
    }

    // Confirm action with user
    const confirmMessage =
      `⚠️ WiFi Reset Confirmation\n\n` +
      `This will:\n` +
      `• Clear saved WiFi credentials from the device\n` +
      `• Restart the device into Access Point mode\n` +
      `• Require you to reconnect to the device's WiFi network\n` +
      `• Require WiFi setup again\n\n` +
      `Device: ${device.device_name || device.device_serial}\n\n` +
      `Are you sure you want to reset WiFi?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log(`[WiFi Reset] Triggering reset for device ${device.id}`);

      const response = await resetDeviceWiFi(device.id);

      // eslint-disable-next-line no-console
      console.log('[WiFi Reset] Success:', response);

      // Show success message
      alert(
        `✅ WiFi Reset Triggered!\n\n` +
        `Device: ${device.device_serial}\n\n` +
        `Next Steps:\n` +
        `1. Wait for device to restart (30-60 seconds)\n` +
        `2. Connect to WiFi: ${device.device_serial}\n` +
        `3. Password: smartanom${device.device_serial}\n` +
        `4. Follow setup wizard to configure new WiFi`
      );

      // Update local device state
      setDevice(prev => ({
        ...prev,
        wifi_configured: false,
        ip_address: null
      }));

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[WiFi Reset] Error:', error);

      let errorMessage = 'Failed to reset WiFi. Please try again.';
      if (error.status === 403) {
        errorMessage = 'Permission denied. Only the device owner can reset WiFi.';
      } else if (error.data?.error) {
        errorMessage = error.data.error;
      }

      alert(`❌ WiFi Reset Failed\n\n${errorMessage}`);
    }
  };

  const resolvedDevice = device || (mockDevices[deviceId] || mockDevices['D000000001']);

  // Derive display values and only render when truthy to avoid placeholder dashes
  const plantName = (device && device.plant_name) || (resolvedDevice.plant ? resolvedDevice.plant.name : '');
  const plantVariety = (device && device.plant_variety) || (resolvedDevice.plant ? resolvedDevice.plant.variety : '');
  const harvestText = (device && device.plant_status)
    || (resolvedDevice.plant ? `Harvest in ${resolvedDevice.plant.daysToHarvest} days` : '');

  // Device status badge configuration
  const deviceStatusRaw = (device && device.status) || '';
  const statusKey = (deviceStatusRaw || '').toLowerCase();
  const statusLabel = deviceStatusRaw
    ? deviceStatusRaw.charAt(0).toUpperCase() + deviceStatusRaw.slice(1)
    : 'Active';
  const statusClass = ['active', 'inactive', 'maintenance', 'decommissioned'].includes(statusKey)
    ? statusKey
    : 'active';

  // Use plant photo if available, otherwise fall back to mock image or default
  const headerImage = (device && device.plant_photo_url)
    ? device.plant_photo_url
    : (resolvedDevice.image || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop');
  return (
    <div className="device-details-root">
      {/* Header with background image */}
      <header className="device-header" style={{ backgroundImage: `url(${headerImage})` }}>
        <div className="device-header-overlay">
          <button className="back-button" onClick={handleGoBack}>
            <ChevronLeft size={20} />
            <span>Go back</span>
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="edit-photo-button"
              onClick={handleOpenPhotoModal}
              aria-label="Change plant photo"
              title="Change plant photo"
            >
              <Camera size={20} />
            </button>
            <button className="more-button" aria-label="More options">
              <MoreVertical size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Device info */}
      <div className="device-info-section">
        <h1 className="device-info-title">{resolvedDevice.device_name || resolvedDevice.name || (location.state && location.state.deviceName) || 'Device'}</h1>
        <p className="device-info-id">Serial: {resolvedDevice.device_serial || (location.state && location.state.deviceSerial) || resolvedDevice.id || deviceId}</p>
        {resolvedDevice.location ? (
          <p className="device-location">Location: {resolvedDevice.location}</p>
        ) : null}
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

            {/* Device status badge */}
            <div className={`device-status-badge status-${statusClass}`} title={`Device status: ${statusLabel}`}>
              <span className="status-dot" aria-hidden="true" />
              <span className="device-status-text">{statusLabel}</span>
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
                  {plantName && (
                    <h3 className="plant-card-name">{plantName}</h3>
                  )}
                  {plantVariety && (
                    <p className="plant-card-variety">{plantVariety}</p>
                  )}
                </div>
                {harvestText && (
                  <div className="plant-card-harvest">
                    <span className="harvest-label">{harvestText}</span>
                  </div>
                )}
                {/* Inline cycle details inside the same card */}
                <div className="plant-card-cycle">
                  <div className="plant-cycle-row">
                    <span className="plant-cycle-label">Plant type</span>
                    <span className="plant-cycle-value">{(reservoir && reservoir.plant_type) || '—'}</span>
                  </div>
                  <div className="plant-cycle-row">
                    <span className="plant-cycle-label">Start date</span>
                    <span className="plant-cycle-value">{(reservoir && reservoir.start_date) ? new Date(reservoir.start_date).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="plant-cycle-row">
                    <span className="plant-cycle-label">End date</span>
                    <span className="plant-cycle-value">{(reservoir && reservoir.end_date) ? new Date(reservoir.end_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Start new cycle button */}
            <button
              className="start-cycle-button"
              onClick={() => {
                const deviceIdToUse = device?.id || deviceId;
                const reservoirIdToUse = reservoir?.id;
                navigate('/start-cycle', { state: { deviceId: deviceIdToUse, reservoirId: reservoirIdToUse } });
              }}
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
              {/* Optional: mark all as read for this device */}
              <div style={{ marginLeft: 'auto' }}>
                <button
                  className="log-sort-button"
                  onClick={() => {
                    const didRaw = (device && (device.id || device.device_id)) || deviceId || (location.state && location.state.deviceId);
                    if (didRaw) markAllDeviceAlertsRead(Number(didRaw));
                  }}
                >
                  Mark device alerts read
                </button>
              </div>
            </div>

            {/* Log entries */}
            {(loadingInitial || loadingAlerts) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
                <Clock size={20} color={PRIMARY_GREEN} style={{ marginRight: 8 }} />
                <span>Loading alerts…</span>
              </div>
            ) : errorAlerts ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#E1554A' }}>
                <p>Failed to load alerts: {errorAlerts}</p>
                <button
                  onClick={() => fetchAlertsStore()}
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
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
            ) : (
              <div className="log-entries">
                {sortedLogEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6B7D75' }}>
                    No alerts for this device yet.
                  </div>
                ) : (
                  sortedLogEntries.map((entry) => (
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
                  ))
                )}
              </div>
            )}
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
                <span className="settings-item-value">
                  {device?.wifi_configured ? 'Connected via WiFi' : 'Not configured'}
                </span>
                <ChevronRight size={20} color="#8BA797" />
              </div>
            </button>

            <button
              className="settings-item settings-item-danger"
              onClick={handleResetWiFi}
              style={{ borderTop: '1px solid rgba(231, 76, 60, 0.2)' }}
            >
              <div className="settings-item-left">
                <RefreshCw size={20} color="#e74c3c" strokeWidth={2.5} />
                <span className="settings-item-label" style={{ color: '#e74c3c' }}>
                  Reset WiFi Configuration
                </span>
              </div>
              <ChevronRight size={20} color="#e74c3c" />
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
        <button className="nav-item" onClick={() => navigate('/alerts')} style={{ position: 'relative' }}>
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

      {/* Plant Photo Change Modal */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={handleClosePhotoModal}>
          <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Plant Photo</h3>
              <button className="modal-close" onClick={handleClosePhotoModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {!photoPreview ? (
                <div className="photo-options">
                  <p style={{ textAlign: 'center', marginBottom: '24px', color: '#6B7D75', fontSize: '14px' }}>
                    Choose how you'd like to add a photo
                  </p>

                  <label className="photo-option-button">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      style={{ display: 'none' }}
                    />
                    <div className="photo-option-icon">
                      <Camera size={32} color="#339432" />
                    </div>
                    <div className="photo-option-text">
                      <strong>Take Photo</strong>
                      <span>Use your camera</span>
                    </div>
                  </label>

                  <label className="photo-option-button">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <div className="photo-option-icon">
                      <Upload size={32} color="#339432" />
                    </div>
                    <div className="photo-option-text">
                      <strong>Upload Photo</strong>
                      <span>Choose from your device</span>
                    </div>
                  </label>

                  {photoError && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#FEE2E2',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      {photoError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="photo-preview-container">
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      marginBottom: '16px'
                    }}
                  />

                  {photoError && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#FEE2E2',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      {photoError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setPhotoError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'transparent',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        color: '#6B7D75',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Choose Different Photo
                    </button>
                    <button
                      onClick={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: uploadingPhoto ? '#9fb5aa' : '#339432',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: uploadingPhoto ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
