import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { authApi } from '../services/apiClient.js';

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
const getPHHistory = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) {
    return null;
  }

  const phData = sensorDataMap[phSensorId] || [];
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

  // Fill in actual data where it exists
  phData.forEach(d => {
    if (d && d.created_at) {
      try {
        const dataDate = new Date(d.created_at);
        const dateKey = getDateKey(dataDate);

        if (dateMap.hasOwnProperty(dateKey)) {
          const value = Number(d.value);
          if (Number.isFinite(value)) {
            // Average multiple readings in the same period
            if (dateMap[dateKey] === null) {
              dateMap[dateKey] = value;
            } else {
              dateMap[dateKey] = (dateMap[dateKey] + value) / 2;
            }
          }
        }
      } catch (e) {
        // Invalid date, skip
      }
    }
  });

  return Object.values(dateMap);
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

// Helper function to generate alert text based on sensor values
const generateAlertText = (sensors) => {
  const alerts = [];

  if (sensors.tds < 300) {
    alerts.push('TDS too low (Inadequate nutrients)');
  }
  if (sensors.ph > 6.5) {
    alerts.push('pH trending high - check solution');
  }
  if (sensors.waterLevel < 20) {
    alerts.push('Water level below threshold');
  }
  if (sensors.temperature < 18 || sensors.temperature > 28) {
    alerts.push('Temperature outside optimal range');
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

function PHBar({ v, i, min, max }) {
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
          background: isValid && vv >= 5.5 && vv <= 6.5
            ? 'var(--color-primary)'
            : vv < 5.5
              ? '#f59e0b'
              : '#ef4444',
          borderRadius: '2px 2px 0 0',
          transformOrigin: 'bottom',
          animation: `growBar 0.8s ease forwards`,
          animationDelay: `${Math.min(i * 50, 500)}ms`,
          opacity: 0
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
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
  const [devices, setDevices] = useState([]);
  const [devicesData, setDevicesData] = useState({});
  // Latest reading for the first device's first sensor (useful for small widgets)
  const [firstSensorReading, setFirstSensorReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState('User');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [perDeviceUnreadCounts, setPerDeviceUnreadCounts] = useState({});

  // Shared helper to compute a stable reading key (match AlertsPage logic)
  const readingKeyOf = (reading) => {
    return (reading && (reading.id || reading.created_at || reading.timestamp)) || JSON.stringify(reading || {});
  };

  // Fetch user devices and their data
  const fetchDevicesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch current user profile for greeting (best-effort; non-blocking)
      try {
        const profile = await authApi.getProfile(token);
        const name =
          (profile && (profile.full_name?.trim() || profile.first_name?.trim() || profile.username?.trim())) ||
          (profile && profile.email ? (profile.email.split('@')[0] || 'User') : 'User');
        setDisplayName(name);
      } catch (_) {
        // ignore profile errors; keep default
      }

      // Fetch user's devices
      const devicesResponse = await getUserDevices();
      const userDevices = devicesResponse.results || devicesResponse;

      // Debug: Log device data to see what's returned
      console.log('Dashboard - Devices response:', devicesResponse);
      console.log('Dashboard - User devices:', userDevices);
      if (userDevices && userDevices.length > 0) {
        console.log('Dashboard - First device plant data:', {
          plant_photo: userDevices[0].plant_photo,
          plant_photo_url: userDevices[0].plant_photo_url,
          plant_name: userDevices[0].plant_name,
          plant_variety: userDevices[0].plant_variety,
          plant_status: userDevices[0].plant_status
        });
      }

      if (!userDevices || userDevices.length === 0) {
        setDevices([]);
        setDevicesData({});
        setLoading(false);
        return;
      }

      // Fetch the first device's first sensor latest reading (small, best-effort fetch)
      try {
        const firstDevice = userDevices[0];
        if (firstDevice && firstDevice.id) {
          const sensorsResp = await getDeviceSensors(firstDevice.id);
          const sensorsList = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
          if (Array.isArray(sensorsList) && sensorsList.length > 0) {
            const firstSensor = sensorsList[0];
            try {
              const firstSensorDataResp = await getSensorData(firstSensor.id, 1);
              const firstData = firstSensorDataResp && firstSensorDataResp.results
                ? firstSensorDataResp.results[0]
                : (Array.isArray(firstSensorDataResp) ? firstSensorDataResp[0] : null);
              setFirstSensorReading(firstData || null);
              // Small debug log so devs can see the value in console
              console.log('Dashboard - first device first sensor reading:', firstData);
            } catch (err) {
              console.warn('Failed to load first sensor data:', err);
            }
          }
        }
      } catch (err) {
        // Non-fatal; continue with full device fetch below
        console.warn('Failed to load first device sensors (best-effort):', err);
      }

      setDevices(userDevices);      // Fetch sensors and sensor data for each device
      const deviceDataPromises = userDevices.map(async (device) => {
        try {
          const [sensorsResponse, reservoirsResponse] = await Promise.all([
            getDeviceSensors(device.id),
            getDeviceReservoirs(device.id)
          ]);

          const sensors = sensorsResponse.results || sensorsResponse;
          const reservoirs = reservoirsResponse.results || reservoirsResponse;

          // Fetch recent sensor data for all sensors
          const sensorDataMap = {};
          if (sensors && sensors.length > 0) {
            const sensorDataPromises = sensors.map(async (sensor) => {
              try {
                const dataResponse = await getSensorData(sensor.id, 60); // Get last 60 readings
                return { sensorId: sensor.id, data: dataResponse.results || dataResponse };
              } catch (error) {
                console.warn(`Failed to fetch data for sensor ${sensor.id}:`, error);
                return { sensorId: sensor.id, data: [] };
              }
            });

            const sensorDataResults = await Promise.all(sensorDataPromises);
            sensorDataResults.forEach(({ sensorId, data }) => {
              sensorDataMap[sensorId] = data;
            });
          }

          // Transform the data to match expected structure
          const transformedSensors = transformSensorData(sensors || [], sensorDataMap);

          // Find pH sensor for history
          const phSensor = sensors?.find(s => s.sensor_type === 'ph');
          const phHistory = getPHHistory(sensorDataMap, phSensor?.id, timeRange);
          const phLabels = getPHLabels(sensorDataMap, phSensor?.id, timeRange);

          // Get latest sensor update time across all sensors. Arrays may not be ordered,
          // so scan each array for the max created_at value.
          let lastSensorUpdate = null;
          Object.values(sensorDataMap).forEach(sensorData => {
            if (sensorData.length > 0) {
              sensorData.forEach(d => {
                if (!d || !d.created_at) return;
                try {
                  const t = new Date(d.created_at);
                  if (!lastSensorUpdate || t > lastSensorUpdate) {
                    lastSensorUpdate = t;
                  }
                } catch (e) {
                  // ignore parse errors
                }
              });
            }
          });

          const { connectivity, lastSync } = getConnectivityStatus(lastSensorUpdate);
          const alertText = Object.keys(transformedSensors).length ? generateAlertText(transformedSensors) : undefined;
          const nutrientText = typeof transformedSensors.tds === 'number' ? getNutrientStatus(transformedSensors.tds) : undefined;

          return {
            deviceId: device.id,
            data: {
              alertText,
              connectivity,
              lastSyncLabel: lastSync,
              nutrientText,
              phHistory,
              phLabels,
              sensors: {
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
            }
          };
        } catch (error) {
          console.warn(`Failed to fetch data for device ${device.id}:`, error);
          // Return default data structure for failed device
          return {
            deviceId: device.id,
            data: {
              // Minimal fallback; omit mock values so UI shows Loading...
              connectivity: 'Offline',
              lastSyncLabel: 'Never',
              sensors_raw: [],
              reservoirs: []
            }
          };
        }
      });

      const deviceDataResults = await Promise.all(deviceDataPromises);
      const deviceDataMap = {};
      deviceDataResults.forEach(({ deviceId, data }) => {
        deviceDataMap[deviceId] = data;
      });

      setDevicesData(deviceDataMap);
    } catch (error) {
      console.error('Failed to fetch devices data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to count unread alerts from sensor data
  const countUnreadAlerts = async () => {
    try {
      const devicesResponse = await getUserDevices();
      const userDevices = devicesResponse.results || devicesResponse;
      if (!userDevices || userDevices.length === 0) return { total: 0, perDevice: {} };

      let unreadCount = 0;
      const perDevice = {};

      // Check each device for out-of-range sensor readings
      await Promise.all(userDevices.map(async (device) => {
        try {
          if (!device || !device.id) return;
          const sensorsResponse = await getDeviceSensors(device.id);
          const sensors = sensorsResponse && sensorsResponse.results ? sensorsResponse.results : sensorsResponse;
          if (!sensors || sensors.length === 0) return;

          // Check pH, TDS, water_level, air_temperature sensors for alerts
          const phSensors = sensors.filter(s => s.sensor_type === 'ph');
          const tdsSensors = sensors.filter(s => s.sensor_type === 'tds');
          const waterLevelSensors = sensors.filter(s => s.sensor_type === 'water_level');
          const tempSensors = sensors.filter(s => s.sensor_type === 'air_temperature');

          const allSensorsToCheck = [...phSensors, ...tdsSensors, ...waterLevelSensors, ...tempSensors];

          await Promise.all(allSensorsToCheck.map(async (sensor) => {
            try {
              const sensorDataResponse = await getSensorData(sensor.id);
              const sensorReadings = sensorDataResponse.results || sensorDataResponse;
              if (!sensorReadings || sensorReadings.length === 0) return;

              // Check recent readings (last 24 hours worth)
              const recentReadings = sensorReadings.filter(reading => {
                if (!reading.created_at) return false;
                const readingTime = new Date(reading.created_at);
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return readingTime > oneDayAgo;
              });

              recentReadings.forEach(reading => {
                const readingKey = readingKeyOf(reading);
                if (isAlertRead(readingKey)) return; // Skip if already read

                const value = reading.value;
                let hasAlert = false;

                // Check for alert conditions based on sensor type
                if (sensor.sensor_type === 'ph') {
                  if (value < 5.5 || value > 6.5) hasAlert = true;
                } else if (sensor.sensor_type === 'tds') {
                  if (value < 800 || value > 1500) hasAlert = true;
                } else if (sensor.sensor_type === 'water_level') {
                  if (value < 20) hasAlert = true;
                } else if (sensor.sensor_type === 'air_temperature') {
                  if (value < 18 || value > 28) hasAlert = true;
                }

                if (hasAlert) {
                  unreadCount++;
                  perDevice[device.id] = (perDevice[device.id] || 0) + 1;
                }
              });
            } catch (err) {
              console.warn('Error checking sensor data for alerts:', err);
            }
          }));
        } catch (err) {
          console.warn('Error checking device for alerts:', err);
        }
      }));

      return { total: unreadCount, perDevice };
    } catch (err) {
      console.warn('Error counting unread alerts:', err);
      return { total: 0, perDevice: {} };
    }
  };

  // Fetch data on component mount and when time range changes
  useEffect(() => {
    fetchDevicesData();
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count unread alerts when devices data is loaded
  useEffect(() => {
    if (!loading && devices.length > 0) {
      const fetchAlertCount = async () => {
        const result = await countUnreadAlerts();
        setUnreadAlertsCount(result.total);
        setPerDeviceUnreadCounts(result.perDevice || {});
      };
      fetchAlertCount();
    }
  }, [loading, devices]);

  // Refresh alert count when returning to dashboard (window focus)
  useEffect(() => {
    const handleWindowFocus = async () => {
      if (!loading && devices.length > 0) {
        const result = await countUnreadAlerts();
        setUnreadAlertsCount(result.total);
        setPerDeviceUnreadCounts(result.perDevice || {});
      }
    };
    const handleAlertsReadUpdated = async () => {
      // Recompute when AlertsPage marks items as read
      if (!loading && devices.length > 0) {
        const result = await countUnreadAlerts();
        setUnreadAlertsCount(result.total);
        setPerDeviceUnreadCounts(result.perDevice || {});
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('alerts-read-updated', handleAlertsReadUpdated);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('alerts-read-updated', handleAlertsReadUpdated);
    };
  }, [loading, devices]);

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
            const resp = await getSensorData(sensor.id);
            const data = resp && resp.results ? resp.results : resp;
            return { sensorId: sensor.id, data: Array.isArray(data) ? data : (data ? [data] : []) };
          } catch (_e) {
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
  const phTotal = data && Array.isArray(data.phHistory) ? data.phHistory.length : 0;
  const maxStart = Math.max(0, phTotal - PH_WINDOW_SIZE);
  const currentStart = useMemo(() => {
    if (!currentDevice) return 0;
    const saved = phWindows[currentDevice.id];
    // Default to last window; clamp if total changed
    const base = typeof saved === 'number' ? saved : maxStart;
    return Math.min(Math.max(0, base), maxStart);
  }, [currentDevice, phWindows, maxStart]);
  const phHistoryDisplay = useMemo(() => {
    if (!data || !Array.isArray(data.phHistory)) return [];
    // Show 10-day window from the 30-day dataset based on currentStart
    const start = Math.max(0, currentStart);
    const end = Math.min(data.phHistory.length, start + PH_WINDOW_SIZE);
    return data.phHistory.slice(start, end);
  }, [data, currentStart]);
  const phLabelsDisplay = useMemo(() => {
    if (!data || !Array.isArray(data.phLabels)) return [];
    // Show corresponding labels for the windowed data
    const start = Math.max(0, currentStart);
    const end = Math.min(data.phLabels.length, start + PH_WINDOW_SIZE);
    return data.phLabels.slice(start, end);
  }, [data, currentStart]);

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
    if (!currentDevice || phTotal === 0) return;
    setPhWindows(prev => {
      if (typeof prev[currentDevice.id] === 'number') return prev; // keep user's position
      return { ...prev, [currentDevice.id]: maxStart };
    });
  }, [currentDevice, phTotal, maxStart]);

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
    if (!data?.phHistory) return '6.3';
    // Find the most recent non-null pH value
    const lastValue = [...data.phHistory].reverse().find(value => value !== null && value !== undefined);
    return lastValue ? Number(lastValue).toFixed(1) : '6.3';
  }, [activeIdx, data]);

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
  }, [devices.length]);  // Show loading state
  if (loading) {
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
  if (error) {
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
          <p style={{ color: '#e74c3c', fontSize: '1rem' }}>{error}</p>
          <button
            onClick={fetchDevicesData}
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
        <button className="dash-header-settings" aria-label="Sync" onClick={fetchDevicesData}>
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
              <AlertCircle size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
                <span className="alert-notification-badge" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
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
              <span style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: '8px' }}>
                ({perDeviceUnreadCounts[currentDevice?.id]} new)
              </span>
            )}
          </h3>
          <div className="alert-card-message">{(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 ? (data?.alertText || 'Loading...') : 'All systems normal'}</div>
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
                    ? phHistoryDisplay.map((v, i) => <PHBar key={i} v={v} i={i} min={phScale.min} max={phScale.max} />)
                    : <div style={{ color: '#999', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 3 }}>Loading...</div>}
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

        {/* Current pH level */}
        <section className="card current-ph-card" aria-label="Current pH">
          <div className="ph-value-container">
            <div className="ph-value-main">
              <span className="ph-number">{data && data.phHistory && data.phHistory.length > 0 ? currentPH : '--'}</span>
              <span className="ph-unit">pH</span>
            </div>
            <div className="ph-status-indicator">
              <div className={`ph-status-dot ${data && data.phHistory && data.phHistory.length > 0 && currentPH >= 5.5 && currentPH <= 6.5 ? 'optimal' : 'warning'}`}></div>
              <span className="ph-status-text">
                {data && data.phHistory && data.phHistory.length > 0
                  ? (currentPH >= 5.5 && currentPH <= 6.5 ? 'Optimal' : currentPH < 5.5 ? 'Too Low' : 'Too High')
                  : 'Loading...'
                }
              </span>
            </div>
          </div>
          <div className="ph-info-section">
            <div className="ph-label-row">
              <Activity size={16} color={PRIMARY_GREEN} strokeWidth={2.5} />
              <span className="ph-label">Current Level</span>
            </div>
            <div className="ph-range-indicator">
              <div className="range-bar">
                <div className="optimal-range"></div>
                <div
                  className="current-marker"
                  style={{
                    left: data && data.phHistory && data.phHistory.length > 0
                      ? `${Math.max(0, Math.min(100, ((currentPH - 5.5) / (8.5 - 5.5)) * 100))}%`
                      : '50%'
                  }}
                ></div>
              </div>
              <div className="range-labels">
                <span>{(() => {
                  const hasData = data && data.phHistory && data.phHistory.length > 0;
                  const ph = Number(currentPH);
                  if (!hasData || Number.isNaN(ph)) return '--';
                  if (ph < 5.5) return ph.toFixed(1);
                  // otherwise show the lowest monitored pH (dynamic scale min)
                  return (typeof phScale?.min === 'number' && Number.isFinite(phScale.min)) ? phScale.min.toFixed(1) : '5.5';
                })()}</span>
                <span style={{ fontWeight: '600', color: PRIMARY_GREEN }}>5.5-6.5</span>
                <span>{(() => {
                  const hasData = data && data.phHistory && data.phHistory.length > 0;
                  const ph = Number(currentPH);
                  if (!hasData || Number.isNaN(ph)) return '--';
                  if (ph > 6.5) return ph.toFixed(1);
                  return '8.5';
                })()}</span>
              </div>
            </div>
          </div>
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

