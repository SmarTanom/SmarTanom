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
  Loader
} from 'lucide-react';
// Add left arrow for navigating pH chart windows
import { ChevronLeft } from 'lucide-react';
import { MdScience } from 'react-icons/md';
import { getUserDevices } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';
import { getDeviceReservoirs } from '../services/api/reservoirs.js';
import { listPlants } from '../services/api/plants.js';
import { authApi } from '../services/apiClient.js';
import { wsClient } from '../services/websocketClient';
import { useRealtimeStore } from '../store/realtimeStore';

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
      case 'turbidity':
        sensorMap.turbidity = value;
        break;
      case 'air_temperature':
        sensorMap.temperature = value;
        break;
      case 'humidity':
        sensorMap.humidity = value;
        break;
      case 'light':
        sensorMap.light = value;
        break;
    }
  });

  return sensorMap;
};

// Helper function to get pH history from sensor data based on time range
// Uses the CHRONOLOGICALLY LAST reading in each period (day/week/month bucket). We sort ascending
// by created_at so the overwrite logic always leaves the true latest value; prevents stale value after refresh.
const getPHHistory = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) {
    console.log('[Dashboard] No pH sensor data available:', { phSensorId, hasData: !!sensorDataMap[phSensorId] });
    return null;
  }

  const phDataRaw = sensorDataMap[phSensorId] || [];
  console.log(`[Dashboard] Processing ${phDataRaw.length} pH readings for ${timeRange} view`);
  
  // Sort ascending by created_at to ensure later overwrite wins are actual latest
  const phData = [...phDataRaw].sort((a,b) => {
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
      periods = 30; // Last 30 days
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
  console.log(`[Dashboard] Generated pH history: ${validReadings} valid readings, ${result.filter(v => v !== null).length} non-null periods`);
  return result;
};

// Helper function to get pH labels based on time range
const getPHLabels = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) return null;

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
      periods = 30;
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

// Helper function to generate alert text based on sensor values (now includes low thresholds)
const generateAlertText = (sensors) => {
  if (!sensors) return 'All systems normal';
  const alerts = [];

  if (typeof sensors.tds === 'number') {
    if (sensors.tds < 300) alerts.push('TDS too low (Inadequate nutrients)');
    else if (sensors.tds > 1500) alerts.push('TDS too high (Dilute solution)');
  }
  if (typeof sensors.ph === 'number') {
    if (sensors.ph < 5.5) alerts.push('pH too low - adjust up');
    else if (sensors.ph > 6.5) alerts.push('pH trending high - check solution');
    // Handle extreme pH values
    if (sensors.ph < 4.0) alerts.push('Critical: pH extremely low - immediate action required');
    if (sensors.ph > 8.0) alerts.push('Critical: pH extremely high - immediate action required');
  }
  if (typeof sensors.waterLevel === 'number') {
    if (sensors.waterLevel < 20) alerts.push('Water level below threshold');
  }
  if (typeof sensors.temperature === 'number') {
    if (sensors.temperature < 18 || sensors.temperature > 28) alerts.push('Temperature outside optimal range');
  }
  return alerts.length > 0 ? alerts[0] : 'All systems normal';
};

// Helper function to determine nutrient status
const getNutrientStatus = (tdsValue) => {
  if (tdsValue < 400) return 'Low (Nutrient needs refilling)';
  if (tdsValue > 1200) return 'High (Reduce concentration)';
  return 'Optimal';
};

// Helper functions for alert detection (shared with AlertsPage logic)
const loadReadAlerts = () => {
  try {
    const raw = localStorage.getItem('alerts.readingIds');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_e) {
    return new Set();
  }
};

