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

import { getDeviceById, uploadPlantPhoto } from '../services/api/devices.js';
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
function classifyLight(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.light_min, plant.light_max);
}
function classifyEnvTemp(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.environment_temp_min, plant.environment_temp_max);
}
function classifyHumidity(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.humidity_min, plant.humidity_max);
}

const PLANT_RECOMMENDATION_TEMPLATES = {
  Lettuce: {
    general: 'Keep roots cool and solution well oxygenated.',
    ph: {
      below_min: 'Raise slowly to avoid nutrient lockout; aim 5.8–6.2.',
      above_max: 'Slightly high pH can reduce iron uptake; adjust 0.2 at a time.',
      near_min: 'Trend downward? Buffer with small pH Up dose.',
      near_max: 'Monitor — drifting high may cause tip burn risk.'
    },
    tds: {
      below_min: 'Increase EC gradually (no more than +100 ppm per adjustment).',
      above_max: 'Dilute to avoid bitterness; target mid‑range.',
      near_min: 'Plan a mild nutrient top-up soon.',
      near_max: 'If leaves pale or edges curl, dilute slightly.'
    },
    ec: {
      below_min: 'Increase EC gradually (0.2-0.3 mS/cm per adjustment).',
      above_max: 'Dilute to avoid nutrient lockout; target mid‑range.',
      near_min: 'Plan a mild nutrient top-up soon.',
      near_max: 'Monitor for signs of nutrient burn.'
    },
    light: {
      below_min: 'Add supplemental light or reduce canopy shading.',
      above_max: 'Too intense light can cause tip burn; raise fixture or diffuse.',
      near_min: 'Consider extending photoperiod if growth slows.',
      near_max: 'Watch for leaf edge curl — may need to raise lights.'
    },
    environment_temp: {
      below_min: 'Cool air slows growth — ensure adequate circulation but avoid drafts.',
      above_max: 'High heat risks bolting — increase ventilation or shading.',
      near_min: 'If trend continues, pre‑warm incoming air.',
      near_max: 'Improve airflow to stabilize temperature.'
    },
    water_temperature: {
      below_min: 'Cold roots slow nutrient uptake — insulate reservoir.',
      above_max: 'Warm solution lowers dissolved oxygen; consider chilling.',
      near_min: 'Monitor nightly lows; add insulation if dropping further.',
      near_max: 'Aerate more or partially replace with cooler water.'
    },
    humidity: {
      below_min: 'Low RH increases transpiration — add gentle misting.',
      above_max: 'High RH risks mildew — add airflow / dehumidify.',
      near_min: 'If leaves wilt mid‑day, raise RH slightly.',
      near_max: 'Ensure leaves dry before dark period.'
    }
  },
  Basil: {
    general: 'Ensure consistent pruning to encourage airflow.',
    ph: {
      below_min: 'Low pH can mute aroma compounds — raise gradually.',
      above_max: 'High pH reduces micronutrient availability — adjust slowly.',
      near_min: 'Stabilize with small pH Up micro‑dose.',
      near_max: 'If trending higher, perform partial dilution.'
    },
    tds: {
      below_min: 'Slight boost supports leaf mass; add balanced nutrients.',
      above_max: 'Excess salts can dull flavor — dilute 10–20%.',
      near_min: 'Consider mild feed if new growth is pale.',
      near_max: 'Maintain airflow; high EC plus heat stresses basil.'
    },
    ec: {
      below_min: 'Slight boost supports leaf mass; add balanced nutrients.',
      above_max: 'Excess salts can dull flavor — dilute 10–20%.',
      near_min: 'Consider mild feed if new growth is pale.',
      near_max: 'Maintain airflow; high EC plus heat stresses basil.'
    },
    light: {
      below_min: 'Increase PPFD for compact, aromatic growth.',
      above_max: 'Too much light may cause chlorosis — raise fixture.',
      near_min: 'Extend photoperiod a little for fuller canopy.',
      near_max: 'Watch for leaf curl; diffuse if necessary.'
    },
    environment_temp: {
      below_min: 'Basil slows < optimal temp — avoid cold drafts.',
      above_max: 'High heat + high RH invites fungus — vent promptly.',
      near_min: 'If nights are cool, buffer with thermal mass.',
      near_max: 'Improve evaporative cooling or shading.'
    },
    water_temperature: {
      below_min: 'Cool solution reduces root vigor — gently warm.',
      above_max: 'Warm solution invites pathogen pressure — cool it.',
      near_min: 'Insulate lines if chill is recurring.',
      near_max: 'Increase aeration to maintain oxygen.'
    },
    humidity: {
      below_min: 'Low RH can stunt tender tips — raise slightly.',
      above_max: 'Prone to downy mildew — dehumidify now.',
      near_min: 'Monitor leaf edge dry‑out.',
      near_max: 'Ensure canopy dries before dark.'
    }
  }
};

