import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/device-redesign.css';
import DeviceHeader from '../components/device/DeviceHeader.jsx';
import BottomNav from '../components/navigation/BottomNav.jsx';
import SegmentedTabs from '../components/device/SegmentedTabs.jsx';
import PlantView from '../components/device/PlantView.jsx';
import LogsView from '../components/device/LogsView.jsx';
import SettingsView from '../components/device/SettingsView.jsx';
import { resolveMediaUrl, withImgFallback } from '../utils/media';
import {
  ChevronLeft,
  MoreVertical,
  Clock,
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
// Reservoirs endpoint removed; device now carries plant/start/end fields
import { useRealtimeStore } from '../store/realtimeStore';
import { listAlertsAll } from '../services/api/alerts';
import GlobalLoadingSpinner from '../components/ui/GlobalLoadingSpinner.jsx';
import { deviceApi, authApi } from '../services/apiClient.js';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Removed hardcoded mockDevices; component now relies solely on API/device prop data.

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

// Helper: compute whole days from today (local) until end date (local)
function computeDaysTillHarvest(endDateStr) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (Number.isNaN(end.getTime())) return null;
  // Normalize both to local start-of-day to avoid time-of-day noise
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = endDay.getTime() - today.getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Using Math.floor since both are start-of-day; negative -> past date
  const days = Math.floor(diffMs / MS_PER_DAY);
  return days;
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
  // Reservoir model removed; derive cycle fields from device
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState(null);
  const [alertsReloadKey, setAlertsReloadKey] = useState(0);
  // Current user email for ownership checks
  const [currentEmail, setCurrentEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const isOwner = (() => {
    const a = (device?.bound_email || '').trim().toLowerCase();
    const b = (currentEmail || '').trim().toLowerCase();
    return a && b && a === b;
  })();
  const canManage = isOwner || isAdmin;
  // Permission modal
  const [showDenied, setShowDenied] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState('');

  // Real-time data integration
  const deviceData = useRealtimeStore(state => state.deviceData[deviceId]);
  const connectWS = useRealtimeStore(state => state.connectWS);
  const fetchInitial = useRealtimeStore(state => state.fetchInitial);
  const totalUnread = useRealtimeStore(state => state.totalUnread);
  const deviceAlertsStore = useRealtimeStore(state => state.deviceAlerts);
  const loadingInitial = useRealtimeStore(state => state.loadingInitial);
  const updateDeviceMeta = useRealtimeStore(state => state.updateDeviceMeta);

  // Plant photo change states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  // Days till harvest (recomputes periodically)
  const [daysTillHarvest, setDaysTillHarvest] = useState(null);
  // Start cycle uses dedicated page; keep no local modal state
  // Edit device info modal state
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [saveInfoError, setSaveInfoError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function fetchDevice() {
      try {
        setLoading(true);
        setError(null);
        const id = deviceId || location.state?.deviceId;
        if (!id) {
          // No id available; show empty state instead of mock data
          if (mounted) setDevice(null);
          return;
        }
        const resp = await getDeviceById(id);
        const dev = resp && resp.id ? resp : (resp && resp.results ? resp.results : resp);
        if (mounted) setDevice(dev);
        // No reservoirs to fetch; cycle info present on device
      } catch (e) {
        console.warn('DeviceDetails: failed to load device', e);
        if (mounted) {
          setError('Failed to load device');
          setDevice(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDevice();
    return () => { mounted = false; };
  }, [deviceId, location.state]);

  // Recompute days till harvest initially and periodically (every minute)
  useEffect(() => {
    // Initial compute
    setDaysTillHarvest(computeDaysTillHarvest(device?.end_date));
    // Update every 60s to ensure it flips at midnight without reload
    const interval = setInterval(() => {
      setDaysTillHarvest(computeDaysTillHarvest(device?.end_date));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [device?.end_date]);

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

      // Load user profile for permission checks
      try {
        const profile = await authApi.getProfile(token);
        if (profile?.email) setCurrentEmail(profile.email);
        if (profile?.is_admin === true || profile?.is_staff === true || profile?.user?.is_admin === true || profile?.user?.is_staff === true) {
          setIsAdmin(true);
        }
      } catch (_) { /* ignore */ }
    };

    initRealtime();

    // Connect to WebSocket for real-time updates
    const unsub = connectWS();

    return () => {
      unsub && unsub();
    };
  }, [fetchInitial, connectWS, navigate]);

  // Fetch fresh alerts for THIS device only to avoid showing deleted/stale entries
  useEffect(() => {
    let mounted = true;
    const fetchDeviceAlerts = async () => {
      try {
        if (activeTab !== 'log') return;
        const didRaw = (device && (device.id || device.device_id)) || deviceId || (location.state && location.state.deviceId);
        if (!didRaw) return;
        const did = Number(didRaw);

        setLoadingLogs(true);
        setErrorLogs(null);

        // Fetch ALL alerts for this device from sensors alerts endpoint (authoritative history)
        const allAlerts = await listAlertsAll({ deviceId: did, ordering: '-created_at' });

        // Map to log entries; AlertSerializer returns created_at, severity, title, recommendation
        const mapped = (Array.isArray(allAlerts) ? allAlerts : []).map(a => {
          const iso = a.created_at || a.timestamp || new Date().toISOString();
          const sev = (a.severity || '').toLowerCase();
          const type = sev === 'critical' ? 'critical' : (sev === 'warning' ? 'warning' : 'info');
          return {
            id: a.id,
            readingId: a.id,
            type,
            title: a.title || 'Alert',
            message: a.recommendation || a.message || '',
            time: relativeTimeFromISO(iso),
            date: new Date(iso).toLocaleDateString(),
            createdAt: iso,
            isRead: Boolean(a.is_acknowledged),
          };
        });

        // Dedupe by readingId/id to avoid duplicates from any persisted state
        const seen = new Set();
        const deduped = mapped.filter(e => {
          const key = e.readingId || e.id;
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (mounted) setLogEntries(deduped);
      } catch (e) {
        if (mounted) setErrorLogs(e?.message || 'Failed to load alerts');
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    };
    fetchDeviceAlerts();
    return () => { mounted = false; };
  }, [activeTab, device, deviceId, location.state, alertsReloadKey]);

  // Reset visible list when entering LOG tab or switching device (fresh fetch effect above will repopulate)
  useEffect(() => {
    if (activeTab !== 'log') return;
    setLogEntries([]);
  }, [activeTab, deviceId]);

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
    if (!canManage) {
      setDeniedMessage('You cannot change the plant photo. Only the device owner or an admin can perform this action.');
      setShowDenied(true);
      return;
    }
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

      // Update global store so Dashboard reflects the new photo immediately
      try {
        const newUrl = response.plant_photo_url || response.data?.plant_photo_url;
        if (newUrl && typeof updateDeviceMeta === 'function') {
          updateDeviceMeta(Number(deviceIdToUse), { plant_photo_url: newUrl });
        }
      } catch (_) { /* noop */ }

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

    if (!canManage) {
      setDeniedMessage('You cannot reset WiFi on this device. Only the device owner or an admin can perform this action.');
      setShowDenied(true);
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

  // Start new plant cycle → navigate to dedicated page
  const openNewCycle = () => {
    if (!canManage) {
      setDeniedMessage('You cannot start a new plant cycle. Only the device owner or an admin can perform this action.');
      setShowDenied(true);
      return;
    }
    // Navigate and pass device context so StartCyclePage patches the correct device
    navigate('/start-cycle', { state: { deviceId: device?.id || deviceId } });
  };

  // Open edit modal and prefill
  const openEditInfo = () => {
    setEditDeviceName(device?.device_name || '');
    setEditLocation(device?.location || '');
    setSaveInfoError('');
    setShowEditInfoModal(true);
  };

  const closeEditInfo = () => {
    setShowEditInfoModal(false);
    setSavingInfo(false);
    setSaveInfoError('');
  };

  const saveDeviceInfo = async () => {
    if (!device || !device.id) return;
    if (!canManage) {
      setDeniedMessage('You cannot edit device settings. Only the device owner or an admin can perform this action.');
      setShowDenied(true);
      return;
    }
    const name = (editDeviceName || '').trim();
    const loc = (editLocation || '').trim();
    if (!name) {
      setSaveInfoError('Device name is required.');
      return;
    }
    try {
      setSavingInfo(true);
      setSaveInfoError('');
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      const payload = { device_name: name, location: loc || null };
      await deviceApi.update(device.id, payload, token);
      // Update local device state
      setDevice(prev => ({ ...prev, device_name: name, location: loc || null }));
      // Update global devices list so Dashboard reflects changes without reload
      try {
        if (typeof updateDeviceMeta === 'function') {
          updateDeviceMeta(device.id, payload);
        }
      } catch (_) { /* noop */ }
      closeEditInfo();
    } catch (e) {
      setSaveInfoError(e?.message || 'Failed to update device info');
    } finally {
      setSavingInfo(false);
    }
  };

  const resolvedDevice = device || null;

  // Derive display values from API device only
  const plantName = device?.plant?.plant_name || device?.plant_name || '';
  const plantVariety = device?.plant_variety || '';
  const harvestText = device?.plant_status || '';

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
  const headerImage = device?.plant_photo_url
    ? resolveMediaUrl(device.plant_photo_url)
    : 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop';

  // Loading / error / empty states
  if (loading) return <GlobalLoadingSpinner message="Loading device details..." />;

  if (error) {
    return (
      <div className="device-details-root" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#E1554A' }}>{error}</p>
        <button
          onClick={() => {
            setError(null); setLoading(true); /* retry */
            // trigger fetch again
            (async () => {
              try {
                const id = deviceId || location.state?.deviceId;
                if (!id) { setDevice(null); setLoading(false); return; }
                const resp = await getDeviceById(id);
                const dev = resp && resp.id ? resp : (resp && resp.results ? resp.results : resp);
                setDevice(dev);
              } catch (e) {
                setError('Failed to load device');
              } finally { setLoading(false); }
            })();
          }}
          style={{ marginTop: '16px', background: PRIMARY_GREEN, color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}
        >Retry</button>
      </div>
    );
  }

  if (!resolvedDevice) {
    return (
      <div className="device-details-root" style={{ padding: '32px', textAlign: 'center' }}>
        <p>No device selected.</p>
        <button onClick={handleGoBack} style={{ marginTop: '16px', background: PRIMARY_GREEN, color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}>Go to dashboard</button>
      </div>
    );
  }
  return (
    <div className="device-page">
      <div className="device-container">
        <div className="top-bar">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
            <span>Back</span>
          </button>
        </div>
        <DeviceHeader
          name={resolvedDevice.device_name}
          serial={resolvedDevice.device_serial}
          location={resolvedDevice.location}
          photoUrl={resolvedDevice.plant_photo_url || headerImage}
          isOnline={Boolean(resolvedDevice?.is_online || deviceData)}
          wifiConfigured={resolvedDevice?.wifi_configured}
          onChangePhoto={handleOpenPhotoModal}
        />

        <SegmentedTabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[{ value: 'plants', label: 'Plant' }, { value: 'log', label: 'Logs' }, { value: 'settings', label: 'Settings' }]}
        />

        {activeTab === 'plants' && (
          <PlantView
            device={device}
            daysTillHarvest={daysTillHarvest}
            metrics={{
              ph: deviceData?.sensors?.ph,
              ec: deviceData?.sensors?.ec,
              tds: deviceData?.sensors?.tds,
              water_temp: (deviceData?.sensors?.water_temperature ?? deviceData?.sensors?.water_temp),
            }}
            classifyPH={classifyPH}
            classifyEC={classifyEC}
            classifyTDS={classifyTDS}
            classifyWaterTemp={classifyWaterTemp}
          />
        )}

        {activeTab === 'log' && (
          <LogsView
            entries={sortedLogEntries}
            loading={loadingInitial || loadingLogs}
            error={errorLogs}
            onRetry={() => setAlertsReloadKey(v => v + 1)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            device={device}
            canManage={canManage}
            saving={savingInfo}
            onStartNewCycle={openNewCycle}
            onSaveInfo={async (payload) => {
              if (!canManage) {
                setDeniedMessage('You cannot edit device settings. Only the device owner or an admin can perform this action.');
                setShowDenied(true);
                return;
              }
              try {
                setSavingInfo(true);
                const token = localStorage.getItem('authToken');
                await deviceApi.update(device.id, payload, token);
                setDevice(prev => ({ ...prev, ...payload }));
                updateDeviceMeta?.(device.id, payload);
              } catch (e) {
                if (e?.status === 403) {
                  setDeniedMessage('You cannot edit device settings. Only the device owner or an admin can perform this action.');
                  setShowDenied(true);
                } else {
                  alert(e?.message || 'Failed to save changes');
                }
              } finally { setSavingInfo(false); }
            }}
            onResetWiFi={handleResetWiFi}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav active="tanom" totalUnread={totalUnread} />

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

      {/* Edit Device Info Modal */}
      {showEditInfoModal && (
        <div className="modal-overlay" onClick={closeEditInfo}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Device Info</h3>
              <button className="modal-close" onClick={closeEditInfo}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="setup-field" style={{ marginBottom: 12 }}>
                <label className="setup-field-label" htmlFor="editDeviceName">Device Name</label>
                <input
                  id="editDeviceName"
                  type="text"
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  placeholder="Enter device name"
                  autoComplete="off"
                />
              </div>
              <div className="setup-field" style={{ marginBottom: 4 }}>
                <label className="setup-field-label" htmlFor="editLocation">Location (optional)</label>
                <input
                  id="editLocation"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g., Balcony, Backyard"
                  autoComplete="off"
                />
              </div>
              {saveInfoError && (
                <p className="setup-error" role="alert" style={{ marginTop: 8 }}>{saveInfoError}</p>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 12 }}>
              <button className="setup-btn outline" onClick={closeEditInfo} disabled={savingInfo}>Cancel</button>
              <button className="setup-btn" onClick={saveDeviceInfo} disabled={savingInfo || !editDeviceName.trim()}>
                {savingInfo ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Modal */}
      {showDenied && (
        <div className="modal-overlay" onClick={() => setShowDenied(false)}>
          <div className="modal-content warn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TriangleAlert size={22} color="#E1554A" />
                <h3 style={{ margin: 0 }}>Action not allowed</h3>
              </div>
              <button className="modal-close" onClick={() => setShowDenied(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6B7D75', lineHeight: 1.5 }}>{deniedMessage || 'This action is restricted. Only the device owner can perform this action.'}</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="setup-btn" onClick={() => setShowDenied(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* Start New Cycle now handled in StartCyclePage via navigation */}
    </div>
  );
}