const isAlertRead = (readingId) => {
  const readAlerts = loadReadAlerts();
  return readAlerts.has(readingId);
};

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
const classifyEnvTemp = (v, plant) => plant ? classifyValue(Number(v), plant.environment_temp_min, plant.environment_temp_max) : { severity: 'none' };
const classifyHumidity = (v, plant) => plant ? classifyValue(Number(v), plant.humidity_min, plant.humidity_max) : { severity: 'none' };
const classifyLight = (v, plant) => plant ? classifyValue(Number(v), plant.light_min, plant.light_max) : { severity: 'none' };
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
          height: '2px',
          background: 'rgba(139, 167, 151, 0.2)',
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
    if (!isValid) return '#8BA797'; // Gray for invalid data
    
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
    
    // Fallback to general pH ranges
    if (phValue >= 5.5 && phValue <= 6.5) return '#339432'; // Optimal green
    if (phValue >= 5.0 && phValue < 5.5) return '#f59e0b'; // Warning orange - slightly low
    if (phValue > 6.5 && phValue <= 7.0) return '#f59e0b'; // Warning orange - slightly high
    return '#e74c3c'; // Critical red - very low or very high
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
          boxShadow: isValid ? `0 2px 4px rgba(0,0,0,0.1)` : 'none'
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef(null);

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
        console.log(`[Dashboard] Time range changed to ${newTimeRange}, refreshing pH data for device ${currentDevice.id}`);
        fetchDeviceDataById(currentDevice.id);
      }
    }
  };

  // Helper function to clear saved device persistence (useful for debugging)
  const clearSavedDevice = () => {
    try {
      localStorage.removeItem('dashboard.activeDeviceIndex');
      localStorage.removeItem('dashboard.activeDeviceId');
      console.log('Cleared saved device persistence');
    } catch (e) {
      console.warn('Failed to clear saved device persistence:', e);
    }
  };
  // Keep per-device pH window start index so users can navigate dates
  const [phWindows, setPhWindows] = useState({}); // { [deviceId]: startIndex }

  // State for real data
  // Centralized realtime store state
  const devices = useRealtimeStore(s => s.devices);
  const devicesData = useRealtimeStore(s => s.deviceData);
  const fetchInitial = useRealtimeStore(s => s.fetchInitial);
  const connectWS = useRealtimeStore(s => s.connectWS);
  const latestAlerts = useRealtimeStore(s => s.latestAlerts);
  const totalUnread = useRealtimeStore(s => s.totalUnread);
  const perDeviceUnreadCounts = useRealtimeStore(s => s.unreadCounts);
  const loadingInitial = useRealtimeStore(s => s.loadingInitial);
  const errorInitial = useRealtimeStore(s => s.errorInitial);

  // Latest reading for the first device's first sensor (useful for small widgets)
  const [firstSensorReading, setFirstSensorReading] = useState(null);
  const [displayName, setDisplayName] = useState('User');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

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

  // Shared helper to compute a stable reading key (match AlertsPage logic)
  const readingKeyOf = (reading) => {
    return (reading && (reading.id || reading.created_at || reading.timestamp)) || JSON.stringify(reading || {});
  };

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
      console.log(`[Dashboard] Persisted pH data for device ${deviceId}:`, phHistory?.length || 0, 'points');
    } catch (e) {
      console.warn('Failed to persist pH data:', e);
    }
  };

  // Initialize store and fetch profile on mount
  useEffect(() => {
    const initDashboard = async () => {
      // Check authentication first
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch user profile for greeting (non-blocking)
      try {
        const profile = await authApi.getProfile(token);
        const name =
          (profile && (profile.full_name?.trim() || profile.first_name?.trim() || profile.username?.trim())) ||
          (profile && profile.email ? (profile.email.split('@')[0] || 'User') : 'User');
        setDisplayName(name);
      } catch (e) {
        console.warn('Failed to fetch profile:', e);
      }

      // Trigger store's initial device fetch
      await fetchInitial();
    };

    initDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unread counts are now managed by the realtime store automatically





  // Fetch data on component mount and when time range changes
  // Initial fetch (only once) and then refetch when timeRange changes for history-specific data if needed
  useEffect(() => {
    // Only call full fetch once on mount for base snapshot
    fetchInitial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Time range change currently affects only local ph window history building (skip server refetch to avoid flicker)

  // WebSocket real-time updates
  useEffect(() => {
    console.log('[Dashboard] Ensuring WebSocket connection via store...');
    const unsub = connectWS();
    const unsubscribe = wsClient.subscribe((update) => {
      console.log('[Dashboard] (Direct subscription) WebSocket update received:', update);

      // Handle new sensor.update format
      if (update.type === 'sensor.update') {
        console.log('[Dashboard] Real-time sensor data:', update);
        const { device_id, sensors, timestamp, reading, created } = update;

        if (device_id && sensors) {
          // Pre-compute potential alert meta (outside state setter so it's in scope later)
          let computedAlertMeta = null;
          const nowIso = new Date(timestamp || Date.now()).toISOString();

          // We'll compute combined sensors after merge; provisional logic uses incoming sensors first
          const tempCombined = {
            ...(devicesData[device_id]?.sensors || {}),
            ...(devicesData[device_id]?.environment || {}),
            ...(sensors.ph !== undefined && { ph: sensors.ph }),
            ...(sensors.tds !== undefined && { tds: sensors.tds }),
            ...(sensors.water_level !== undefined && { waterLevel: sensors.water_level }),
            ...(sensors.temperature !== undefined && { temperature: sensors.temperature }),
          };
          if (typeof tempCombined.tds === 'number' && tempCombined.tds < 300) {
            computedAlertMeta = { title: 'TDS Too Low', body: `TDS is ${Math.round(tempCombined.tds)} ppm (low)`, severity: 'warning', at: nowIso };
          } else if (typeof tempCombined.tds === 'number' && tempCombined.tds > 1500) {
            computedAlertMeta = { title: 'TDS Too High', body: `TDS is ${Math.round(tempCombined.tds)} ppm (high)`, severity: 'warning', at: nowIso };
          } else if (typeof tempCombined.ph === 'number' && tempCombined.ph < 5.5) {
            computedAlertMeta = { title: 'pH Low', body: `pH is ${tempCombined.ph.toFixed(1)} (low)`, severity: 'critical', at: nowIso };
          } else if (typeof tempCombined.ph === 'number' && tempCombined.ph > 6.5) {
            computedAlertMeta = { title: 'pH High', body: `pH is ${tempCombined.ph.toFixed(1)} (high)`, severity: 'critical', at: nowIso };
          } else if (typeof tempCombined.waterLevel === 'number' && tempCombined.waterLevel < 20) {
            computedAlertMeta = { title: 'Water Level Low', body: `Water level ${Math.round(tempCombined.waterLevel)}% (low)`, severity: 'warning', at: nowIso };
          } else if (typeof tempCombined.temperature === 'number' && (tempCombined.temperature < 18 || tempCombined.temperature > 28)) {
            computedAlertMeta = { title: 'Temperature Out of Range', body: `Temp ${tempCombined.temperature.toFixed(1)}°C`, severity: 'warning', at: nowIso };
          }

          // Store already handles sensor value updates via applyRealtime; we only augment pH history locally
          setLocalPhData(prev => {
            const existing = prev[device_id] || {};
            let phHistory = existing.phHistory || null;
            let phLabels = existing.phLabels || null;

            if (reading && reading.sensor_type === 'ph' && timeRange === 'days') {
              const value = Number(reading.value);
              if (Number.isFinite(value)) {
                if (!Array.isArray(phHistory)) phHistory = [];
                const copy = phHistory.slice(-29);
                copy.push(value);
                phHistory = copy;

                if (!Array.isArray(phLabels)) phLabels = [];
                const dateLabel = new Date(reading.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const labelsCopy = phLabels.slice(-29);
                labelsCopy.push(dateLabel);
                phLabels = labelsCopy;
              }
            }

            return {
              ...prev,
              [device_id]: { phHistory, phLabels }
            };
          });

          // latestAlerts now handled by realtime store (no local setLatestAlerts)

          console.log(`[Dashboard] Updated device ${device_id} data in real-time`);

          // Auto-advance pH window if user was viewing the latest window and a new value arrived
          if (reading && reading.sensor_type === 'ph' && timeRange === 'days') {
            setPhWindows(prev => {
              const existingWindowStart = prev[device_id];
              const phHist = localPhData[device_id]?.phHistory || [];
              const oldLength = phHist.length;
              const newLength = Math.min(oldLength + 1, 30);
              const oldMaxStart = Math.max(0, oldLength - PH_WINDOW_SIZE);
              const newMaxStart = Math.max(0, newLength - PH_WINDOW_SIZE);
              if (typeof existingWindowStart === 'number' && existingWindowStart === oldMaxStart) {
                return { ...prev, [device_id]: newMaxStart };
              }
              return prev;
            });
          }

          // Unread counts are now managed by the realtime store automatically

          // Fallback: if pH exists in backend reading meta but not updatedSensors OR huge discrepancy (>2 pH units) vs existing, trigger targeted refetch
          try {
            if (reading && reading.sensor_type === 'ph') {
              const currentPh = devicesData?.[device_id]?.sensors?.ph;
              const newPh = Number(reading.value);
              if (Number.isFinite(newPh) && Number.isFinite(currentPh)) {
                if (Math.abs(newPh - currentPh) > 2) {
                  console.warn('[Dashboard] Detected large pH discrepancy, triggering refetch');
                  fetchDeviceDataById(device_id);
                }
              } else if (Number.isFinite(newPh) && currentPh === undefined) {
                // ensure we have historical context if missing
                fetchDeviceDataById(device_id);
              }
            }
          } catch (e) {
            console.warn('Fallback pH refetch logic error:', e);
          }
        }
        return;
      }

      // Handle legacy message formats
      const { action, data } = update;

      switch (action) {
        case 'sensor_data':
          // Legacy format - fallback to API refetch
          console.log('[Dashboard] New sensor data (legacy):', data);
          if (data.device_id) {
            fetchDeviceDataById(data.device_id);
          }
          break;

        case 'reservoir_update':
          // Reservoir water level updated
          console.log('[Dashboard] Reservoir update:', data);
          if (data.device_id) {
            fetchDeviceDataById(data.device_id);
          }
          break;

        case 'bind':
        case 'unbind':
        case 'collaborator_added':
        case 'collaborator_revoked':
          // Device binding/collaborator changes - refresh full device list
          console.log('[Dashboard] Device or collaborator update:', action);
          fetchInitial();
          break;

        default:
          console.log('[Dashboard] Unknown WebSocket action:', action);
      }
    });

    return () => {
      console.log('[Dashboard] Unsubscribing from WebSocket');
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unread counts are now managed by the realtime store automatically

  // Floating Action Button (FAB) draggable state
  const fabRef = useRef(null);
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

  // Targeted fetch for a single device: refresh its sensors/reservoirs and readings only
  const fetchDeviceDataById = async (deviceId) => {
    try {
      if (!deviceId) return;
      const [sensorsResp, reservoirsResp] = await Promise.all([
        getDeviceSensors(deviceId),
        getDeviceReservoirs(deviceId)
      ]);
      const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
      const reservoirs = reservoirsResp && reservoirsResp.results ? reservoirsResp.results : reservoirsResp;
      const sensorDataMap = {};
      if (Array.isArray(sensors) && sensors.length > 0) {
        const sensorDataPromises = sensors.map(async (sensor) => {
          try {
            // Fetch comprehensive data based on time range
            let limit = 50; // default
            if (sensor.sensor_type === 'ph') {
              // Fetch more data for pH sensors based on time range
              switch (timeRange) {
                case 'weeks': limit = 200; break; // 20 weeks * ~10 readings per week
                case 'months': limit = 300; break; // 12 months * ~25 readings per month
                default: limit = 150; break; // 30 days * ~5 readings per day
              }
            }
            const resp = await getSensorData(sensor.id, limit);
            const data = resp && resp.results ? resp.results : resp;
            console.log(`[Dashboard] Fetched ${sensor.sensor_type} sensor data:`, data?.length || 0, `records (limit: ${limit})`);
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
      console.log('[Dashboard] pH sensor found:', phSensor?.id, 'with data:', sensorDataMap[phSensor?.id]?.length || 0);
      const phHistory = getPHHistory(sensorDataMap, phSensor?.id, timeRange);
      const phLabels = getPHLabels(sensorDataMap, phSensor?.id, timeRange);
      console.log('[Dashboard] Generated pH history:', phHistory?.length || 0, 'points');
      
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
      const alertText = Object.keys(transformedSensors).length ? generateAlertText(transformedSensors) : undefined;
      const nutrientText = typeof transformedSensors.tds === 'number' ? getNutrientStatus(transformedSensors.tds) : undefined;

      const dataPayload = {
        alertText,
        connectivity,
        lastSyncLabel: lastSync,
        nutrientText,
        phHistory,
        phLabels,
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
          ...(typeof transformedSensors.humidity === 'number' ? { humidity: transformedSensors.humidity } : {}),
          ...(typeof transformedSensors.light === 'number' ? { light: transformedSensors.light } : {}),
        },
        sensors_raw: sensors || [],
        reservoirs: reservoirs || []
      };

      setDevicesData(prev => ({ ...prev, [deviceId]: dataPayload }));
    } catch (_e) {
      // leave existing data untouched on failure
    }
  };

  // Handle device card click
  const handleDeviceInfoClick = (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;
    navigate(`/device/${device.id}`);
  };

  const handleDeviceMediaClick = async (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;
    // Focus this device in dashboard and refresh its data
    const idx = devices.findIndex(d => d.id === device.id);
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
    const newY = Math.max(16, Math.min(window.innerHeight - navHeight - fabSize - 16, dragStartRef.current.fabY + dy));
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
    const newY = Math.max(16, Math.min(window.innerHeight - navHeight - fabSize - 16, dragStartRef.current.fabY + dy));
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

  // Infinite scroll disabled to prevent duplicate device appearance
  const isInfinite = false;
  const infiniteDevices = useMemo(() => {
    if (devices.length === 0) return [];
    if (!isInfinite) return devices; // For normal carousel, render as-is
    // For infinite scroll, add last at start and first at end for seamless loop
    return [
      { ...devices[devices.length - 1], _cloneType: 'last' },
      ...devices.map(d => ({ ...d, _cloneType: 'original' })),
      { ...devices[0], _cloneType: 'first' }
    ];
  }, [devices, isInfinite]);  // Initialize scroll position; scroll to restored device or first device
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || devices.length === 0) return;
    const w = el.clientWidth;
    const cardW = w * 0.85;
    const gap = 16;

    if (isInfinite) {
      // Scroll to restored device + 1 (account for clone at start)
      el.scrollLeft = (cardW + gap) * (activeIdx + 1);
    } else {
      // Non-infinite: scroll directly to restored device index
      el.scrollLeft = (cardW + gap) * activeIdx;
      console.log(`Scrolled carousel to device index ${activeIdx}`);
    }
  }, [devices, activeIdx, isInfinite]);

  // Handle scroll position tracking and loop boundaries
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || devices.length === 0) return;

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
        const clamped = Math.max(0, Math.min(devices.length - 1, idx));
        console.log(`Non-infinite carousel: scroll idx=${idx}, clamped=${clamped}, devices.length=${devices.length}`);
        setActiveIdx(clamped);
        return;
      }

      // Infinite: map clone indexes to real device index
      if (idx === 0) {
        setActiveIdx(devices.length - 1); // Showing clone of last device
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
          el.scrollLeft = (cardW + gap) * devices.length;
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
  }, [infiniteDevices.length, devices.length, isInfinite]);

  const currentDevice = devices[activeIdx];
  const data = currentDevice ? devicesData[currentDevice.id] : null;

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
      console.log('[Dashboard] No pH history data available:', mergedData);
      return [];
    }
    // Show 10-day window from the 30-day dataset based on currentStart
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phHistory.length, start + PH_WINDOW_SIZE);
    const result = mergedData.phHistory.slice(start, end);
    console.log('[Dashboard] pH history display:', result);
    return result;
  }, [mergedData, currentStart]);
  const phLabelsDisplay = useMemo(() => {
    if (!mergedData || !Array.isArray(mergedData.phLabels)) return [];
    // Show corresponding labels for the windowed data
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phLabels.length, start + PH_WINDOW_SIZE);
    return mergedData.phLabels.slice(start, end);
  }, [mergedData, currentStart]);

  // Dynamic scale for pH bars based on displayed data (excluding null values)
  const phNumbers = useMemo(() =>
    phHistoryDisplay
      .filter(n => n !== null && n !== undefined)
      .map(n => Number(n))
      .filter(Number.isFinite),
    [phHistoryDisplay]
  );
  const phScale = useMemo(() => {
    if (!phNumbers.length) return { min: 6.0, max: 6.6 };
    let min = Math.min(...phNumbers);
    let max = Math.max(...phNumbers);
    if (max - min < 0.05) { // ensure some range
      min = min - 0.1;
      max = max + 0.1;
    }
    // Round to nearest 0.1
    min = Math.floor(min * 10) / 10;
    max = Math.ceil(max * 10) / 10;
    return { min, max };
  }, [phNumbers]);
  const phYTicks = useMemo(() => {
    const N = 7;
    const range = phScale.max - phScale.min || 0.6;
    const step = range / (N - 1);
    return Array.from({ length: N }, (_, i) => (phScale.max - i * step)).map(v => `${v.toFixed(1)} pH`);
  }, [phScale]);

  // Update default window when device changes or total increases and nothing saved
  useEffect(() => {
    if (!currentDevice) return;
    
    // Check if we have persisted pH data for this device
    const savedData = localPhData[currentDevice.id];
    if (savedData && savedData.timeRange === timeRange) {
      console.log(`[Dashboard] Using persisted pH data for device ${currentDevice.id}:`, savedData.phHistory?.length || 0, 'points');
    } else {
      // Fetch fresh pH data if we don't have it or time range changed
      console.log(`[Dashboard] Fetching fresh pH data for device ${currentDevice.id} (timeRange: ${timeRange})`);
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
    if (devices && devices.length > 0 && devices[activeIdx]) {
      try {
        const deviceId = devices[activeIdx].id.toString();
        const deviceName = devices[activeIdx].device_name || devices[activeIdx].plant_name || `Device ${deviceId}`;
        localStorage.setItem('dashboard.activeDeviceIndex', activeIdx.toString());
        localStorage.setItem('dashboard.activeDeviceId', deviceId);
        console.log(`💾 Saved device selection: "${deviceName}" (Index: ${activeIdx}, ID: ${deviceId})`);
      } catch (e) {
        console.warn('Failed to save active device index:', e);
      }
    }
  }, [activeIdx, devices]);

  // When devices list changes (e.g., after fetch), restore saved device or validate current index
  useEffect(() => {
    if (devices && devices.length > 0) {
      try {
        const savedIdx = parseInt(localStorage.getItem('dashboard.activeDeviceIndex') || '0', 10);
        const savedDeviceId = localStorage.getItem('dashboard.activeDeviceId');

        // First, try to find the device by ID (more reliable across refreshes)
        if (savedDeviceId) {
          const deviceIdxById = devices.findIndex(d => d.id.toString() === savedDeviceId);
          if (deviceIdxById >= 0) {
            console.log(`Restored device by ID: ${savedDeviceId} at index ${deviceIdxById}`);
            setActiveIdx(deviceIdxById);
            return;
          }
        }

        // Fallback to saved index if valid for current device list
        if (savedIdx >= 0 && savedIdx < devices.length) {
          console.log(`Restored device by index: ${savedIdx}`);
          setActiveIdx(savedIdx);
        } else {
          // If neither works, reset to first device
          console.log('No valid saved device found, defaulting to first device');
          setActiveIdx(0);
          localStorage.setItem('dashboard.activeDeviceIndex', '0');
          if (devices[0]) {
            localStorage.setItem('dashboard.activeDeviceId', devices[0].id.toString());
          }
        }
      } catch (e) {
        console.warn('Failed to restore active device index:', e);
        setActiveIdx(0);
      }
    }
  }, [devices.length]);

  // Show loading state
  if (loadingInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
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
          <Loader size={48} color={PRIMARY_GREEN} className="animate-spin" />
          <p style={{ color: '#666', fontSize: '1rem' }}>Loading your devices...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (errorInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
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
  if (devices.length === 0) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
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
        <nav className="bottom-nav" aria-label="Primary">
          <button className="nav-item active" aria-current="page">
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

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="dash-header" role="banner">
        <h1 className="dash-header-title">
          Hello, {displayName} <span className="dash-header-emoji">🌿</span>
        </h1>
        <button className="dash-header-settings" aria-label="Sync" onClick={fetchInitial}>
          <RefreshCw size={24} color={PRIMARY_GREEN} />
        </button>
      </header>

      {/* Device carousel */}
      <section className="device-carousel-wrapper" aria-label="Your devices">
        <div className="device-carousel" ref={carouselRef}>
          {infiniteDevices.map((d, i) => (
            <article
              className="device-card tap"
              key={`${d.id}-${d._cloneType || 'original'}-${i}`}
              aria-label={`${d.device_name} ${(d.is_collaborator && !d.is_owner) ? 'Shared Device' : d.device_serial}`}
            >
              <div
                className="device-card-media"
                role="button"
                tabIndex={0}
                onClick={(e) => handleDeviceMediaClick(e, d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeviceMediaClick(e, d); }}
                aria-label="Open sensor data dashboard for this device"
                aria-busy={deviceLoading[d.id] ? 'true' : 'false'}
                style={{ position: 'relative' }}
              >
                <img
                  src={d.plant_photo_url || '/favicon.png'}
                  alt={d.plant_name ? `${d.plant_name} in ${d.device_name}` : "Device"}
                />
                {deviceLoading[d.id] && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.2
                    }}
                    aria-live="polite"
                  >
                    <Loader size={18} style={{ marginBottom: 6 }} />
                    Refreshing...
                  </div>
                )}
              </div>
              <div
                className="device-card-info"
                role="button"
                tabIndex={0}
                onClick={(e) => handleDeviceInfoClick(e, d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeviceInfoClick(e, d); }}
                aria-label="Open device details"
              >
                <div>
                  <h3 className="device-name">{d.device_name}</h3>
                  <p className="device-id">
                    {d.plant_name ? `Growing: ${d.plant_name}` :
                      (d.is_collaborator && !d.is_owner) ? 'Shared Device' :
                        `Serial: ${d.device_serial}`}
                  </p>
                  {d.location ? (
                    <p className="device-location">{d.location}</p>
                  ) : null}
                </div>
                <div className="device-card-arrow">
                  <ChevronRight size={18} />
                </div>
              </div>
            </article>
          ))}
        </div>
        {devices.length > 1 && (
          <div className="carousel-dots" role="tablist" aria-label="Device position">
            {devices.map((_, i) => (
              <span key={i} className={`carousel-dot ${i === activeIdx ? 'active' : ''}`} role="tab" aria-selected={i === activeIdx} />
            ))}
          </div>
        )}
      </section>      <main className="dash-main" role="main">
        {/* Alert Summary */}
        <section className="card alert-card" aria-label="Alert summary" onClick={() => navigate(`/alerts${currentDevice ? `?deviceId=${currentDevice.id}` : ''}`)} style={{ cursor: 'pointer' }}>
          <div className="alert-card-top">
            <div className="icon-circle" style={{ position: 'relative' }}>
              <AlertCircle size={20} color={
                data?.alertText && data.alertText !== 'All systems normal' ? 
                  (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' : 
                   latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' : 
                   '#339432') : PRIMARY_GREEN
              } strokeWidth={2.5} />
              {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
                <span className="alert-notification-badge" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: data?.alertText && data.alertText !== 'All systems normal' ? 
                    (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' : 
                     latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' : 
                     '#339432') : '#e74c3c',
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
                color: data?.alertText && data.alertText !== 'All systems normal' ? 
                  (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' : 
                   latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' : 
                   '#339432') : '#e74c3c', 
                fontWeight: 'bold', 
                marginLeft: '8px' 
              }}>
                ({perDeviceUnreadCounts[currentDevice?.id]} new)
              </span>
            )}
          </h3>
          <div className="alert-card-message" style={{
            color: data?.alertText && data.alertText !== 'All systems normal' ? 
              (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' : 
               latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' : 
               '#339432') : 'rgba(17, 17, 17, 0.86)'
          }}>{data?.alertText || 'All systems normal'}</div>
          {latestAlerts[currentDevice?.id] && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#555' }} aria-live="polite">
              <strong style={{ 
                color: latestAlerts[currentDevice.id].severity === 'critical' ? '#e74c3c' : 
                       latestAlerts[currentDevice.id].severity === 'warning' ? '#f59e0b' : 
                       '#339432'
              }}>{latestAlerts[currentDevice.id].title}:</strong> {latestAlerts[currentDevice.id].body}
            </div>
          )}
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
              <span className={`status-value ${data?.connectivity === 'Online' ? 'status-online' : 'status-offline'}`}>
                {data ? (data.connectivity || 'Offline') : 'Loading...'}
              </span>
            </div>
          </div>
          <div className="status-box">
            <div className="icon-circle">
              <RefreshCw size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Last Data Sync</span>
              <span className="status-value">{data ? (data.lastSyncLabel || 'Never') : 'Loading...'}</span>
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
            <span className="nutrient-text">{data ? (data.nutrientText || 'Loading...') : 'Loading...'}</span>
          </div>
        </section>

        {/* pH levels over time */}
        <section className="card ph-card" aria-label="pH levels over time">
          <div className="ph-card-header">
            <div className="icon-circle">
              <Activity size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="ph-card-title">pH Levels over time</span>
            <select
              className="range-switch"
              aria-label="Select time range"
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              style={{
                fontSize: '12px',
                background: 'rgba(139,167,151,0.1)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                color: 'var(--color-secondary)',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div className="ph-legend" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ph-legend-dot"></span>
            <span className="ph-legend-label">{legendLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              {/* Debug info - remove in production */}
              <span style={{ fontSize: '10px', color: '#999', marginRight: '8px' }}>
                {phTotal > 0 && `${currentStart + 1}-${Math.min(currentStart + PH_WINDOW_SIZE, phTotal)} of ${phTotal}`}
              </span>
              <button
                className="ph-nav-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Previous button clicked, canPrev:', canPrev, 'currentStart:', currentStart, 'phTotal:', phTotal);
                  onPrev();
                }}
                disabled={!canPrev}
                style={{
                  background: canPrev ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
                  border: canPrev ? '1px solid rgba(51, 148, 50, 0.3)' : '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: canPrev ? 'pointer' : 'not-allowed',
                  opacity: canPrev ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  minWidth: '32px',
                  height: '32px',
                  justifyContent: 'center'
                }}
                aria-label="Previous period"
              >
                <ChevronLeft size={16} color={canPrev ? 'rgba(51, 148, 50, 0.8)' : '#999'} />
              </button>
              <span style={{ fontSize: 12, color: '#666', fontWeight: '500', minWidth: '100px', textAlign: 'center' }}>
                {phLabelsDisplay && phLabelsDisplay.length >= 2
                  ? `${phLabelsDisplay[0]} - ${phLabelsDisplay[phLabelsDisplay.length - 1]}`
                  : phTotal === 0
                    ? 'No data available'
                    : timeRange === 'days' ? `Last ${PH_WINDOW_SIZE} Days`
                      : timeRange === 'weeks' ? `Last ${PH_WINDOW_SIZE} Weeks`
                        : `Last ${PH_WINDOW_SIZE} Months`
                }
              </span>
              <button
                className="ph-nav-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked, canNext:', canNext, 'currentStart:', currentStart, 'maxStart:', maxStart, 'phTotal:', phTotal);
                  onNext();
                }}
                disabled={!canNext}
                style={{
                  background: canNext ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
                  border: canNext ? '1px solid rgba(51, 148, 50, 0.3)' : '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  opacity: canNext ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  minWidth: '32px',
                  height: '32px',
                  justifyContent: 'center'
                }}
                aria-label="Next period"
              >
                <ChevronRight size={16} color={canNext ? 'rgba(51, 148, 50, 0.8)' : '#999'} />
              </button>
              {currentStart < maxStart && phTotal > PH_WINDOW_SIZE && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Today button clicked, jumping to maxStart:', maxStart);
                    currentDevice && setPhWindows(prev => ({ ...prev, [currentDevice.id]: maxStart }));
                  }}
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: '6px',
                    transition: 'all 0.2s ease',
                    height: '32px',
                    minWidth: '50px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(51, 148, 50, 1)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--color-primary)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  aria-label="Jump to latest data"
                >
                  Latest
                </button>
              )}
            </div>
          </div>
          <div className="ph-chart-container">
            <div className="ph-y-axis">
              {phYTicks.map((label, i) => (
                <span key={i} className="ph-y-label">{label}</span>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="ph-chart-area" style={{ position: 'relative', marginBottom: '8px' }}>
                {/* Horizontal Grid Lines */}
                <div className="ph-grid-horizontal" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  {phYTicks.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        borderTop: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.15)',
                        height: i === 0 ? '1px' : 'auto',
                        flex: 1
                      }}
                    />
                  ))}
                </div>

                {/* Vertical Grid Lines */}
                <div className="ph-grid-vertical" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  {phHistoryDisplay && phHistoryDisplay.length > 0
                    ? phHistoryDisplay.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.1)',
                          width: i === 0 ? '1px' : 'auto',
                          flex: 1,
                          height: '100%'
                        }}
                      />
                    ))
                    : Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.1)',
                          width: i === 0 ? '1px' : 'auto',
                          flex: 1,
                          height: '100%'
                        }}
                      />
                    ))
                  }
                </div>

                {/* pH Bars */}
                <div className="ph-bars" role="img" aria-label="pH chart" style={{
                  position: 'relative',
                  zIndex: 2,
                  height: '220px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  justifyContent: 'space-between',
                  padding: '8px 0'
                }}>
                  {phHistoryDisplay && phHistoryDisplay.length > 0
                    ? phHistoryDisplay.map((v, i) => <PHBar key={i} v={v} i={i} min={phScale.min} max={phScale.max} plant={currentDevice?.plant} />)
                    : <div style={{ color: '#999', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 3 }}>
                        {mergedData && mergedData.phHistory && mergedData.phHistory.length === 0 ? 'No pH data available' : 'Loading pH data...'}
                      </div>}
                </div>
              </div>
              <div className="ph-x-axis" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0', gap: '2px' }}>
                {phLabelsDisplay && phLabelsDisplay.length > 0
                  ? phLabelsDisplay.map((label, i) => (
                    <span key={i} className="ph-x-label" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>{label}</span>
                  ))
                  : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((_, i) => (
                    <span key={i} className="ph-x-label" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>--</span>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Current pH level (real-time latest reading, independent of history) */}
        <section className="card current-ph-card" aria-label="Current pH">
          {(() => {
            const latestPh = data?.sensors?.ph; // real-time field updated by WebSocket
            const hasPh = typeof latestPh === 'number' && Number.isFinite(latestPh);
            const phVal = hasPh ? latestPh : null;
            
            // Enhanced status determination with plant-specific ranges
            const getPHStatus = (phValue) => {
              if (!hasPh) return { status: 'Loading...', severity: 'none', color: '#8BA797' };
              
              // Use plant-specific ranges if available
              if (currentDevice?.plant?.ph_min !== undefined && currentDevice?.plant?.ph_max !== undefined) {
                const phMin = Number(currentDevice.plant.ph_min);
                const phMax = Number(currentDevice.plant.ph_max);
                
                if (phValue < phMin) return { status: 'Critical Low', severity: 'critical', color: '#e74c3c' };
                if (phValue > phMax) return { status: 'Critical High', severity: 'critical', color: '#e74c3c' };
                
                // Warning zones (10% buffer from min/max)
                const buffer = (phMax - phMin) * 0.1;
                if (phValue <= phMin + buffer) return { status: 'Low Warning', severity: 'warning', color: '#f59e0b' };
                if (phValue >= phMax - buffer) return { status: 'High Warning', severity: 'warning', color: '#f59e0b' };
                
                return { status: 'Optimal', severity: 'optimal', color: '#339432' };
              }
              
              // Fallback to general pH ranges
              if (phValue < 5.5) return { status: 'Too Low', severity: 'critical', color: '#e74c3c' };
              if (phValue > 6.5) return { status: 'Too High', severity: 'critical', color: '#e74c3c' };
              if (phValue >= 5.0 && phValue < 5.5) return { status: 'Low Warning', severity: 'warning', color: '#f59e0b' };
              if (phValue > 6.5 && phValue <= 7.0) return { status: 'High Warning', severity: 'warning', color: '#f59e0b' };
              return { status: 'Optimal', severity: 'optimal', color: '#339432' };
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
                      <div className="optimal-range"></div>
                      <div
                        className="current-marker"
                        style={{
                          left: hasPh
                            ? `${Math.max(0, Math.min(100, ((phVal - 5.5) / (8.5 - 5.5)) * 100))}%`
                            : '50%',
                          backgroundColor: phStatus.color
                        }}
                      ></div>
                    </div>
                    <div className="range-labels">
                      <span>{(() => {
                        if (!hasPh) return '--';
                        if (phVal < 5.5) return phVal.toFixed(1);
                        return '5.5';
                      })()}</span>
                      <span style={{ fontWeight: '600', color: phStatus.color }}>
                        {currentDevice?.plant?.ph_min !== undefined && currentDevice?.plant?.ph_max !== undefined 
                          ? `${currentDevice.plant.ph_min}-${currentDevice.plant.ph_max}`
                          : '5.5-6.5'
                        }
                      </span>
                      <span>{(() => {
                        if (!hasPh) return '--';
                        if (phVal > 6.5) return phVal.toFixed(1);
                        return '8.5';
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
          <div className="sensor-cell">
            <div className="icon-circle">
              <Zap size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">EC Levels</span>
              <span className="sensor-value">{data && typeof data.sensors?.ec === 'number' ? `${data.sensors.ec.toFixed(1)} mS/cm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Waves size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">TDS</span>
              <span className="sensor-value">{data && typeof data.sensors?.tds === 'number' ? `${Math.round(data.sensors.tds)} ppm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplet size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Level</span>
              <span className="sensor-value">{data && typeof data.sensors?.waterLevel === 'number' ? `${Math.round(data.sensors.waterLevel)}%` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplets size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Turbidity</span>
              <span className="sensor-value">{data && typeof data.sensors?.turbidity === 'number' ? `${data.sensors.turbidity.toFixed(1)} NTU` : 'Loading...'}</span>
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="card environment-card" aria-label="Environment conditions">
          <h3 className="environment-title">Environment Conditions</h3>
          <div className="environment-list">
            <div className="environment-row">
              <div className="icon-circle">
                <Thermometer size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Temperature</span>
              <span className="environment-value">{data && typeof data.environment?.temperature === 'number' ? `${data.environment.temperature.toFixed(1)}°C` : 'Loading...'}</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Wind size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Humidity</span>
              <span className="environment-value">{data && typeof data.environment?.humidity === 'number' ? `${Math.round(data.environment.humidity)}%` : 'Loading...'}</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Sun size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Light Intensity</span>
              <span className="environment-value">{data && typeof data.environment?.light === 'number' ? `${Math.round(data.environment.light).toLocaleString()} Lux` : 'Loading...'}</span>
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
        <button className="nav-item" onClick={() => navigate('/alerts')} style={{ position: 'relative' }}>
          <AlertCircle size={20} />
          {unreadAlertsCount > 0 && (
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
              {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
            </span>
          )}
          <span>Alerts</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

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
    </div>
  );
}