function enrichAlertMessage(plantInfo, sensorType, classificationReason, baseMessage) {
  if (!plantInfo) return baseMessage;
  const name = plantInfo.plant_name;
  const tips = PLANT_RECOMMENDATION_TEMPLATES[name];
  if (!tips) return baseMessage;
  const domainMap = {
    ph: 'ph',
    tds: 'tds',
    ec: 'ec',
    light: 'light',
    humidity: 'humidity',
    air_temperature: 'environment_temp',
    water_temperature: 'water_temperature'
  };
  const domain = domainMap[sensorType];
  let extra = '';
  if (domain && tips[domain]) {
    const domainTips = tips[domain];
    extra = domainTips[classificationReason] || '';
  }
  if (!extra && tips.general) extra = tips.general;
  if (!extra) return baseMessage;
  return `${baseMessage} Recommendation: ${extra}`;
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

  // Build alert entries for this device in the Log tab using AlertsPage logic
  useEffect(() => {
    let mounted = true;
    async function buildDeviceAlerts() {
      try {
        if (activeTab !== 'log') return;
        const id = (device && (device.id || device.device_id)) || deviceId || (location.state && location.state.deviceId);
        if (!id) return;

        // Resolve plant thresholds via plant catalog and active reservoir
        let plantCatalog = [];
        try {
          const plantResp = await listPlants();
          plantCatalog = plantResp && plantResp.results ? plantResp.results : plantResp;
        } catch (_e) { /* plant catalog optional */ }

        let devicePlant = null;
        const plantName = (reservoir && (reservoir.plant_type || reservoir.plant)) || (device && device.plant_name) || null;
        if (plantName && Array.isArray(plantCatalog)) {
          devicePlant = plantCatalog.find(p => p.plant_name === plantName) || null;
        }

        const sensorsResp = await getDeviceSensors(id);
        const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
        if (!Array.isArray(sensors) || sensors.length === 0) {
          if (mounted) setLogEntries([]);
          return;
        }

        const relevantSensors = sensors.filter(s => ['ph', 'water_level', 'tds', 'ec', 'turbidity', 'light', 'humidity', 'air_temperature', 'water_temperature'].includes(s.sensor_type));
        const abnormal = [];

        await Promise.all(relevantSensors.map(async (sensor) => {
          try {
            const dataResp = await getSensorData(sensor.id, 60);
            const data = dataResp && dataResp.results ? dataResp.results : dataResp;
            const readings = Array.isArray(data) ? data : (data ? [data] : []);
            readings.forEach(r => {
              const val = r && typeof r.value !== 'undefined' ? Number(r.value) : null;
              if (val === null || Number.isNaN(val)) return;

              let cls = { severity: 'none', reason: null };
              if (sensor.sensor_type === 'ph') cls = classifyPH(val, devicePlant);
              else if (sensor.sensor_type === 'tds') cls = classifyTDS(val, devicePlant);
              else if (sensor.sensor_type === 'ec') cls = classifyEC(val, devicePlant);
              else if (sensor.sensor_type === 'light') cls = classifyLight(val, devicePlant);
              else if (sensor.sensor_type === 'air_temperature') cls = classifyEnvTemp(val, devicePlant);
              else if (sensor.sensor_type === 'humidity') cls = classifyHumidity(val, devicePlant);
              else if (sensor.sensor_type === 'water_temperature') cls = classifyWaterTemp(val, devicePlant);
              else if (sensor.sensor_type === 'water_level') {
                // not plant-based
                if (val === 0) cls = { severity: 'critical', reason: 'empty' };
                else if (val <= 40) cls = { severity: 'warning', reason: 'low' };
              } else if (sensor.sensor_type === 'turbidity') {
                // generic clarity thresholds
                if (val <= 1800) cls = { severity: 'critical', reason: 'turbid' };
                else if (val <= 2100) cls = { severity: 'warning', reason: 'cloudy' };
              }

              if (cls.severity === 'none') return;
              abnormal.push({ sensor, reading: r, value: val, cls });
            });
          } catch (_e) { /* ignore a sensor failure */ }
        }));

        // Build entries mirroring AlertsPage semantics
        let nextId = 1;
        const built = abnormal
          .sort((a, b) => {
            const ta = a.reading && (a.reading.created_at || a.reading.timestamp) ? new Date(a.reading.created_at || a.reading.timestamp).getTime() : 0;
            const tb = b.reading && (b.reading.created_at || b.reading.timestamp) ? new Date(b.reading.created_at || b.reading.timestamp).getTime() : 0;
            return tb - ta;
          })
          .map(({ sensor, reading, value, cls }) => {
            const iso = reading.created_at || reading.timestamp || new Date().toISOString();
            const severity = cls.severity;
            let type = severity === 'critical' ? 'critical' : 'warning';
            let title = 'Alert';
            let baseMessage = '';

            if (sensor.sensor_type === 'ph') {
              if (cls.reason === 'below_min') { title = 'Low pH detected'; baseMessage = `pH is ${value}`; }
              else if (cls.reason === 'above_max') { title = 'High pH detected'; baseMessage = `pH is ${value}`; }
              else if (cls.reason === 'near_min' || cls.reason === 'near_max') { title = 'pH nearing limit'; baseMessage = `pH is ${value}`; }
              baseMessage = enrichAlertMessage(devicePlant, 'ph', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'tds') {
              if (cls.reason === 'below_min') { title = 'TDS low'; baseMessage = `TDS ${value} ppm`; }
              else if (cls.reason === 'above_max') { title = 'TDS high'; baseMessage = `TDS ${value} ppm`; }
              else { title = 'TDS near bound'; baseMessage = `TDS ${value} ppm`; }
              baseMessage = enrichAlertMessage(devicePlant, 'tds', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'ec') {
              if (cls.reason === 'below_min') { title = 'EC low'; baseMessage = `EC ${value} mS/cm`; }
              else if (cls.reason === 'above_max') { title = 'EC high'; baseMessage = `EC ${value} mS/cm`; }
              else { title = 'EC near bound'; baseMessage = `EC ${value} mS/cm`; }
              baseMessage = enrichAlertMessage(devicePlant, 'ec', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'air_temperature') {
              if (cls.reason === 'below_min') { title = 'Air temperature low'; baseMessage = `Air temp ${value}°C`; }
              else if (cls.reason === 'above_max') { title = 'Air temperature high'; baseMessage = `Air temp ${value}°C`; }
              else { title = 'Air temperature near bound'; baseMessage = `Air temp ${value}°C`; }
              baseMessage = enrichAlertMessage(devicePlant, 'air_temperature', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'humidity') {
              if (cls.reason === 'below_min') { title = 'Humidity low'; baseMessage = `Humidity ${value}%`; }
              else if (cls.reason === 'above_max') { title = 'Humidity high'; baseMessage = `Humidity ${value}%`; }
              else { title = 'Humidity near bound'; baseMessage = `Humidity ${value}%`; }
              baseMessage = enrichAlertMessage(devicePlant, 'humidity', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'light') {
              if (cls.reason === 'below_min') { title = 'Light low'; baseMessage = `Light ${value}`; }
              else if (cls.reason === 'above_max') { title = 'Light high'; baseMessage = `Light ${value}`; }
              else { title = 'Light near bound'; baseMessage = `Light ${value}`; }
              baseMessage = enrichAlertMessage(devicePlant, 'light', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'water_temperature') {
              if (cls.reason === 'below_min') { title = 'Water temp low'; baseMessage = `Water temp ${value}°C`; }
              else if (cls.reason === 'above_max') { title = 'Water temp high'; baseMessage = `Water temp ${value}°C`; }
              else { title = 'Water temp near bound'; baseMessage = `Water temp ${value}°C`; }
              baseMessage = enrichAlertMessage(devicePlant, 'water_temperature', cls.reason, baseMessage);
            } else if (sensor.sensor_type === 'water_level') {
              if (cls.reason === 'empty') { title = 'Water level empty'; type = 'critical'; baseMessage = 'Water level 0% — refill immediately.'; }
              else { title = 'Low water level'; baseMessage = `Water level ${value}% — refill soon.`; }
            } else if (sensor.sensor_type === 'turbidity') {
              if (cls.reason === 'turbid') { title = 'Water turbid'; type = 'critical'; baseMessage = `Turbidity ${value} — consider drain/refill.`; }
              else { title = 'Water cloudy'; baseMessage = `Turbidity ${value} — clean filters or partial change.`; }
            }

            return {
              id: nextId++,
              type,
              title,
              message: baseMessage,
              time: relativeTimeFromISO(iso),
              date: new Date(iso).toLocaleDateString(),
              createdAt: iso,
            };
          });

        if (mounted) setLogEntries(built);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('DeviceDetails: failed to build device alerts (plant-based)', e);
        if (mounted) setLogEntries([]);
      }
    }
    buildDeviceAlerts();
    return () => { mounted = false; };
  }, [activeTab, device, deviceId, location.state, reservoir]);

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
                <Wifi size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
                <span className="settings-item-label">Connectivity</span>
              </div>
              <div className="settings-item-right">
                <span className="settings-item-value">Connected via Wifi</span>
                <ChevronRight size={20} color="#8BA797" />
              </div>
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
