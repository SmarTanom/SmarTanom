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

// Helper function to get pH history from sensor data
// Return pH history array ordered from oldest -> newest and padded/trimmed to 60 values.
const getPHHistory = (sensorDataMap, phSensorId) => {
  if (!phSensorId || !sensorDataMap[phSensorId]) {
    return null; // No mock data; absence indicates loading/empty
  }

  const phData = sensorDataMap[phSensorId] || [];
  // Defensive: sort by created_at ascending (oldest first)
  const sorted = phData
    .slice()
    .sort((a, b) => {
      const ta = a && a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b && b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    })
    .map(d => (typeof d.value !== 'undefined' ? d.value : 6.3));

  // Now ensure length is 60: if more than 60, take the last 60 (most recent 60)
  if (sorted.length >= 60) {
    return sorted.slice(sorted.length - 60);
  }

  // If fewer than 60 and you want fixed-width charts, you could pad; here we avoid mock padding.
  return sorted;
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
  if (sensors.ph > 7.0) {
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
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollTimeoutRef = useRef(null);
  const isAdjustingRef = useRef(false);

  // State for real data
  const [devices, setDevices] = useState([]);
  const [devicesData, setDevicesData] = useState({});
  // Latest reading for the first device's first sensor (useful for small widgets)
  const [firstSensorReading, setFirstSensorReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState('User');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

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

      setDevices(userDevices);

      // Fetch sensors and sensor data for each device
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
          const phHistory = getPHHistory(sensorDataMap, phSensor?.id);

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
      if (!userDevices || userDevices.length === 0) return 0;

      let unreadCount = 0;

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
                const readingKey = reading.id || reading.created_at || JSON.stringify(reading);
                if (isAlertRead(readingKey)) return; // Skip if already read

                const value = reading.value;
                let hasAlert = false;

                // Check for alert conditions based on sensor type
                if (sensor.sensor_type === 'ph') {
                  if (value < 6.0 || value > 7.0) hasAlert = true;
                } else if (sensor.sensor_type === 'tds') {
                  if (value < 800 || value > 1500) hasAlert = true;
                } else if (sensor.sensor_type === 'water_level') {
                  if (value < 20) hasAlert = true;
                } else if (sensor.sensor_type === 'air_temperature') {
                  if (value < 18 || value > 28) hasAlert = true;
                }

                if (hasAlert) {
                  unreadCount++;
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

      return unreadCount;
    } catch (err) {
      console.warn('Error counting unread alerts:', err);
      return 0;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDevicesData();
  }, []);

  // Count unread alerts when devices data is loaded
  useEffect(() => {
    if (!loading && devices.length > 0) {
      const fetchAlertCount = async () => {
        const count = await countUnreadAlerts();
        setUnreadAlertsCount(count);
      };
      fetchAlertCount();
    }
  }, [loading, devices]);

  // Refresh alert count when returning to dashboard (window focus)
  useEffect(() => {
    const handleWindowFocus = async () => {
      if (!loading && devices.length > 0) {
        const count = await countUnreadAlerts();
        setUnreadAlertsCount(count);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
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
      const phHistory = getPHHistory(sensorDataMap, phSensor?.id);
      let lastSensorUpdate = null;
      Object.values(sensorDataMap).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(d => {
            if (!d || !d.created_at) return;
            try {
              const t = new Date(d.created_at);
              if (!lastSensorUpdate || t > lastSensorUpdate) lastSensorUpdate = t;
            } catch (_e) {}
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

  const handleDeviceMediaClick = (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;
    // Focus this device in dashboard and refresh its data
    const idx = devices.findIndex(d => d.id === device.id);
    if (idx >= 0) setActiveIdx(idx);
    fetchDeviceDataById(device.id);
    // Optionally: scroll to metrics area (dash-main)
    const main = document.querySelector('.dash-main');
    if (main && typeof main.scrollIntoView === 'function') {
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle FAB click (if not dragged)
  const handleFabClick = () => {
    if (!hasDraggedRef.current) {
      navigate('/signup-setup');
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

  // Create infinite carousel by duplicating devices at boundaries
  const infiniteDevices = useMemo(() => {
    if (devices.length === 0) return [];
    if (devices.length === 1) return devices; // No need for infinite scroll with single device
    // Add last device at start and first device at end for seamless loop
    return [devices[devices.length - 1], ...devices, devices[0]];
  }, [devices]);

  // Initialize scroll position to first real device (index 1 in infinite array)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || devices.length === 0) return;
    const w = el.clientWidth;
    const cardW = w * 0.85;
    const gap = 16;

    if (devices.length > 1) {
      // Scroll to index 1 (first real device) on mount for infinite scroll
      el.scrollLeft = (cardW + gap) * 1;
    } else {
      // Single device, no scroll needed
      el.scrollLeft = 0;
    }
  }, [devices]);

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

      // Handle single device case
      if (devices.length === 1) {
        setActiveIdx(0);
        return;
      }

      // Update active index (map to real device index)
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
  }, [infiniteDevices.length, devices.length]);

  const currentDevice = devices[activeIdx];
  const data = currentDevice ? devicesData[currentDevice.id] : null;
  // Robust label for pH legend: prefer device_name, then plant_name, then serial
  const legendLabel = useMemo(() => {
    if (!currentDevice) return 'Device';
    const name = (currentDevice.device_name || '').trim();
    const plant = (currentDevice.plant_name || '').trim();
    return name || plant || currentDevice.device_serial || 'Device';
  }, [currentDevice]);
  const currentPH = useMemo(() => {
    if (!data?.phHistory) return '6.3';
    return data.phHistory[data.phHistory.length - 1].toFixed(1);
  }, [activeIdx, data]);

  // When devices list changes (e.g., after fetch), reset to the first device
  useEffect(() => {
    if (devices && devices.length > 0) {
      setActiveIdx(0);
    }
  }, [devices.length]);

  // Show loading state
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
            onClick={() => navigate('/signup-setup')}
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
              key={`${d.id}-${i}`}
              aria-label={`${d.device_name} ${d.device_serial}`}
            >
              <div
                className="device-card-media"
                role="button"
                tabIndex={0}
                onClick={(e) => handleDeviceMediaClick(e, d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeviceMediaClick(e, d); }}
                aria-label="Open sensor data dashboard for this device"
              >
                <img
                  src={d.plant_photo_url || '/favicon.png'}
                  alt={d.plant_name ? `${d.plant_name} in ${d.device_name}` : "Device"}
                />
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
                    {d.plant_name ? `Growing: ${d.plant_name}` : `Serial: ${d.device_serial}`}
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
        <section className="card alert-card" aria-label="Alert summary" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="alert-card-top">
            <div className="icon-circle" style={{ position: 'relative' }}>
              <AlertCircle size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              {unreadAlertsCount > 0 && (
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
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </div>
            <button className="alert-card-expand" aria-label="Open alerts" onClick={(e) => { e.stopPropagation(); navigate('/alerts'); }}>
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
          <h3 className="alert-card-title">
            Alert Summary
            {unreadAlertsCount > 0 && (
              <span style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: '8px' }}>
                ({unreadAlertsCount} new)
              </span>
            )}
          </h3>
          <div className="alert-card-message">{data?.alertText || 'Loading...'}</div>
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
            <button className="range-switch" aria-label="Change range">Days ▾</button>
          </div>
          <div className="ph-legend">
            <span className="ph-legend-dot"></span>
            <span className="ph-legend-label">{legendLabel}</span>
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
              {data && Array.isArray(data.phHistory) && data.phHistory.length > 0
                ? data.phHistory.map((v, i) => <PHBar key={i} v={v} i={i} />)
                : <div style={{ color: '#999', fontSize: 12 }}>Loading...</div>}
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
              <Activity size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="current-ph-label">Current pH level</span>
          </div>
          <span className="current-ph-value">{data && data.phHistory && data.phHistory.length > 0 ? `${currentPH} pH` : 'Loading...'}</span>
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

