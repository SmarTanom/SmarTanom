import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  TouchableOpacity,
  FlatList
} from 'react-native';
import theme from '../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInitialDashboard } from '../src/services/api';
import { getDeviceSensors, getSensorData } from '../src/services/api';
import { LineChart } from 'react-native-chart-kit';
// Fonts
import { useFonts as useAbril, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { useFonts as useMontserrat, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';

const SCREEN_WIDTH = Dimensions.get('window').width;

function PHMiniBars({ phHistory = [], plant }) {
  // phHistory is an array of numbers or nulls; render simple bars
  const values = phHistory || [];
  const numeric = values.filter(v => v !== null && typeof v === 'number');
  const min = numeric.length ? Math.min(...numeric) : 6.0;
  const max = numeric.length ? Math.max(...numeric) : 8.0;
  const range = max > min ? max - min : 1;

  return (
    <View style={styles.phBarsRow}>
      {values.map((v, i) => {
        const isNull = v === null || typeof v !== 'number' || !Number.isFinite(v);
        const pct = isNull ? 2 : Math.max(2, ((Math.min(max, Math.max(min, v)) - min) / range) * 100);
        const color = !isNull && plant && plant.ph_min != null && plant.ph_max != null
          ? (v < plant.ph_min || v > plant.ph_max ? '#e74c3c' : '#339432')
          : '#339432';
        return (
          <View key={String(i)} style={styles.phBarWrapper}>
            <View style={[styles.phBar, { height: `${pct}%`, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

// Ported from web Dashboard helper: generate pH history buckets for time ranges
function computePHHistoryFromSensorData(sensorDataArray, timeRange = 'days') {
  if (!Array.isArray(sensorDataArray) || sensorDataArray.length === 0) return null;
  // Sort ascending by created_at
  const phData = [...sensorDataArray].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  const endDate = new Date();
  let periods, getDateKey, formatPeriod;

  switch (timeRange) {
    case 'weeks':
      periods = 20;
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
      periods = 12;
      getDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        return getDateKey(date);
      };
      break;
    default:
      periods = 30;
      getDateKey = (date) => date.toDateString();
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return getDateKey(date);
      };
      break;
  }

  const dateMap = {};
  for (let i = periods - 1; i >= 0; i--) {
    const key = formatPeriod(i);
    dateMap[key] = null;
  }

  phData.forEach(d => {
    if (!d || !d.created_at) return;
    try {
      const dataDate = new Date(d.created_at);
      const dateKey = getDateKey(dataDate);
      if (!Object.prototype.hasOwnProperty.call(dateMap, dateKey)) return;
      const value = Number(d.value);
      if (!Number.isFinite(value)) return;
      dateMap[dateKey] = value; // latest wins because sorted ascending
    } catch (_) {}
  });

  return Object.values(dateMap);
}

function computePHLabels(timeRange = 'days') {
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
    default:
      periods = 30;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      break;
  }
  for (let i = periods - 1; i >= 0; i--) labels.push(formatLabel(i));
  return labels;
}

// --- Helper functions ported from web Dashboard ---
function getConnectivityStatus(lastSensorUpdate) {
  if (!lastSensorUpdate) return { connectivity: 'Offline', lastSync: 'Never' };
  try {
    const now = new Date();
    const lastUpdate = new Date(lastSensorUpdate);
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    if (diffMinutes < 5) return { connectivity: 'Online', lastSync: '< 1 minute ago' };
    if (diffMinutes < 60) return { connectivity: 'Online', lastSync: `${diffMinutes} minutes ago` };
    return { connectivity: 'Offline', lastSync: `${Math.floor(diffMinutes / 60)} hours ago` };
  } catch (_) {
    return { connectivity: 'Offline', lastSync: 'Unknown' };
  }
}

function computeProximityBuffer(min, max) {
  const DEFAULT_PROXIMITY_MIN = 50;
  const DEFAULT_PROXIMITY_MAX = 200;
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

function classifyTDS(v, plant) { return plant ? classifyValue(Number(v), plant.ppm_min, plant.ppm_max) : { severity: 'none' }; }

function getNutrientStatus(tdsValue, plant) {
  if (!Number.isFinite(tdsValue)) return undefined;
  if (!plant || plant.ppm_min == null || plant.ppm_max == null) return 'Optimal';
  const cls = classifyTDS(tdsValue, plant);
  if (cls.severity === 'critical') return tdsValue < plant.ppm_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
  if (cls.severity === 'warning') return tdsValue < plant.ppm_min ? 'Low (near min)' : 'High (near max)';
  return 'Optimal';
}

function transformSensorData(sensors = [], sensorDataMap = {}) {
  const sensorMap = {};
  sensors.forEach(sensor => {
    const allData = sensorDataMap[sensor.id] || [];
    let latestData = null;
    if (allData.length === 1) latestData = allData[0];
    else if (allData.length > 1) {
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
    if (!latestData || typeof latestData.value === 'undefined') return;
    const value = Number(latestData.value);
    switch (sensor.sensor_type) {
      case 'ph': sensorMap.ph = value; break;
      case 'tds': sensorMap.tds = value; break;
      case 'ec': sensorMap.ec = value; break;
      case 'water_level': sensorMap.waterLevel = value; break;
      case 'water_temperature': sensorMap.waterTemperature = value; break;
      case 'turbidity': sensorMap.turbidity = value; break;
      default: break;
    }
  });
  return sensorMap;
}

export default function Dashboard() {
  // load web fonts to match typography (falls back if not available)
  const [abrilLoaded] = useAbril({ AbrilFatface_400Regular });
  const [montserratLoaded] = useMontserrat({ Montserrat_400Regular, Montserrat_600SemiBold });

  const fontsLoaded = abrilLoaded && montserratLoaded;
  const [windowSize, setWindowSize] = useState(Dimensions.get('window'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceData, setDeviceData] = useState({});
  const [phData, setPhData] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [timeRange, setTimeRange] = useState('days');

  const carouselRef = useRef(null);

  useEffect(() => {
    const onChange = ({ window }) => setWindowSize(window);
    // Dimensions.addEventListener may return a subscription with remove() or be paired with removeEventListener
    const sub = Dimensions.addEventListener ? Dimensions.addEventListener('change', onChange) : null;
    if (!sub) {
      Dimensions.removeEventListener && Dimensions.removeEventListener('change', onChange);
      Dimensions.addEventListener('change', onChange);
    }
    return () => {
      try {
        if (sub && typeof sub.remove === 'function') sub.remove();
        else Dimensions.removeEventListener && Dimensions.removeEventListener('change', onChange);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Restore persisted phData and activeIdx
        try {
          const saved = await AsyncStorage.getItem('dashboard.phData');
          if (saved) setPhData(JSON.parse(saved));
          const savedIdx = await AsyncStorage.getItem('dashboard.activeDeviceIndex');
          if (savedIdx) setActiveIdx(parseInt(savedIdx, 10));
        } catch (e) {
          // ignore
        }

        const payload = await getInitialDashboard({ reading_limit: 60, alert_limit: 200 });
        // payload expected to contain: devices (array), deviceData (object keyed by device id)
        const ds = payload && (Array.isArray(payload.devices) ? payload.devices : payload.results || []);
        const dd = payload && (payload.deviceData || payload.device_data || {});
        setDevices(ds || []);
        setDeviceData(dd || {});

        // If payload contains phData, merge
        if (payload && payload.phData) {
          const merged = { ...(phData || {}), ...payload.phData };
          setPhData(merged);
          try { await AsyncStorage.setItem('dashboard.phData', JSON.stringify(merged)); } catch (_) {}
        }

        // For devices missing phHistory in phData, attempt to fetch sensor data for pH sensors
        if (Array.isArray(ds)) {
          for (const d of ds) {
            const key = String(d.id);
            const existing = (phData && phData[key] && phData[key].phHistory) || (payload && payload.phData && payload.phData[key] && payload.phData[key].phHistory);
            if (!existing) {
              try {
                const sensorsResp = await getDeviceSensors(d.id);
                const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
                if (Array.isArray(sensors) && sensors.length > 0) {
                  const phSensor = sensors.find(s => s.sensor_type === 'ph');
                  if (phSensor && phSensor.id) {
                    const dataResp = await getSensorData(phSensor.id, { limit: 500 });
                    const readings = dataResp && dataResp.results ? dataResp.results : dataResp;
                    const phHist = computePHHistoryFromSensorData(readings, timeRange);
                    if (phHist) {
                      const newPhData = { ...(phData || {}), ...(payload && payload.phData ? payload.phData : {}) };
                      newPhData[key] = { phHistory: phHist, phLabels: computePHLabels(timeRange) };
                      setPhData(newPhData);
                      try { await AsyncStorage.setItem('dashboard.phData', JSON.stringify(newPhData)); } catch (_) {}
                    }
                  }
                }
              } catch (e) {
                // ignore individual device failures
              }
            }
          }
        }
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // persist activeIdx (declare before any early return so hooks order is stable)
  useEffect(() => {
    AsyncStorage.setItem('dashboard.activeDeviceIndex', String(activeIdx)).catch(() => {});
    if (devices && devices[activeIdx]) {
      AsyncStorage.setItem('dashboard.activeDeviceId', String(devices[activeIdx].id)).catch(() => {});
    }
  }, [activeIdx, devices]);

  // If fonts are not loaded yet, show a spinner until they are ready to avoid layout shifts / font errors
  if (!fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const onSelectDevice = (idx) => {
    setActiveIdx(idx);
    // scroll to center if using FlatList
    if (carouselRef.current && typeof carouselRef.current.scrollToIndex === 'function') {
      carouselRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  };

  const renderDeviceCard = ({ item, index }) => {
    const d = item;
    const dd = deviceData && deviceData[d.id];
    const sensors = (dd && dd.sensors) || d.sensors || {};
    const phHistory = (phData && phData[String(d.id)] && phData[String(d.id)].phHistory) || null;
    const plant = (dd && dd.plant) || d.plant || null;
  // responsive card sizing based on current window dimensions
  const winW = windowSize.width || SCREEN_WIDTH;
  const winH = windowSize.height || (Dimensions.get('window').height);
  const cardWidth = Math.min(440, Math.max(280, Math.floor(winW - 48)));
  // card height scales with width and available height, clamped to a sensible range
  const cardHeight = Math.round(Math.max(180, Math.min(360, Math.min(winW * 0.55, winH * 0.38)))) ;

    return (
      <View style={styles.carouselCardWrapper} key={String(d.id)}>
        <TouchableOpacity onPress={() => onSelectDevice(index)} activeOpacity={0.95} style={[styles.carouselCardInner, index === activeIdx && styles.deviceCardActive]}>
          <ImageBackground
            source={{ uri: d.plant_photo_url || d.plant_photo || d.image || 'https://www.example.com/favicon.png' }}
            style={[styles.deviceBackground, { width: cardWidth, height: cardHeight }]}
            imageStyle={{ borderRadius: 24 }}
          >
            {/* Floating overlay at bottom */}
                    <View style={[styles.deviceCarouselOverlay, { width: cardWidth - 32 }]}>
                      <View style={styles.deviceCarouselInfo}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.deviceName}>{d.device_name || d.plant_name || `Device ${d.id}`}</Text>
                          <Text style={styles.deviceSubtitle}>{d.is_collaborator && !d.is_owner ? 'Shared Device' : d.device_serial || ''}</Text>
                        </View>
                        <View style={{ width: 140, alignItems: 'flex-end' }}>
                          <View style={styles.sensorRow}>
                            <View style={styles.sensorCell}>
                              <Text style={styles.sensorLabel}>pH</Text>
                              <Text style={styles.sensorValue}>{(sensors && typeof sensors.ph === 'number') ? sensors.ph.toFixed(1) : '--'}</Text>
                            </View>
                            <View style={styles.sensorCell}>
                              <Text style={styles.sensorLabel}>TDS</Text>
                              <Text style={styles.sensorValue}>{(sensors && typeof sensors.tds === 'number') ? sensors.tds : '--'}</Text>
                            </View>
                            <View style={styles.sensorCell}>
                              <Text style={styles.sensorLabel}>EC</Text>
                              <Text style={styles.sensorValue}>{(sensors && typeof sensors.ec === 'number') ? sensors.ec : '--'}</Text>
                            </View>
                          </View>
                          {/* nutrient status + connectivity */}
                          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, color: '#6F8876' }}>{getNutrientStatus(sensors && sensors.tds, plant) || 'Nutrient: --'}</Text>
                            <Text style={{ fontSize: 12, color: '#6F8876' }}>{(deviceData && deviceData[d.id] && getConnectivityStatus(deviceData[d.id].last_sensor_at).connectivity) || 'Status: --'}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ marginTop: 8 }}>
                        {phHistory ? <PHMiniBars phHistory={phHistory} plant={plant} /> : <Text style={styles.noPh}>No pH history</Text>}
                      </View>
                    </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load dashboard: {error}</Text>
      </View>
    );
  }

  const activeDevice = devices && devices[activeIdx];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.carouselWrapper}>
        <FlatList
          ref={carouselRef}
          data={devices}
          horizontal
          pagingEnabled
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderDeviceCard}
          extraData={activeIdx}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active device</Text>
        {activeDevice ? (
          <View style={styles.activeDeviceCard}>
            <Text style={styles.deviceNameLarge}>{activeDevice.device_name || activeDevice.plant_name || `Device ${activeDevice.id}`}</Text>
            <Text style={styles.smallMuted}>{activeDevice.device_serial || ''}</Text>
            <View style={{ height: 12 }} />
            <Text style={styles.sectionNote}>{(deviceData && deviceData[activeDevice.id] && deviceData[activeDevice.id].lastSyncLabel) || 'Last sync: --'}</Text>
            <View style={{ height: 12 }} />
            {(phData && phData[String(activeDevice.id)] && Array.isArray(phData[String(activeDevice.id)].phHistory)) ? (
                <LineChart
                data={{
                  labels: (phData[String(activeDevice.id)].phLabels || []).map(l => l),
                  datasets: [{ data: (phData[String(activeDevice.id)].phHistory || []).map(v => (v === null ? 0 : Number(v))) }]
                }}
                width={Math.min((windowSize.width || SCREEN_WIDTH) - 48, 340)}
                height={180}
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#f7f7f7',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(51,148,50, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100,100,100, ${opacity})`,
                  style: { borderRadius: 8 },
                  propsForDots: { r: '2', strokeWidth: '1', stroke: '#2a9d8f' },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 8 }}
              />
            ) : null}
          </View>
        ) : (
          <Text style={styles.sectionNote}>No device selected</Text>
        )}
      </View>

      <View style={styles.timeRangeRow}>
        {['days', 'weeks', 'months'].map(tr => (
          <TouchableOpacity key={tr} onPress={() => setTimeRange(tr)} style={[styles.timeButton, timeRange === tr && styles.timeButtonActive]}>
            <Text style={[styles.timeButtonText, timeRange === tr && styles.timeButtonTextActive]}>{tr}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.l, backgroundColor: '#F5FDF6', paddingTop: 64, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: theme.colors.muted },
  errorText: { color: '#cc3333' },
  // use the exact font key loaded via @expo-google-fonts
  heading: { fontSize: 32, fontWeight: '700', marginBottom: theme.spacing.s, color: theme.colors.text, fontFamily: 'AbrilFatface_400Regular' },
  carouselWrapper: { marginBottom: theme.spacing.m },
  deviceCard: { width: Math.min(440, SCREEN_WIDTH - 48), backgroundColor: '#fff', borderRadius: 24, marginRight: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8F1EA', flexDirection: 'row', alignItems: 'center', padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  deviceCardActive: { borderColor: theme.colors.primary, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, transform: [{ translateY: -4 }] },
  deviceImage: { width: 120, height: 120, resizeMode: 'cover', borderRadius: 12, backgroundColor: '#e8f5e9' },
  deviceInfo: { padding: 12, flex: 1, justifyContent: 'center' },
  deviceName: { fontWeight: '800', color: theme.colors.secondary || '#163a2a', marginBottom: 4 },
  deviceSubtitle: { color: '#8BA797', fontSize: 12, marginBottom: 6 },
  sensorRow: { flexDirection: 'row', marginTop: 6 },
  sensorCell: { flex: 1 },
  sensorLabel: { color: theme.colors.muted, fontSize: 11 },
  sensorValue: { fontWeight: '700', color: theme.colors.text },
  phBarsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 48, marginTop: 10 },
  phBarWrapper: { width: 10, marginHorizontal: 4, justifyContent: 'flex-end', alignItems: 'center' },
  phBar: { width: '100%', borderRadius: 4 },
  noPh: { color: theme.colors.muted, marginTop: 8 },
  section: { padding: theme.spacing.m, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: theme.spacing.m, borderWidth: 1, borderColor: '#E8F1EA' },
  sectionTitle: { fontWeight: '700', color: theme.colors.secondary || '#163a2a', marginBottom: 6 },
  sectionNote: { color: '#6F8876' },
  activeDeviceCard: { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8F1EA' },
  deviceNameLarge: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  smallMuted: { color: '#8BA797', fontSize: 12 },
  timeRangeRow: { flexDirection: 'row', marginBottom: theme.spacing.m, marginTop: 6 },
  timeButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8F1EA' },
  timeButtonActive: { backgroundColor: 'rgba(51,148,50,0.12)', borderColor: theme.colors.primary },
  timeButtonText: { color: theme.colors.text, textTransform: 'capitalize' },
  timeButtonTextActive: { color: theme.colors.primary }
  ,
  /* carousel specific */
  carouselCardWrapper: { width: SCREEN_WIDTH, alignItems: 'center', paddingHorizontal: 24 },
  carouselCardInner: { alignItems: 'center', justifyContent: 'center' },
  deviceBackground: { borderRadius: 24, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'flex-end' },
  deviceCarouselOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
  deviceCarouselInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
});
