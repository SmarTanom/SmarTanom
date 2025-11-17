import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  User,
  Plus,
  Loader,
  Bell
} from 'lucide-react';
// Add left arrow for navigating pH chart windows
import { ChevronLeft } from 'lucide-react';
import { MdScience } from 'react-icons/md';
import { getUserDevices } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData, getSensorDataAll } from '../services/api/sensors.js';
// Reservoirs endpoint removed; device now carries plant/start/end fields
import { listPlants } from '../services/api/plants.js';
import { authApi } from '../services/apiClient.js';
import { wsClient } from '../services/websocketClient';
import { useRealtimeStore } from '../store/realtimeStore';
import { listAlerts } from '../services/api/alerts.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import defaultHydroponic from '../assets/images/defaulthydroponic.jpg';
import { resolveMediaUrl, withImgFallback } from '../utils/media';
import GlobalLoadingSpinner from '../components/ui/GlobalLoadingSpinner.jsx';
import PHLineChart from '../components/charts/PHLineChart.jsx';
import BottomNav from '../components/navigation/BottomNav.jsx';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Helper function to transform sensor data to expected structure
// Pick the most recent reading for each sensor by comparing created_at timestamps.
const transformSensorData = (sensors, sensorDataMap) => {
  const sensorMap = {};

  sensors.forEach(sensor => {
    const allData = sensorDataMap[sensor.id] || [];
    // Find the most recent by created_at. Defensive: fall back to first element.
    let latestData = null;
    if (allData.length === 1) {
      latestData = allData[0];
    } else if (allData.length > 1) {
      latestData = allData.reduce((best, cur) => {
        try {
          const bestT = best && best.created_at ? new Date(best.created_at).getTime() : 0;
          const curT = cur && cur.created_at ? new Date(cur.created_at).getTime() : 0;
          return curT > bestT ? cur : best;
        } catch (e) {
          return best;
        }
      }, allData[0]);
    }
    if (!latestData || typeof latestData.value === 'undefined') {
      return; // Do not set mock/default values
    }
    const value = latestData.value;

    switch (sensor.sensor_type) {
      case 'ph':
        sensorMap.ph = value;
        break;
      case 'tds':
        sensorMap.tds = value;
        break;
      case 'ec':
        sensorMap.ec = value;
        break;
      case 'water_level':
        sensorMap.waterLevel = value;
        break;
      case 'water_temperature':
        sensorMap.waterTemperature = value;
        break;
      case 'turbidity':
        sensorMap.turbidity = value;
        break;
      // removed environment metrics
    }
  });

  return sensorMap;
};

// Helper function to get pH history from sensor data based on time range
// Uses the CHRONOLOGICALLY LAST reading in each period (day/week/month bucket). We sort ascending
// by created_at so the overwrite logic always leaves the true latest value; prevents stale value after refresh.
const getPHHistory = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) {
    return null;
  }

  const phDataRaw = sensorDataMap[phSensorId] || [];

  // Sort ascending by created_at to ensure later overwrite wins are actual latest
  const phData = [...phDataRaw].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  const endDate = new Date();
  const dateMap = {};

  let periods, getDateKey, formatPeriod;

  switch (timeRange) {
    case 'weeks':
      periods = 20; // Last 20 weeks
      getDateKey = (date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toDateString();
      };
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - (i * 7));
        return getDateKey(date);
      };
      break;

    case 'months':
      periods = 12; // Last 12 months
      getDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        return getDateKey(date);
      };
      break;

    default: // 'days'
      periods = 60; // Last 60 days (include earlier readings like Oct 15)
      getDateKey = (date) => date.toDateString();
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return getDateKey(date);
      };
      break;
  }

  // Initialize periods with null values
  for (let i = periods - 1; i >= 0; i--) {
    const dateKey = formatPeriod(i);
    dateMap[dateKey] = null;
  }

  // Fill with the LAST reading in each period (latest wins)
  let validReadings = 0;
  phData.forEach(d => {
    if (!d || !d.created_at) return;
    try {
      const dataDate = new Date(d.created_at);
      const dateKey = getDateKey(dataDate);
      if (!dateMap.hasOwnProperty(dateKey)) return;
      const value = Number(d.value);
      if (!Number.isFinite(value)) return;
      // Latest always overwrites (so the last iteration for that bucket wins)
      dateMap[dateKey] = value;
      validReadings++;
    } catch (_e) {
      // Ignore malformed date/value
    }
  });

  const result = Object.values(dateMap);
  return result;
};

// Helper function to get pH labels based on time range
// Note: Labels are derived purely from the selected time range and current date.
// They should be generated regardless of whether sensor data has arrived yet,
// so the chart can render axes/structure immediately.
const getPHLabels = (sensorDataMap, phSensorId, timeRange = 'days') => {
  const endDate = new Date();
  const labels = [];

  let periods, formatLabel;

  switch (timeRange) {
    case 'weeks':
      periods = 20;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - (i * 7));
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      break;

    case 'months':
      periods = 12;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      };
      break;

    default: // 'days'
      periods = 60;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      break;
  }

  for (let i = periods - 1; i >= 0; i--) {
    labels.push(formatLabel(i));
  }

  return labels;
};

// Helper function to determine connectivity status
const getConnectivityStatus = (lastSensorUpdate) => {
  if (!lastSensorUpdate) return { connectivity: 'Offline', lastSync: 'Never' };

  const now = new Date();
  const lastUpdate = new Date(lastSensorUpdate);
  const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));

  if (diffMinutes < 5) {
    return { connectivity: 'Online', lastSync: '< 1 minute ago' };
  } else if (diffMinutes < 60) {
    return { connectivity: 'Online', lastSync: `${diffMinutes} minutes ago` };
  } else {
    return { connectivity: 'Offline', lastSync: `${Math.floor(diffMinutes / 60)} hours ago` };
  }
};

// (Removed previous alert text generator; dashboard now uses DB-backed alerts only)

// Helper function to determine nutrient status relative to plant ppm range
const getNutrientStatus = (tdsValue, plant) => {
  if (!Number.isFinite(tdsValue)) return undefined;
  if (!plant || plant.ppm_min == null || plant.ppm_max == null) return 'Optimal';
  const cls = classifyTDS(tdsValue, plant);
  if (cls.severity === 'critical') return tdsValue < plant.ppm_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
  if (cls.severity === 'warning') return tdsValue < plant.ppm_min ? 'Low (near min)' : 'High (near max)';
  return 'Optimal';
};

// (Removed local read/unread tracking for derived alerts)

// --- BEGIN shared alert classification (duplicated from AlertsPage; consider refactor to shared module) ---
const DEFAULT_PROXIMITY_MIN = 50;
const DEFAULT_PROXIMITY_MAX = 200;
function computeProximityBuffer(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { low: DEFAULT_PROXIMITY_MIN, high: DEFAULT_PROXIMITY_MIN };
  const span = Math.max(0, max - min);
  const base = span * 0.1;
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
const classifyPH = (v, plant) => plant ? classifyValue(Number(v), plant.ph_min, plant.ph_max) : { severity: 'none' };
const classifyTDS = (v, plant) => plant ? classifyValue(Number(v), plant.ppm_min, plant.ppm_max) : { severity: 'none' };
const classifyEC = (v, plant) => plant ? classifyValue(Number(v), plant.ec_min, plant.ec_max) : { severity: 'none' };
// removed environment classifiers
const classifyWaterTemp = (v, plant) => plant ? classifyValue(Number(v), plant.water_temp_min, plant.water_temp_max) : { severity: 'none' };
// --- END shared alert classification ---

function PHBar({ v, i, min, max, plant }) {
  // Handle null/undefined values (no data for this date)
  if (v === null || v === undefined) {
    return (
      <div className="ph-bar-wrapper" aria-label="No data" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: '8px',
        maxWidth: '32px',
        height: '100%'
      }}>
        {/* Show a minimal placeholder bar for missing data */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(139, 167, 151, 0.25)',
          borderRadius: '2px 2px 0 0'
        }} />
      </div>
    );
  }

  const vv = Number(v);
  const isValid = Number.isFinite(vv);
  const clamped = isValid ? Math.min(max, Math.max(min, vv)) : min;
  const pct = Math.max(2, ((clamped - min) / (max - min)) * 100); // Minimum 2% height for visibility

  // Enhanced color coding based on plant-specific ranges and severity
  const getPHColor = (phValue) => {
    if (!isValid) return 'rgba(139, 167, 151, 0.3)'; // Gray for invalid data

    // Use plant-specific ranges if available
    if (plant && plant.ph_min !== undefined && plant.ph_max !== undefined) {
      const phMin = Number(plant.ph_min);
      const phMax = Number(plant.ph_max);

      if (phValue < phMin) return '#e74c3c'; // Critical red - below minimum
      if (phValue > phMax) return '#e74c3c'; // Critical red - above maximum

      // Warning zones (10% buffer from min/max)
      const buffer = (phMax - phMin) * 0.1;
      if (phValue <= phMin + buffer) return '#f59e0b'; // Warning orange - near minimum
      if (phValue >= phMax - buffer) return '#f59e0b'; // Warning orange - near maximum

      return '#339432'; // Optimal green - within range
    }

    // No hard-coded fallback thresholds; use primary color when target unknown
    return PRIMARY_GREEN;
  };

  return (
    <div className="ph-bar-wrapper" aria-label={`pH ${isValid ? vv.toFixed(1) : 'N/A'}`} style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: '8px',
      maxWidth: '32px',
      height: '100%',
      cursor: 'pointer'
    }}>
      <div
        className="ph-bar"
        style={{
          height: `${pct}%`,
          width: '100%',
          background: getPHColor(vv),
          borderRadius: '2px 2px 0 0',
          transformOrigin: 'bottom',
          animation: `growBar 0.8s ease forwards`,
          animationDelay: `${Math.min(i * 50, 500)}ms`,
          opacity: 0,
          boxShadow: isValid ? `0 2px 4px rgba(0,0,0,0.1)` : 'none',
          minHeight: '6px',
          zIndex: 2
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Prefer username; fall back to email; remove first/last/full name usage
  const displayName = React.useMemo(() => {
    const uname = typeof user?.username === 'string' ? user.username.trim() : '';
    if (uname) return uname;
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (email) return email;
    return 'User';
  }, [user]);
  const carouselRef = useRef(null);
  // Cache plant catalog for mapping reservoirs -> plant ranges (shared with AlertsPage logic)
  const plantCatalogRef = useRef(null);
  // Minute tick to force re-render so relative times (e.g., "X minutes ago") update without manual refresh
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Initialize activeIdx from localStorage or default to 0
  const [activeIdx, setActiveIdx] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard.activeDeviceIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  const scrollTimeoutRef = useRef(null);
  const isAdjustingRef = useRef(false);
  const [timeRange, setTimeRange] = useState('days'); // 'days', 'weeks', 'months'

  // Window size for pH chart navigation (adaptive based on time range)
  const getWindowSize = (timeRange) => {
    switch (timeRange) {
      case 'weeks': return 8; // Show 8 weeks at a time
      case 'months': return 6; // Show 6 months at a time
      default: return 10; // Show 10 days at a time
    }
  };
  const PH_WINDOW_SIZE = getWindowSize(timeRange);

  // Reset pH windows when timeRange changes
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    setPhWindows({}); // Reset all device windows

    // Check if we need to refresh pH data for current device
    if (currentDevice) {
      const savedData = localPhData[currentDevice.id];
      if (!savedData || savedData.timeRange !== newTimeRange) {
        fetchDeviceDataById(currentDevice.id);
      }
    }
  };

  // Helper function to clear saved device persistence (useful for debugging)
  const clearSavedDevice = () => {
    try {
      localStorage.removeItem('dashboard.activeDeviceIndex');
      localStorage.removeItem('dashboard.activeDeviceId');
    } catch (e) {
      console.warn('Failed to clear saved device persistence:', e);
    }
  };
  // Keep per-device pH window start index so users can navigate dates
  const [phWindows, setPhWindows] = useState({}); // { [deviceId]: startIndex }

  // State for real data
  // Centralized realtime store state
  const devices = useRealtimeStore(s => s.devices);
  const isAdmin = Boolean(user?.is_admin || user?.is_staff);
  // Admins: see all bound devices; Users: see owned or shared devices
  const ownedDevices = useMemo(() => {
    const list = devices || [];
    if (isAdmin) return list.filter(d => d?.is_bound);
    return list.filter(d => d?.is_bound && (d?.is_owner || d?.is_collaborator));
  }, [devices, isAdmin]);
  const devicesData = useRealtimeStore(s => s.deviceData);
  const fetchInitial = useRealtimeStore(s => s.fetchInitial);
  const connectWS = useRealtimeStore(s => s.connectWS);
  const wsStatus = useRealtimeStore(s => s.wsStatus);

  const totalUnread = useRealtimeStore(s => s.totalUnread);
  const perDeviceUnreadCounts = useRealtimeStore(s => s.unreadCounts);
  const loadingInitial = useRealtimeStore(s => s.loadingInitial);
  const errorInitial = useRealtimeStore(s => s.errorInitial);
  const updateDeviceData = useRealtimeStore(s => s.updateDeviceData);

  // Track if store has been hydrated from localStorage
  const [isHydrated, setIsHydrated] = useState(false);

  // Check if store is hydrated on mount
  useEffect(() => {
    // Zustand persist rehydrates synchronously on store creation
    // We need to wait a bit to ensure the hydration has completed and data is available
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100); // Increased delay to ensure hydration is complete

    return () => clearTimeout(timer);
  }, []);

  // Current device selection must be defined before any effects/dependencies that reference it
  const currentDevice = ownedDevices[activeIdx];
  const data = currentDevice ? devicesData[currentDevice.id] : null;

  // Persist current device serial for strict backend filtering of sensor data
  useEffect(() => {
    try {
      const serial = currentDevice?.device_serial || currentDevice?.deviceSerial;
      if (serial) {
        localStorage.setItem('activeDeviceSerial', String(serial).toUpperCase());
      }
    } catch (e) {
      // non-fatal
    }
  }, [currentDevice?.device_serial, currentDevice?.deviceSerial]);

  // Schedule a refresh at local midnight to update date-based labels/history automatically
  const midnightTimerRef = useRef(null);
  useEffect(() => {
    if (!currentDevice?.id) return;
    // Clear any previous timer
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = null;
    }
    // Compute ms until next midnight
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 50); // a tiny buffer past midnight
    const delay = Math.max(1000, next.getTime() - now.getTime());
    midnightTimerRef.current = setTimeout(() => {
      // Rebuild pH labels and history for the active device
      fetchDeviceDataById(currentDevice.id);
    }, delay);
    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id, timeRange]);

  // Debug logging removed to reduce console noise

  // Latest reading for the first device's first sensor (useful for small widgets)
  const [firstSensorReading, setFirstSensorReading] = useState(null);
  // Unread count comes from the realtime store (total across devices)

  // Track last fetched device to prevent duplicate fetches
  const lastFetchedDeviceRef = useRef(null);

  // Local pH history augmentation (store keeps latest values; we add historical series here)
  const [localPhData, setLocalPhData] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard.phData');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load pH data from localStorage:', e);
      return {};
    }
  }); // { [deviceId]: { phHistory, phLabels, lastFetch } }



  // Helper to persist pH data to localStorage
  const persistPhData = (deviceId, phHistory, phLabels, timeRange) => {
    try {
      const updatedData = {
        ...localPhData,
        [deviceId]: {
          phHistory,
          phLabels,
          timeRange,
          lastFetch: Date.now()
        }
      };
      setLocalPhData(updatedData);
      localStorage.setItem('dashboard.phData', JSON.stringify(updatedData));
    } catch (e) {
      console.warn('Failed to persist pH data:', e);
    }
  };

  // Initialize store and fetch initial data on mount
  useEffect(() => {
    const initDashboard = async () => {
      // Trigger store's initial device fetch (idempotent guard in store)
      await fetchInitial();
    };

    initDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unread counts are now managed by the realtime store automatically





  // Note: Initial fetch is triggered in initDashboard above. Avoid duplicating here to prevent overwriting
  // enriched device data (plant, pH history) populated by targeted fetches.

  // Time range change currently affects only local ph window history building (skip server refetch to avoid flicker)

  // WebSocket real-time updates - handled by store
  useEffect(() => {
    const unsub = connectWS();

    return () => {
      unsub && unsub();
    };
  }, [connectWS]);

  // Always compute plant-aware alert text for the active device (independent of pH history caching)
  useEffect(() => {
    if (!currentDevice?.id) return;

    const existing = devicesData[currentDevice.id];
    const needsAugment = !existing || !existing.plant || !existing.phHistory || existing.phHistory.length === 0;
    const isDifferentDevice = lastFetchedDeviceRef.current !== currentDevice.id;

    if (isDifferentDevice || needsAugment) {
      fetchDeviceDataById(currentDevice.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id]);

  // Floating Action Button (FAB) draggable state
  const fabRef = useRef(null);
  const topBarHeight = 64; // Mobile top bar height from CSS
  const navHeight = 64; // Bottom nav height from CSS
  const fabSize = 56; // FAB size from CSS
  const dragStartRef = useRef({ x: 0, y: 0, fabX: 0, fabY: 0 });
  const hasDraggedRef = useRef(false);
  const [fabPosition, setFabPosition] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - navHeight - fabSize - 24 : 500
  });
  const [isDragging, setIsDragging] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState({}); // { [deviceId]: boolean }
  const [wifiSetupDevice, setWifiSetupDevice] = useState(null); // Device to show WiFi setup modal for
  const [selectedMonitoringCard, setSelectedMonitoringCard] = useState(null); // For slide-up modal
  const [modalDragStart, setModalDragStart] = useState(0);
  const [modalDragOffset, setModalDragOffset] = useState(0);
  const modalContentRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Targeted fetch for a single device: refresh its sensors/reservoirs and readings only
  const fetchDeviceDataById = async (deviceId) => {
    try {
      if (!deviceId) return;

      // Mark this device as fetched
      lastFetchedDeviceRef.current = deviceId;

      const sensorsResp = await getDeviceSensors(deviceId);
      const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
      // Resolve plant ranges for this device by matching its active reservoir's plant_type to plant catalog
      let plantCatalog = plantCatalogRef.current;
      if (!plantCatalog) {
        try {
          const plantResp = await listPlants();
          plantCatalog = (plantResp && plantResp.results) ? plantResp.results : (Array.isArray(plantResp) ? plantResp : []);
          plantCatalogRef.current = plantCatalog;
        } catch (e) {
          console.warn('[Dashboard] Failed to fetch plant catalog:', e);
          plantCatalog = [];
          plantCatalogRef.current = [];
        }
      }
      // Resolve device plant from device meta (device now has plant fields)
      let devicePlant = null;
      try {
        const deviceMeta = devices.find(d => d.id === deviceId);
        if (deviceMeta?.plant && typeof deviceMeta.plant === 'object') {
          devicePlant = deviceMeta.plant;
        } else if (deviceMeta?.plant_name && Array.isArray(plantCatalog)) {
          const mapped = plantCatalog.find(p => p.plant_name === deviceMeta.plant_name);
          if (mapped) devicePlant = mapped;
        }
      } catch (_e) {
        // ignore fallback errors
      }
      const sensorDataMap = {};
      if (Array.isArray(sensors) && sensors.length > 0) {
        const sensorDataPromises = sensors.map(async (sensor) => {
          try {
            // Fetch comprehensive data based on time range
            let limit = 50; // default
            if (sensor.sensor_type === 'ph') {
              // Fetch more data for pH sensors based on time range
              switch (timeRange) {
                case 'weeks': limit = 1500; break; // larger page size to cover many weeks
                case 'months': limit = 2500; break; // larger page size to cover many months
                default: limit = 2000; break; // up to ~1 year of daily data
              }
            }
            // Date range params (helps backend filter accurately and align with chart labels)
            let opts = {};
            if (sensor.sensor_type === 'ph') {
              const now = new Date();
              if (timeRange === 'days') {
                const start = new Date(now);
                start.setDate(now.getDate() - 365); // 1-year window to capture more history
                start.setHours(0, 0, 0, 0);
                opts = { start: start.toISOString(), end: now.toISOString() };
              } else if (timeRange === 'weeks') {
                const start = new Date(now);
                start.setDate(now.getDate() - (52 * 3)); // ~3 years of weeks
                start.setHours(0, 0, 0, 0);
                opts = { start: start.toISOString(), end: now.toISOString() };
              } else if (timeRange === 'months') {
                const start = new Date(now);
                start.setMonth(now.getMonth() - 60); // 5 years of months
                start.setHours(0, 0, 0, 0);
                opts = { start: start.toISOString(), end: now.toISOString() };
              }
            }
            // Use paginated fetch for pH to retrieve enough history for chart navigation
            const resp = sensor.sensor_type === 'ph'
              ? await getSensorDataAll(sensor.id, Math.min(200, limit), opts, 8000)
              : await getSensorData(sensor.id, limit, opts);
            const data = resp && resp.results ? resp.results : resp;
            return { sensorId: sensor.id, data: Array.isArray(data) ? data : (data ? [data] : []) };
          } catch (_e) {
            console.warn(`Failed to fetch data for sensor ${sensor.id}:`, _e);
            return { sensorId: sensor.id, data: [] };
          }
        });
        const sensorDataResults = await Promise.all(sensorDataPromises);
        sensorDataResults.forEach(({ sensorId, data }) => { sensorDataMap[sensorId] = data; });
      }
      const transformedSensors = transformSensorData(sensors || [], sensorDataMap);
      const phSensor = Array.isArray(sensors) ? sensors.find(s => s.sensor_type === 'ph') : null;
      const phHistory = getPHHistory(sensorDataMap, phSensor?.id, timeRange);
      const phLabels = getPHLabels(sensorDataMap, phSensor?.id, timeRange);

      // Persist pH data to localStorage
      if (phHistory && phHistory.length > 0) {
        persistPhData(deviceId, phHistory, phLabels, timeRange);
      }
      let lastSensorUpdate = null;
      Object.values(sensorDataMap).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(d => {
            if (!d || !d.created_at) return;
            try {
              const t = new Date(d.created_at);
              if (!lastSensorUpdate || t > lastSensorUpdate) lastSensorUpdate = t;
            } catch (_e) { }
          });
        }
      });
      const { connectivity, lastSync } = getConnectivityStatus(lastSensorUpdate);
      const deviceMeta = devices.find(d => d.id === deviceId);
      // Prefer resolved devicePlant (from device meta), fall back to any plant bundled on device meta
      const plant = devicePlant || deviceMeta?.plant || null;
      const nutrientText = typeof transformedSensors.tds === 'number' ? getNutrientStatus(transformedSensors.tds, plant) : undefined;

      // Fetch the latest alert from alerts table for this device (backend scopes owned + shared)
      let latestDbAlert = null;
      try {
        const alertsResp = await listAlerts({ deviceId, ordering: '-created_at', page: 1 });
        const results = alertsResp?.results ?? (Array.isArray(alertsResp) ? alertsResp : []);
        const top = Array.isArray(results) && results.length ? results[0] : null;
        if (top) {
          latestDbAlert = {
            severity: top.severity || 'warning',
            title: top.title || (top.metric ? `${String(top.metric).toUpperCase()} alert` : 'Alert'),
            message: top.recommendation || top.message || top.body || '',
            createdAt: top.created_at || top.timestamp || new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn('[Dashboard] Latest DB alert fetch failed for device', deviceId, e);
      }

      const dataPayload = {
        connectivity,
        lastSyncLabel: lastSync,
        lastUpdate: lastSensorUpdate ? lastSensorUpdate.toISOString() : undefined,
        nutrientText,
        latestDbAlert,
        phHistory,
        phLabels,
        phRawData: phSensor ? (sensorDataMap[phSensor.id] || []) : [], // Add raw pH sensor data for line chart
        sensors: {
          // Include pH on targeted refresh as well
          ...(typeof transformedSensors.ph === 'number' ? { ph: transformedSensors.ph } : {}),
          ...(typeof transformedSensors.ec === 'number' ? { ec: transformedSensors.ec } : {}),
          ...(typeof transformedSensors.tds === 'number' ? { tds: transformedSensors.tds } : {}),
          ...(typeof transformedSensors.waterLevel === 'number' ? { waterLevel: transformedSensors.waterLevel } : {}),
          ...(typeof transformedSensors.turbidity === 'number' ? { turbidity: transformedSensors.turbidity } : {}),
        },
        environment: {
          ...(typeof transformedSensors.temperature === 'number' ? { temperature: transformedSensors.temperature } : {}),
          // environment metrics removed
        },
        sensors_raw: sensors || [],
        // reservoirs removed; device carries cycle fields now
        plant: plant || null,
      };

      updateDeviceData(deviceId, dataPayload);
    } catch (_e) {
      // leave existing data untouched on failure
    }
  };

  // Lightweight 2s refresh for key cards: nutrient-card, ph-card, current-ph-card, sensor-grid.
  // Only fetch the latest readings for relevant sensors and update the last bucket of pH history.
  const liteRefreshInFlight = useRef(false);
  const refreshLiteDeviceData = async (deviceId) => {
    try {
      if (!deviceId || liteRefreshInFlight.current) return;
      liteRefreshInFlight.current = true;

      // Use cached sensors when possible to avoid extra calls
      let sensors = devicesData[deviceId]?.sensors_raw;
      if (!Array.isArray(sensors) || sensors.length === 0) {
        try {
          const sResp = await getDeviceSensors(deviceId);
          sensors = sResp && sResp.results ? sResp.results : sResp;
        } catch (_e) {
          sensors = [];
        }
      }

      const neededTypes = new Set(['ph', 'tds', 'ec', 'water_level', 'turbidity', 'water_temperature']);
      const targetSensors = (Array.isArray(sensors) ? sensors : []).filter(s => neededTypes.has(s.sensor_type));

      const sensorDataMap = {};
      if (targetSensors.length) {
        const latestPromises = targetSensors.map(async (s) => {
          try {
            const resp = await getSensorData(s.id, 1); // just the latest
            const arr = resp && resp.results ? resp.results : resp;
            const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
            sensorDataMap[s.id] = list;
          } catch (_e) {
            sensorDataMap[s.id] = [];
          }
        });
        await Promise.all(latestPromises);
      }

      // Derive latest sensor snapshot
      const snap = transformSensorData(targetSensors, sensorDataMap);

      // Optionally update last bucket of pH history if latest reading is present
      const phSensor = targetSensors.find(s => s.sensor_type === 'ph');
      const latestPhReading = phSensor ? (sensorDataMap[phSensor.id]?.[0] || null) : null;
      let updatedPhHistory = undefined;
      let updatedPhLabels = undefined;
      if (latestPhReading && Number.isFinite(Number(latestPhReading.value))) {
        const existing = useRealtimeStore.getState().deviceData[deviceId]?.phHistory || [];
        if (existing.length > 0) {
          updatedPhHistory = existing.slice();
          updatedPhHistory[updatedPhHistory.length - 1] = Number(latestPhReading.value);
          updatedPhLabels = useRealtimeStore.getState().deviceData[deviceId]?.phLabels || undefined;
          // Keep local cache in sync
          try { persistPhData(deviceId, updatedPhHistory, updatedPhLabels, timeRange); } catch (_e) { }
        }
      }

      // Compute deriveds
      const deviceMeta = devices.find(d => d.id === deviceId);
      const plant = useRealtimeStore.getState().deviceData[deviceId]?.plant || deviceMeta?.plant || null;
      const nutrientText = typeof snap.tds === 'number' ? getNutrientStatus(snap.tds, plant) : undefined;

      // Last update based on latest reading timestamps we fetched
      let lastSensorUpdate = null;
      Object.values(sensorDataMap).forEach(arr => {
        (arr || []).forEach(d => { if (d?.created_at) { const t = new Date(d.created_at); if (!lastSensorUpdate || t > lastSensorUpdate) lastSensorUpdate = t; } });
      });
      const { connectivity, lastSync } = getConnectivityStatus(lastSensorUpdate);

      const payload = {
        sensors: {
          ...(typeof snap.ph === 'number' ? { ph: snap.ph } : {}),
          ...(typeof snap.ec === 'number' ? { ec: snap.ec } : {}),
          ...(typeof snap.tds === 'number' ? { tds: snap.tds } : {}),
          ...(typeof snap.waterLevel === 'number' ? { waterLevel: snap.waterLevel } : {}),
          ...(typeof snap.turbidity === 'number' ? { turbidity: snap.turbidity } : {}),
          ...(typeof snap.water_temperature === 'number' ? { water_temperature: snap.water_temperature } : {}),
        },
        nutrientText,
        connectivity,
        lastSyncLabel: lastSync,
        lastUpdate: lastSensorUpdate ? lastSensorUpdate.toISOString() : useRealtimeStore.getState().deviceData[deviceId]?.lastUpdate,
      };
      if (updatedPhHistory) {
        payload.phHistory = updatedPhHistory;
        if (updatedPhLabels) payload.phLabels = updatedPhLabels;
      }

      updateDeviceData(deviceId, payload);
    } catch (_e) {
      // ignore refresh errors silently
    } finally {
      liteRefreshInFlight.current = false;
    }
  };

  // Prefer real-time WS updates; only poll when WS is not connected or data becomes stale
  useEffect(() => {
    if (!currentDevice?.id) return;

    // If WS connected, avoid aggressive polling; perform a light stale check instead
    const STALE_MS = 5000;  // if no update for 5s, perform a one-shot refresh
    const POLL_MS = 2000;   // legacy fallback poll cadence

    let timerId;
    if (wsStatus === 'connected') {
      timerId = setInterval(() => {
        try {
          const lastUpdateStr = useRealtimeStore.getState().deviceData[currentDevice.id]?.lastUpdate;
          const lastTs = lastUpdateStr ? new Date(lastUpdateStr).getTime() : 0;
          if (!lastTs || (Date.now() - lastTs) > STALE_MS) {
            refreshLiteDeviceData(currentDevice.id);
          }
        } catch (_) { /* noop */ }
      }, 3000);
    } else {
      // WS not connected: keep legacy 2s polling
      timerId = setInterval(() => refreshLiteDeviceData(currentDevice.id), POLL_MS);
    }

    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id, timeRange, wsStatus]);

  // Handle device card click
  const handleDeviceInfoClick = (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;

    // Save the current device selection before navigating away
    const idx = ownedDevices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      try {
  localStorage.setItem('dashboard.activeDeviceIndex', idx.toString());
  localStorage.setItem('dashboard.activeDeviceId', device.id.toString());
      } catch (e) {
        console.warn('Failed to save device selection:', e);
      }
    }

    navigate(`/device/${device.id}`);
  };

  const handleDeviceMediaClick = async (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;
    // Focus this device in dashboard and refresh its data
    const idx = ownedDevices.findIndex(d => d.id === device.id);
    if (idx >= 0) setActiveIdx(idx);
    try {
      setDeviceLoading(prev => ({ ...prev, [device.id]: true }));
      await fetchDeviceDataById(device.id);
    } finally {
      setDeviceLoading(prev => ({ ...prev, [device.id]: false }));
    }
    // Optionally: scroll to metrics area (dash-main)
    const main = document.querySelector('.dash-main');
    if (main && typeof main.scrollIntoView === 'function') {
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle FAB click (if not dragged)
  const handleFabClick = () => {
    if (!hasDraggedRef.current) {
      navigate('/add-device/setup');
    }
  };

  // FAB Mouse Drag Handlers
  const handleFabMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fabX: fabPosition.x,
      fabY: fabPosition.y
    };
  };

  const handleFabMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    // Consider it a drag if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }
    const newX = Math.max(16, Math.min(window.innerWidth - fabSize - 16, dragStartRef.current.fabX + dx));
    const minY = topBarHeight + 16; // Top bar + margin
    const maxY = window.innerHeight - navHeight - fabSize - 16; // Bottom nav + margin
    const newY = Math.max(minY, Math.min(maxY, dragStartRef.current.fabY + dy));
    setFabPosition({ x: newX, y: newY });
  };

  const handleFabMouseUp = () => {
    setIsDragging(false);
    // Trigger click action if not dragged
    if (!hasDraggedRef.current) {
      handleFabClick();
    }
  };

  // FAB Touch Drag Handlers
  const handleFabTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fabX: fabPosition.x,
      fabY: fabPosition.y
    };
  };

  const handleFabTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    // Consider it a drag if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }
    const newX = Math.max(16, Math.min(window.innerWidth - fabSize - 16, dragStartRef.current.fabX + dx));
    const minY = topBarHeight + 16; // Top bar + margin
    const maxY = window.innerHeight - navHeight - fabSize - 16; // Bottom nav + margin
    const newY = Math.max(minY, Math.min(maxY, dragStartRef.current.fabY + dy));
    setFabPosition({ x: newX, y: newY });
  };

  const handleFabTouchEnd = () => {
    setIsDragging(false);
    // Trigger click action if not dragged
    if (!hasDraggedRef.current) {
      handleFabClick();
    }
  };

  // Attach/detach global mouse/touch listeners for FAB dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleFabMouseMove);
      window.addEventListener('mouseup', handleFabMouseUp);
      window.addEventListener('touchmove', handleFabTouchMove, { passive: false });
      window.addEventListener('touchend', handleFabTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleFabMouseMove);
      window.removeEventListener('mouseup', handleFabMouseUp);
      window.removeEventListener('touchmove', handleFabTouchMove);
      window.removeEventListener('touchend', handleFabTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleFabMouseMove);
      window.removeEventListener('mouseup', handleFabMouseUp);
      window.removeEventListener('touchmove', handleFabTouchMove);
      window.removeEventListener('touchend', handleFabTouchEnd);
    };
  }, [isDragging, fabPosition]);

  // Modal drag handlers for swipe-down-to-close
  const handleModalTouchStart = (e) => {
    const touch = e.touches[0];
    setModalDragStart(touch.clientY);
    setModalDragOffset(0);
  };

  const handleModalTouchMove = (e) => {
    const modalContent = modalContentRef.current;
    const touch = e.touches[0];
    const diff = touch.clientY - modalDragStart;

    // Check if modal content is scrolled to the top
    const isAtTop = !modalContent || modalContent.scrollTop === 0;

    // Only allow dragging down when at top of scroll (positive diff)
    if (diff > 0 && isAtTop) {
      e.preventDefault(); // Prevent screen scroll
      setModalDragOffset(diff);
    }
  };

  const handleModalTouchEnd = (e) => {
    // If dragged down more than 100px, close the modal
    if (modalDragOffset > 100) {
      setSelectedMonitoringCard(null);
    }
    // Reset drag state
    setModalDragOffset(0);
    setModalDragStart(0);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedMonitoringCard) {
      // Save current scroll position
      scrollPositionRef.current = window.scrollY;

      // Lock body scroll and maintain position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';

      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [selectedMonitoringCard]);

  // Infinite scroll disabled to prevent duplicate device appearance
  const isInfinite = false;
  const infiniteDevices = useMemo(() => {
    if (ownedDevices.length === 0) return [];
    if (!isInfinite) return ownedDevices; // For normal carousel, render as-is
    // For infinite scroll, add last at start and first at end for seamless loop
    return [
      { ...ownedDevices[ownedDevices.length - 1], _cloneType: 'last' },
      ...ownedDevices.map(d => ({ ...d, _cloneType: 'original' })),
      { ...ownedDevices[0], _cloneType: 'first' }
    ];
  }, [ownedDevices, isInfinite]);  // Initialize scroll position; scroll to restored device or first device
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || ownedDevices.length === 0) return;
    const w = el.clientWidth;
    const cardW = w * 0.85;
    const gap = 16;

    if (isInfinite) {
      // Scroll to restored device + 1 (account for clone at start)
      el.scrollLeft = (cardW + gap) * (activeIdx + 1);
    } else {
      // Non-infinite: scroll directly to restored device index
      el.scrollLeft = (cardW + gap) * activeIdx;
    }
  }, [ownedDevices, activeIdx, isInfinite]);

  // Handle scroll position tracking and loop boundaries
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || ownedDevices.length === 0) return;

    const onScroll = () => {
      if (isAdjustingRef.current) return;

      const w = el.clientWidth;
      const cardW = w * 0.85;
      const gap = 16;
      const scrollPos = el.scrollLeft;
      const idx = Math.round(scrollPos / (cardW + gap));

      // Clear any pending timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      if (!isInfinite) {
        // Non-infinite: directly map scroll index to device index (0..len-1)
        const clamped = Math.max(0, Math.min(ownedDevices.length - 1, idx));
        setActiveIdx(clamped);
        return;
      }

      // Infinite: map clone indexes to real device index
      if (idx === 0) {
        setActiveIdx(ownedDevices.length - 1); // Showing clone of last device
      } else if (idx === infiniteDevices.length - 1) {
        setActiveIdx(0); // Showing clone of first device
      } else {
        setActiveIdx(idx - 1); // Real device index
      }

      // After scroll settles, check if we need to loop
      scrollTimeoutRef.current = setTimeout(() => {
        if (idx === 0) {
          // At clone of last device - jump to real last device
          isAdjustingRef.current = true;
          el.scrollLeft = (cardW + gap) * ownedDevices.length;
          setTimeout(() => { isAdjustingRef.current = false; }, 50);
        } else if (idx === infiniteDevices.length - 1) {
          // At clone of first device - jump to real first device
          isAdjustingRef.current = true;
          el.scrollLeft = (cardW + gap) * 1;
          setTimeout(() => { isAdjustingRef.current = false; }, 50);
        }
      }, 150); // Wait for scroll to settle
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [infiniteDevices.length, ownedDevices.length, isInfinite]);


  // Merge store data with local pH history
  const mergedData = useMemo(() => {
    if (!data) return null;
    const localPh = localPhData[currentDevice?.id];
    return {
      ...data,
      phHistory: localPh?.phHistory || data.phHistory || [],
      phLabels: localPh?.phLabels || data.phLabels || [],
    };
  }, [data, localPhData, currentDevice]);

  const phTotal = mergedData && Array.isArray(mergedData.phHistory) ? mergedData.phHistory.length : 0;
  const maxStart = Math.max(0, phTotal - PH_WINDOW_SIZE);
  const currentStart = useMemo(() => {
    if (!currentDevice) return 0;
    const saved = phWindows[currentDevice.id];
    // Default to last window; clamp if total changed
    const base = typeof saved === 'number' ? saved : maxStart;
    return Math.min(Math.max(0, base), maxStart);
  }, [currentDevice, phWindows, maxStart]);
  const phHistoryDisplay = useMemo(() => {
    if (!mergedData || !Array.isArray(mergedData.phHistory)) {
      return [];
    }
    // Show 10-day window from the 30-day dataset based on currentStart
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phHistory.length, start + PH_WINDOW_SIZE);
    const result = mergedData.phHistory.slice(start, end);
    return result;
  }, [mergedData, currentStart, PH_WINDOW_SIZE, mergedData?.phHistory?.length]);
  const phLabelsDisplay = useMemo(() => {
    if (!mergedData || !Array.isArray(mergedData.phLabels)) return [];
    // Show corresponding labels for the windowed data
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phLabels.length, start + PH_WINDOW_SIZE);
    return mergedData.phLabels.slice(start, end);
  }, [mergedData, currentStart, PH_WINDOW_SIZE, mergedData?.phLabels?.length]);

  // Dynamic scale for pH bars based on displayed data (excluding null values)
  const phNumbers = useMemo(() =>
    phHistoryDisplay
      .filter(n => n !== null && n !== undefined)
      .map(n => Number(n))
      .filter(Number.isFinite),
    [phHistoryDisplay]
  );
  const phScale = useMemo(() => {
    // Derive a readable pH scale with small padding and nice 0.1 rounding
    if (!phNumbers.length) return { min: 5.5, max: 7.0 };
    let min = Math.min(...phNumbers);
    let max = Math.max(...phNumbers);

    // Ensure some headroom so bars don’t look pegged to top/bottom
    const desiredMinPad = 0.05;
    const desiredMaxPad = 0.05;
    min = Math.max(0, min - desiredMinPad);
    max = Math.min(14, max + desiredMaxPad);

    // If the span is extremely tight, expand to a reasonable window
    if (max - min < 0.3) {
      const mid = (min + max) / 2;
      min = Math.max(0, mid - 0.15);
      max = Math.min(14, mid + 0.15);
    }

    // Round outward to 0.1 boundaries
    min = Math.floor(min * 10) / 10;
    max = Math.ceil(max * 10) / 10;

    // Guard against equal bounds
    if (min === max) {
      min = Math.max(0, min - 0.1);
      max = Math.min(14, max + 0.1);
    }

    return { min, max };
  }, [phNumbers]);

  const phYTicks = useMemo(() => {
    // Build unique, descending tick values with a “nice” step
    const MAX_TICKS = 7;
    let step = 0.1;
    const span = Math.max(0.1, phScale.max - phScale.min);
    // Increase step until ticks fit within MAX_TICKS
    while (((span / step) + 1) > MAX_TICKS) {
      // 0.1 -> 0.2 -> 0.5 -> 1.0 -> 2.0, etc.
      step = step === 0.1 ? 0.2 : step === 0.2 ? 0.5 : step * 2;
    }

    // Start and end on step-aligned boundaries
    const start = Math.ceil(phScale.max * 10 / (step * 10)) * step; // align up
    const end = Math.floor(phScale.min * 10 / (step * 10)) * step;  // align down

    const ticks = [];
    for (let v = start; v >= end - 1e-9; v = Math.round((v - step) * 10) / 10) {
      ticks.push(Number(v.toFixed(1)));
      if (ticks.length >= MAX_TICKS) break; // safety guard
    }

    // Ensure at least two ticks
    if (ticks.length < 2) {
      ticks.splice(0, ticks.length, Number(phScale.max.toFixed(1)), Number(phScale.min.toFixed(1)));
    }

    return ticks.map(v => `${v.toFixed(1)} pH`);
  }, [phScale]);

  // Realtime pH -> update the latest bucket of the pH chart so new readings appear without manual refresh
  const prevPhRef = useRef(undefined);
  const prevPhTsRef = useRef(undefined);
  useEffect(() => {
    if (!currentDevice) return;
    const ph = data?.sensors?.ph;
    if (!Number.isFinite(Number(ph))) return;
    const ts = data?.lastUpdate;
    const changed = prevPhRef.current !== ph || prevPhTsRef.current !== ts;
    if (!changed) return;

    const existing = Array.isArray(mergedData?.phHistory) ? mergedData.phHistory : [];
    if (existing.length === 0) {
      // Seed history if empty
      fetchDeviceDataById(currentDevice.id);
    } else {
      const updated = existing.slice();
      // Update current period (last bucket) with the latest pH value
      updated[updated.length - 1] = Number(ph);
      const labels = Array.isArray(mergedData?.phLabels) ? mergedData.phLabels : [];
      // Persist locally and update store to keep views in sync
      persistPhData(currentDevice.id, updated, labels, timeRange);
      updateDeviceData(currentDevice.id, { phHistory: updated, phLabels: labels });
    }

    prevPhRef.current = ph;
    prevPhTsRef.current = ts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id, data?.sensors?.ph, data?.lastUpdate, timeRange, mergedData?.phHistory?.length]);

  // Update default window when device changes or total increases and nothing saved
  useEffect(() => {
    if (!currentDevice) return;

    // Check if we have persisted pH data for this device
    const savedData = localPhData[currentDevice.id];
    if (!(savedData && savedData.timeRange === timeRange)) {
      // Fetch fresh pH data if we don't have it or time range changed
      fetchDeviceDataById(currentDevice.id);
    }

    if (phTotal === 0) return;
    setPhWindows(prev => {
      if (typeof prev[currentDevice.id] === 'number') return prev; // keep user's position
      return { ...prev, [currentDevice.id]: maxStart };
    });
  }, [currentDevice, phTotal, maxStart, timeRange]);

  const canPrev = phTotal > PH_WINDOW_SIZE && currentStart > 0;
  const canNext = phTotal > PH_WINDOW_SIZE && currentStart < maxStart;
  const onPrev = () => {
    if (!currentDevice || !canPrev) return;
    setPhWindows(prev => ({ ...prev, [currentDevice.id]: Math.max(0, (prev[currentDevice.id] ?? maxStart) - 1) }));
  };
  const onNext = () => {
    if (!currentDevice || !canNext) return;
    setPhWindows(prev => ({ ...prev, [currentDevice.id]: Math.min(maxStart, (prev[currentDevice.id] ?? maxStart) + 1) }));
  };
  // Robust label for pH legend: prefer device_name, then plant_name, then fallback
  const legendLabel = useMemo(() => {
    if (!currentDevice) return 'Device';
    const name = (currentDevice.device_name || '').trim();
    const plant = (currentDevice.plant_name || '').trim();
    // For shared devices, don't show serial number
    const fallback = (currentDevice.is_collaborator && !currentDevice.is_owner) ?
      'Shared Device' :
      currentDevice.device_serial;
    return name || plant || fallback || 'Device';
  }, [currentDevice]);
  const currentPH = useMemo(() => {
    // Prefer real-time latest sensor value from store if present
    if (typeof data?.sensors?.ph === 'number') return data.sensors.ph.toFixed(1);
    if (Array.isArray(mergedData?.phHistory)) {
      const lastValue = [...mergedData.phHistory].reverse().find(v => v !== null && v !== undefined);
      if (Number.isFinite(Number(lastValue))) return Number(lastValue).toFixed(1);
    }
    return '--';
  }, [activeIdx, data, mergedData]);

  // Save activeIdx and device ID to localStorage whenever it changes
  useEffect(() => {
    if (ownedDevices && ownedDevices.length > 0 && ownedDevices[activeIdx]) {
      try {
        const deviceId = ownedDevices[activeIdx].id.toString();
        const deviceName = ownedDevices[activeIdx].device_name || ownedDevices[activeIdx].plant_name || `Device ${deviceId}`;
        localStorage.setItem('dashboard.activeDeviceIndex', activeIdx.toString());
        localStorage.setItem('dashboard.activeDeviceId', deviceId);
      } catch (e) {
        console.warn('Failed to save active device index:', e);
      }
    }
  }, [activeIdx, ownedDevices]);

  // When devices list changes (e.g., after fetch), restore saved device or validate current index
  // Only run after store hydration to ensure deviceData is available
  // Track if we've already restored to prevent multiple restoration attempts
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || !ownedDevices || ownedDevices.length === 0 || hasRestoredRef.current) return;

    hasRestoredRef.current = true;

    try {
      const savedIdx = parseInt(localStorage.getItem('dashboard.activeDeviceIndex') || '0', 10);
      const savedDeviceId = localStorage.getItem('dashboard.activeDeviceId');

      let restoredIdx = -1;

      // First, try to find the device by ID (more reliable across refreshes)
      if (savedDeviceId) {
        const deviceIdxById = ownedDevices.findIndex(d => d.id.toString() === savedDeviceId);
        if (deviceIdxById >= 0) {
          restoredIdx = deviceIdxById;
        }
      }

      // Fallback to saved index if valid for current device list
      if (restoredIdx < 0 && savedIdx >= 0 && savedIdx < ownedDevices.length) {
        restoredIdx = savedIdx;
      }

      // If neither works, reset to first device
      if (restoredIdx < 0) {
        restoredIdx = 0;
        localStorage.setItem('dashboard.activeDeviceIndex', '0');
        if (ownedDevices[0]) {
          localStorage.setItem('dashboard.activeDeviceId', ownedDevices[0].id.toString());
        }
      }

      // Set the active index
      setActiveIdx(restoredIdx);

      // Immediately fetch data for the restored device to ensure it's displayed and plant-aware
      const restoredDevice = ownedDevices[restoredIdx];
      if (restoredDevice?.id) {
        // Check if we already have data in the store
        const existingData = devicesData[restoredDevice.id];

        // Check existing data for restored device

        // Determine if we must augment: plant missing or pH history missing
        const hasValidSensorData = existingData?.sensors &&
          Object.values(existingData.sensors).some(v => v !== undefined && v !== null);
        const needsPlantOrPh = !existingData?.plant || !Array.isArray(existingData?.phHistory) || existingData.phHistory.length === 0;

        if (!existingData || !hasValidSensorData || needsPlantOrPh) {
          // Use setTimeout to ensure this happens after the render
          setTimeout(() => fetchDeviceDataById(restoredDevice.id), 50);
        } else {
          // Mark as fetched
          lastFetchedDeviceRef.current = restoredDevice.id;
        }
      }
    } catch (e) {
      console.warn('Failed to restore active device index:', e);
      setActiveIdx(0);
    }
  }, [ownedDevices.length, isHydrated]);

  // Monitoring card metadata with importance and recommendations
  const getMonitoringCardInfo = (cardType) => {
    const cardData = {
      ph: {
        title: 'Current pH Level',
        icon: <Droplet size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.ph === 'number' ? `${data.sensors.ph.toFixed(1)} pH` : 'Loading...',
        importance: "Knowing your SmarTanom's pH level is important in hydroponics because it controls how well plants absorb nutrients.",
        recommendation: "Maintain pH between 5.5-6.5 for optimal nutrient absorption. Adjust using pH up/down solutions if needed."
      },
      ec: {
        title: 'Electrical Conductivity Levels',
        icon: <Zap size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.ec === 'number' ? `${data.sensors.ec.toFixed(1)} mS/cm` : 'Loading...',
        importance: "EC level shows how much nutrients are in the water. Too low means plants are hungry, and too high can burn their roots.",
        recommendation: "Keep EC between 1.2-2.4 mS/cm depending on plant growth stage. Lower for seedlings, higher for fruiting plants."
      },
      tds: {
        title: 'Total Dissolved Solids',
        icon: <Waves size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.tds === 'number' ? `${Math.round(data.sensors.tds)} ppm` : 'Loading...',
        importance: "TDS measures the amount of nutrients in the water. It's important because it helps ensure plants get the right amount of food.",
        recommendation: "Maintain TDS between 600-1200 ppm for most vegetables. Monitor daily and adjust nutrients as plants consume them."
      },
      waterLevel: {
        title: 'Water Level',
        icon: <Droplet size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.waterLevel === 'number' ? `${Math.round(data.sensors.waterLevel)}%` : 'Loading...',
        importance: "Water level monitoring ensures your plants have continuous access to nutrients and prevents pump damage from running dry.",
        recommendation: "Keep water level above 20%. Refill when it drops below 30% to maintain stable growing conditions."
      },
      turbidity: {
        title: 'Turbidity',
        icon: <Droplets size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.turbidity === 'number' ? `${data.sensors.turbidity.toFixed(1)} NTU` : 'Loading...',
        importance: "Turbidity measures how clear the water is. It's important because dirty or cloudy water can block light, harm roots, and carry diseases.",
        recommendation: "Aim for turbidity below 5 NTU. If levels are high, clean your reservoir and check for algae growth or root debris."
      },
      waterTemp: {
        title: 'Water Temperature',
        icon: <Thermometer size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />,
        getValue: () => data && typeof data.sensors?.water_temperature === 'number' ? `${data.sensors.water_temperature.toFixed(1)}°C` : 'Loading...',
        importance: "Water temperature affects oxygen levels and nutrient uptake. Too warm encourages harmful bacteria and reduces dissolved oxygen.",
        recommendation: "Maintain water temperature between 18-22°C (65-72°F). Use a water chiller in hot climates or add frozen water bottles to cool."
      }
    };
    return cardData[cardType] || null;
  };

  // Show loading state while hydrating or loading initial data
  if (!isHydrated || loadingInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName}
          </h1>
        </header>
        <GlobalLoadingSpinner message="Loading your devices..." />
      </div>
    );
  }

  // Show error state
  if (errorInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName}
          </h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <AlertCircle size={48} color="#e74c3c" />
          <p style={{ color: '#e74c3c', fontSize: '1rem' }}>{errorInitial}</p>
          <button
            onClick={fetchInitial}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show no devices state
  if (ownedDevices.length === 0) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName}
          </h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Leaf size={48} color={PRIMARY_GREEN} />
          <p style={{ color: '#666', fontSize: '1rem' }}>No devices found</p>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Bind your first device to get started!</p>
          <button
            onClick={() => navigate('/add-device/setup')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Add Device
          </button>
        </div>
        {/* Bottom navigation */}
        <BottomNav active="tanom" totalUnread={totalUnread} />
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      {/* Mobile Top Bar */}
      <header className="mobile-top-bar" role="banner">
        <div className="mobile-top-bar-left">
          <button
            className="mobile-top-bar-profile"
            aria-label="Profile Settings"
            onClick={() => navigate('/profile')}
          >
            <User size={20} />
          </button>
          <span className="mobile-top-bar-name">{displayName}</span>
        </div>
        <div className="mobile-top-bar-right">
          <button
            className="mobile-top-bar-icon"
            aria-label="Add Device"
            onClick={() => navigate('/add-device/setup')}
          >
            <Plus size={22} />
          </button>
          <button
            className={`mobile-top-bar-icon ${loadingInitial ? 'syncing' : ''}`}
            aria-label="Sync"
            onClick={fetchInitial}
            disabled={loadingInitial}
          >
            <RefreshCw size={22} />
          </button>
          <button
            className="mobile-top-bar-icon mobile-top-bar-bell"
            aria-label={`Notifications - ${totalUnread} unread`}
            onClick={() => navigate('/alerts')}
            style={{ position: 'relative' }}
          >
            <Bell size={22} />
            {totalUnread > 0 && (
              <span className="mobile-top-bar-badge">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Desktop Header (hidden on mobile) */}
      <header className="dash-header" role="banner">
        <h1 className="dash-header-title">
          Hello, {displayName}
        </h1>
        <button className="dash-header-settings" aria-label="Sync" onClick={fetchInitial}>
          <RefreshCw size={24} color={PRIMARY_GREEN} />
        </button>
      </header>

      {/* Device Carousel */}
      <section className="device-carousel-section" aria-label="Your devices">
        <div className="device-carousel-container">
          <div className="device-carousel" ref={carouselRef}>
            {infiniteDevices.map((device, index) => {
              const isActive = !isInfinite
                ? index === activeIdx
                : (device._cloneType === 'original' && ownedDevices[activeIdx]?.id === device.id);

              return (
                <div
                  key={`${device.id}-${device._cloneType || 'original'}-${index}`}
                  className={`device-carousel-card ${isActive ? 'active' : ''}`}
                  onClick={(e) => {
                    // Navigate to device details when clicking anywhere on the card
                    if (isActive) {
                      handleDeviceInfoClick(e, device);
                    } else {
                      // If not active, just activate the card
                      if (!isInfinite) {
                        setActiveIdx(index);
                      } else if (device._cloneType === 'original') {
                        const realIndex = ownedDevices.findIndex(d => d.id === device.id);
                        if (realIndex !== -1) setActiveIdx(realIndex);
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${device.device_name} - ${device.device_serial}`}
                  style={{ cursor: isActive ? 'pointer' : 'default' }}
                >
                  <div>
                    {/* Full Background Image */}
                    <div className="device-carousel-card-image">
                      <img
                        src={resolveMediaUrl(device.plant_photo_url) || defaultHydroponic}
                        alt={device.plant_name ? `${device.plant_name} in ${device.device_name}` : device.device_name}
                        loading="lazy"
                        onError={(e) => withImgFallback(e, defaultHydroponic)}
                      />
                      {deviceLoading[device.id] && (
                        <div className="device-carousel-loading">
                          <Loader size={20} className="spin" />
                        </div>
                      )}
                    </div>

                    {/* Floating White Info Card (Bottom Overlay) */}
                    <div className="device-carousel-card-overlay">
                      <div className="device-carousel-card-info">
                        <div className="device-carousel-card-text">
                          <h3 className="device-carousel-card-name">{device.device_name}</h3>
                          <p className="device-carousel-card-id">ID: {device.device_serial}</p>
                        </div>
                        <button
                          className="device-carousel-card-arrow"
                          aria-label="View device details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeviceInfoClick(e, device);
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Pills (Pagination Dots) */}
        {ownedDevices.length >= 1 && (
          <div className="device-carousel-dots" role="tablist" aria-label="Device selection">
            {ownedDevices.map((device, index) => (
              <button
                key={device.id}
                className={`device-carousel-dot ${index === activeIdx ? 'active' : ''}`}
                onClick={() => setActiveIdx(index)}
                role="tab"
                aria-selected={index === activeIdx}
                aria-label={`Switch to ${device.device_name}`}
              />
            ))}
          </div>
        )}
      </section>

      <main className="dash-main" role="main">
        {/* Alert Summary */}
        <section className="card alert-card" aria-label="Alert summary" onClick={() => navigate(`/alerts${currentDevice ? `?deviceId=${currentDevice.id}` : ''}`)} style={{ cursor: 'pointer' }}>
          <div className="alert-card-top">
            <div className="icon-circle" style={{ position: 'relative' }}>
              <AlertCircle size={20} color={
                data?.latestDbAlert
                  ? (data.latestDbAlert.severity === 'critical' ? '#e74c3c' : data.latestDbAlert.severity === 'warning' ? '#f59e0b' : '#339432')
                  : PRIMARY_GREEN
              } strokeWidth={2.5} />
              {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
                <span className="alert-notification-badge" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: data?.latestDbAlert
                    ? (data.latestDbAlert.severity === 'critical' ? '#e74c3c' : data.latestDbAlert.severity === 'warning' ? '#f59e0b' : '#339432')
                    : '#e74c3c',
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
                  {(() => { const c = perDeviceUnreadCounts[currentDevice?.id] || 0; return c > 9 ? '9+' : c; })()}
                </span>
              )}
            </div>
            <button className="alert-card-expand" aria-label="Open alerts" onClick={(e) => { e.stopPropagation(); navigate(`/alerts${currentDevice ? `?deviceId=${currentDevice.id}` : ''}`); }}>
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
          <h3 className="alert-card-title">
            {currentDevice ? `${currentDevice.device_name || currentDevice.plant_name || 'Device'} Alerts` : 'Alert Summary'}
            {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
              <span style={{
                color: data?.latestDbAlert
                  ? (data.latestDbAlert.severity === 'critical' ? '#e74c3c' : data.latestDbAlert.severity === 'warning' ? '#f59e0b' : '#339432')
                  : '#e74c3c',
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                ({perDeviceUnreadCounts[currentDevice?.id]} new)
              </span>
            )}
          </h3>
          <div className="alert-card-message" style={{
            color: data?.latestDbAlert
              ? (data.latestDbAlert.severity === 'critical' ? '#e74c3c' : data.latestDbAlert.severity === 'warning' ? '#f59e0b' : '#339432')
              : 'rgba(17, 17, 17, 0.86)'
          }}>
            {/* Show only latest DB-backed alert */}
            {data?.latestDbAlert
              ? `${data.latestDbAlert.title}: ${data.latestDbAlert.message}`
              : 'No alerts'}
          </div>
          {currentDevice && (
            <p style={{
              fontSize: '11px',
              color: '#8BA797',
              margin: '8px 0 0 0',
              fontStyle: 'italic'
            }}>
              Click to view alerts for this device only
            </p>
          )}
        </section>


        {/* Connectivity & Sync */}
        <section className="status-grid" aria-label="Status">
          <div className="status-box">
            <div className="icon-circle">
              <Wifi size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Connectivity</span>
              {(() => {
                const status = data?.lastUpdate ? getConnectivityStatus(data.lastUpdate) : { connectivity: data?.connectivity, lastSync: data?.lastSyncLabel };
                const conn = status?.connectivity || 'Offline';
                return (
                  <span className={`status-value ${conn === 'Online' ? 'status-online' : 'status-offline'}`}>
                    {data ? conn : 'Loading...'}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="status-box">
            <div className="icon-circle">
              <RefreshCw size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Last Data Sync</span>
              {(() => {
                const status = data?.lastUpdate ? getConnectivityStatus(data.lastUpdate) : { connectivity: data?.connectivity, lastSync: data?.lastSyncLabel };
                const label = status?.lastSync || 'Never';
                return (
                  <span className="status-value">{data ? label : 'Loading...'}</span>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Nutrient level */}
        <section className="card nutrient-card" aria-label="Nutrient level">
          <h3 className="nutrient-title">Nutrient Level</h3>
          <div className="nutrient-status">
            <div className="icon-circle">
              <Leaf size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="nutrient-text">
              {(() => {
                // Determine nutrient status using available sensor: prefer TDS (ppm); fallback to EC (mS/cm)
                let plant = data?.plant || currentDevice?.plant;
                if (!plant) {
                  try {
                    const name = currentDevice?.plant_name;
                    const catalog = plantCatalogRef.current || [];
                    if (name && Array.isArray(catalog)) {
                      plant = catalog.find(p => p.plant_name === name) || null;
                    }
                  } catch (_e) { /* ignore */ }
                }

                const tdsValue = typeof data?.sensors?.tds === 'number' ? Number(data.sensors.tds) : null;
                const ecValue = typeof data?.sensors?.ec === 'number' ? Number(data.sensors.ec) : null;

                // Show "No sensor data" if no plant configured
                if (!plant) {
                  if (tdsValue === null && ecValue === null) return 'No sensor data';
                  return 'No plant configured';
                }

                // If we have TDS value and plant has TDS ranges
                if (Number.isFinite(tdsValue) && plant.ppm_min != null && plant.ppm_max != null) {
                  const cls = classifyTDS(tdsValue, plant);
                  if (cls.severity === 'critical') return tdsValue < plant.ppm_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
                  if (cls.severity === 'warning') return tdsValue < plant.ppm_min ? 'Low (near min)' : 'High (near max)';
                  return 'Optimal';
                }

                // If we have EC value and plant has EC ranges
                if (Number.isFinite(ecValue) && plant.ec_min != null && plant.ec_max != null) {
                  const cls = classifyEC(ecValue, plant);
                  if (cls.severity === 'critical') return ecValue < plant.ec_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
                  if (cls.severity === 'warning') return ecValue < plant.ec_min ? 'Low (near min)' : 'High (near max)';
                  return 'Optimal';
                }

                // If we have sensor readings but no plant ranges
                if (tdsValue !== null || ecValue !== null) {
                  return 'Plant ranges not configured';
                }

                // No sensor readings available
                return 'No sensor data';
              })()}
            </span>
          </div>
        </section>

        {/* pH levels over time */}
        <section className="card ph-card" aria-label="pH levels over time" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(139, 167, 151, 0.15)'
        }}>
          <div className="ph-card-header">
            <div className="icon-circle" style={{
              background: 'linear-gradient(135deg, rgba(51, 148, 50, 0.15) 0%, rgba(51, 148, 50, 0.08) 100%)',
              border: '2px solid rgba(51, 148, 50, 0.2)'
            }}>
              <Activity size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="ph-card-title" style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: '#2d3748'
            }}>
              pH Levels Over Time
            </span>
            <select
              className="range-switch"
              aria-label="Select time range"
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              style={{
                fontSize: '12px',
                background: 'white',
                border: '1.5px solid rgba(139,167,151,0.3)',
                padding: '7px 16px',
                borderRadius: '8px',
                color: 'var(--color-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = PRIMARY_GREEN.replace('0.9', '0.5');
                e.target.style.boxShadow = '0 2px 4px rgba(51, 148, 50, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(139,167,151,0.3)';
                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div className="ph-legend" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            padding: '10px 20px',
            borderBottom: '1px solid rgba(139, 167, 151, 0.12)',
            background: 'rgba(248, 250, 252, 0.5)'
          }}>
            <span className="ph-legend-dot" style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: PRIMARY_GREEN,
              boxShadow: '0 0 0 3px rgba(51, 148, 50, 0.15)'
            }}></span>
            <span className="ph-legend-label" style={{
              fontWeight: '600',
              color: '#4a5568',
              fontSize: '13px'
            }}>{legendLabel}</span>
          </div>
          
          {/* pH Line Chart */}
          <div style={{ 
            padding: '20px', 
            height: '340px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PHLineChart 
              phData={data?.phRawData || []}
              plant={data?.plant || currentDevice?.plant}
              barsPerPage={PH_WINDOW_SIZE}
              timeRange={timeRange}
            />
          </div>
        </section>

        {/* Current pH level (real-time latest reading, independent of history) */}
        <section className="card current-ph-card" aria-label="Current pH" onClick={() => setSelectedMonitoringCard('ph')} style={{ cursor: 'pointer' }}>
          {(() => {
            // Resolve the freshest current pH value from multiple sources
            // 1) Realtime snapshot (WS or lite refresh)
            let latestPh = (typeof data?.sensors?.ph === 'number' && Number.isFinite(data.sensors.ph))
              ? Number(data.sensors.ph)
              : null;
            // 2) Fallback to newest value in raw fetched history (by created_at)
            if (latestPh === null && Array.isArray(data?.phRawData) && data.phRawData.length) {
              try {
                const newest = data.phRawData.reduce((acc, r) => {
                  if (!r || r.value == null || !r.created_at) return acc;
                  const t = new Date(r.created_at).getTime();
                  if (!Number.isFinite(t)) return acc;
                  if (!acc || t > acc.t) return { t, v: Number(r.value) };
                  return acc;
                }, null);
                if (newest && Number.isFinite(newest.v)) latestPh = newest.v;
              } catch (_) { /* ignore */ }
            }
            const hasPh = typeof latestPh === 'number' && Number.isFinite(latestPh);
            const phVal = hasPh ? latestPh : null;
            let plantObj = data?.plant || currentDevice?.plant;
            if (!plantObj) {
              try {
                const name = currentDevice?.plant_name;
                const catalog = plantCatalogRef.current || [];
                if (name && Array.isArray(catalog)) {
                  plantObj = catalog.find(p => p.plant_name === name) || null;
                }
              } catch (_e) { /* ignore */ }
            }

            // Enhanced status determination with plant-specific ranges
            const getPHStatus = (phValue) => {
              if (!hasPh) return { status: 'No Data', severity: 'none', color: '#8BA797' };
              // Use plant-specific ranges if available; otherwise neutral
              if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                const phMin = Number(plantObj.ph_min);
                const phMax = Number(plantObj.ph_max);
                if (phValue < phMin) return { status: 'Critical Low', severity: 'critical', color: '#e74c3c' };
                if (phValue > phMax) return { status: 'Critical High', severity: 'critical', color: '#e74c3c' };
                const buffer = Math.max(0.05, (phMax - phMin) * 0.1);
                if (phValue <= phMin + buffer) return { status: 'Low Warning', severity: 'warning', color: '#f59e0b' };
                if (phValue >= phMax - buffer) return { status: 'High Warning', severity: 'warning', color: '#f59e0b' };
                return { status: 'Optimal', severity: 'optimal', color: '#339432' };
              }
              // No plant ranges configured - show neutral status
              return { status: 'Measuring', severity: 'none', color: PRIMARY_GREEN };
            };

            const phStatus = getPHStatus(phVal);

            return (
              <>
                <div className="ph-value-container">
                  <div className="ph-value-main">
                    <span className="ph-number" style={{ color: phStatus.color }}>{hasPh ? phVal.toFixed(1) : '--'}</span>
                    <span className="ph-unit">pH</span>
                  </div>
                  <div className="ph-status-indicator">
                    <div className={`ph-status-dot ${phStatus.severity}`} style={{ backgroundColor: phStatus.color }}></div>
                    <span className="ph-status-text" style={{ color: phStatus.color }}>{phStatus.status}</span>
                  </div>
                </div>
                <div className="ph-info-section">
                  <div className="ph-label-row">
                    <Activity size={16} color={phStatus.color} strokeWidth={2.5} />
                    <span className="ph-label">Current Level</span>
                  </div>
                  <div className="ph-range-indicator">
                    <div className="range-bar">
                      <div
                        className="optimal-range"
                        style={{
                          display: (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) ? 'block' : 'none',
                          left: (() => {
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const leftPct = ((phMin - visualMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, leftPct))}%`;
                            }
                            return '0%';
                          })(),
                          width: (() => {
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const widthPct = ((phMax - phMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, widthPct))}%`;
                            }
                            return '100%';
                          })()
                        }}
                      ></div>
                      <div
                        className="current-marker"
                        style={{
                          display: hasPh ? 'block' : 'none',
                          left: (() => {
                            if (!hasPh) return '50%';
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);

                              // Calculate position based on extended range for visualization
                              // Use a range from (min - 1) to (max + 1) for better visual distribution
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const pct = ((phVal - visualMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, pct))}%`;
                            }
                            // Without plant ranges, use 0-14 scale
                            const pct = (phVal / 14) * 100;
                            return `${Math.max(0, Math.min(100, pct))}%`;
                          })(),
                          backgroundColor: phStatus.color
                        }}
                      ></div>
                    </div>
                    <div className="range-labels">
                      <span>{(() => {
                        // Left label: Show current pH if below min, otherwise show (min - 1) or min
                        if (!hasPh) return '--';
                        if (plantObj?.ph_min !== undefined) {
                          const phMin = Number(plantObj.ph_min);
                          if (phVal < phMin) {
                            return phVal.toFixed(1); // Show actual low value
                          }
                          return Math.max(0, phMin - 1).toFixed(1);
                        }
                        return '0.0';
                      })()}</span>
                      <span style={{ fontWeight: '600', color: phStatus.color }}>
                        {plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined
                          ? `${plantObj.ph_min} - ${plantObj.ph_max}`
                          : (hasPh ? phVal.toFixed(1) : '—')
                        }
                      </span>
                      <span>{(() => {
                        // Right label: Show current pH if above max, otherwise show (max + 1) or max
                        if (!hasPh) return '--';
                        if (plantObj?.ph_max !== undefined) {
                          const phMax = Number(plantObj.ph_max);
                          if (phVal > phMax) {
                            return phVal.toFixed(1); // Show actual high value
                          }
                          return Math.min(14, phMax + 1).toFixed(1);
                        }
                        return '14.0';
                      })()}</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        {/* Sensor grid */}
        <section className="sensor-grid" aria-label="Sensor data">
          <div className="sensor-cell" onClick={() => setSelectedMonitoringCard('ec')} style={{ cursor: 'pointer' }}>
            <div className="icon-circle">
              <Zap size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">EC Levels</span>
              <span className="sensor-value">{data && typeof data.sensors?.ec === 'number' ? `${data.sensors.ec.toFixed(1)} mS/cm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell" onClick={() => setSelectedMonitoringCard('tds')} style={{ cursor: 'pointer' }}>
            <div className="icon-circle">
              <Waves size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">TDS</span>
              <span className="sensor-value">{data && typeof data.sensors?.tds === 'number' ? `${Math.round(data.sensors.tds)} ppm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell" onClick={() => setSelectedMonitoringCard('waterLevel')} style={{ cursor: 'pointer' }}>
            <div className="icon-circle">
              <Droplet size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Level</span>
              <span className="sensor-value">{data && typeof data.sensors?.waterLevel === 'number' ? `${Math.round(data.sensors.waterLevel)}%` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell" onClick={() => setSelectedMonitoringCard('turbidity')} style={{ cursor: 'pointer' }}>
            <div className="icon-circle">
              <Droplets size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Turbidity</span>
              <span className="sensor-value">{
                (() => {
                  const status = data?.sensors?.turbidity_status;
                  if (typeof status === 'string' && status.trim().length > 0) {
                    const s = status.trim().toLowerCase();
                    return s.charAt(0).toUpperCase() + s.slice(1); // e.g., Clear | Cloudy | Turbid
                  }
                  const v = data?.sensors?.turbidity; // NTU (0..1000)
                  if (typeof v === 'number') {
                    if (v < 800) return 'Clear';
                    if (v < 1000) return 'Cloudy';
                    return 'Turbid';
                  }
                  return 'Loading...';
                })()
              }</span>
            </div>
          </div>
          <div className="sensor-cell" onClick={() => setSelectedMonitoringCard('waterTemp')} style={{ cursor: 'pointer' }}>
            <div className="icon-circle">
              <Thermometer size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Temp</span>
              <span className="sensor-value">{data && typeof data.sensors?.water_temperature === 'number' ? `${data.sensors.water_temperature.toFixed(1)}°C` : 'Loading...'}</span>
            </div>
          </div>
        </section>
        {/* Environment card removed per request */}
      </main>

      {/* Bottom navigation */}
      <BottomNav active="tanom" totalUnread={totalUnread} />

      {/* Floating Action Button (FAB) */}
      <button
        ref={fabRef}
        className={`floating-action-button ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
        }}
        onMouseDown={handleFabMouseDown}
        onTouchStart={handleFabTouchStart}
        aria-label="Start new cycle"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* WiFi Setup Instructions Modal */}
      {wifiSetupDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setWifiSetupDevice(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>WiFi Setup Instructions</h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Device: <strong>{wifiSetupDevice.device_name}</strong> ({wifiSetupDevice.device_serial})
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#e3f2fd',
                borderLeft: '4px solid #2196F3',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#1976D2',
                borderRadius: '4px'
              }}>
                📶 Follow these steps to connect your SmarTanom device to your WiFi network
              </div>

              <ol style={{ paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8' }}>
                <li style={{ marginBottom: '16px' }}>
                  <strong>Power on your ESP32 device</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>The LED should start blinking, indicating it's in setup mode</span>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Connect to the device's WiFi hotspot</strong>
                  <br />
                  <div style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '6px',
                    fontFamily: 'monospace'
                  }}>
                    📶 Network: <strong>{wifiSetupDevice.device_serial}</strong><br />
                    🔑 Password: <strong>smartanom123</strong>
                  </div>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Open a web browser</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Navigate to:</span>
                  <div style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '6px',
                    fontFamily: 'monospace'
                  }}>
                    🌐 <strong>http://192.168.4.1</strong>
                  </div>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Select your home WiFi network</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Choose from the list and enter your WiFi password</span>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Click "Connect"</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Wait for the device to connect (may take 30-60 seconds)</span>
                </li>

                <li>
                  <strong>Stay on this page</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Once connected, the device will automatically register and you'll be redirected to your dashboard</span>
                </li>
              </ol>

              <div style={{
                background: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '6px',
                padding: '12px',
                marginTop: '20px',
                fontSize: '13px',
                color: '#e65100'
              }}>
                <strong>⚠️ Troubleshooting:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Make sure your device is powered on and the LED is blinking</li>
                  <li>Your WiFi network must be 2.4GHz (ESP32 doesn't support 5GHz)</li>
                  <li>If connection fails, verify your WiFi password is correct</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setWifiSetupDevice(null)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Data Slide-Up Modal */}
      {selectedMonitoringCard && (() => {
        const cardInfo = getMonitoringCardInfo(selectedMonitoringCard);
        if (!cardInfo) return null;

        return (
          <div
            className="monitoring-modal-overlay"
            onClick={() => setSelectedMonitoringCard(null)}
            onTouchMove={(e) => e.preventDefault()}
          >
            <div
              ref={modalContentRef}
              className="monitoring-modal-content"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleModalTouchStart}
              onTouchMove={handleModalTouchMove}
              onTouchEnd={handleModalTouchEnd}
              style={{
                transform: `translateY(${modalDragOffset}px)`,
                transition: modalDragOffset === 0 ? 'transform 0.3s ease-out' : 'none'
              }}
            >
              {/* Drag Handle */}
              <div className="monitoring-modal-handle"></div>

              {/* Icon and Title */}
              <div className="monitoring-modal-header">
                <div className="monitoring-modal-icon">
                  {cardInfo.icon}
                </div>
                <h3 className="monitoring-modal-title">{cardInfo.title}</h3>
              </div>

              {/* Current Value */}
              <div className="monitoring-modal-value">
                {cardInfo.getValue()}
              </div>

              {/* Divider */}
              <div className="monitoring-modal-divider"></div>

              {/* Importance Section */}
              <div className="monitoring-modal-section">
                <h4 className="monitoring-modal-section-title">Importance</h4>
                <p className="monitoring-modal-text">{cardInfo.importance}</p>
              </div>

              {/* Recommended Action Section */}
              <div className="monitoring-modal-section">
                <h4 className="monitoring-modal-section-title">Recommended Action</h4>
                <p className="monitoring-modal-text">{cardInfo.recommendation}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

