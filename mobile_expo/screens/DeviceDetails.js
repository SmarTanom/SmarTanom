import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { deviceApi, apiClient } from '../src/services/apiClient';
import theme from '../src/theme';

export default function DeviceDetails({ route }) {
  const params = route.params || {};
  const deviceId = params.deviceId || params.id || params.device || null;

  const [device, setDevice] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [sensorValues, setSensorValues] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!deviceId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('authToken');
        const devResp = await deviceApi.get(deviceId, token);
        if (!mounted) return;
        const dev = devResp && devResp.id ? devResp : (devResp && devResp.results ? devResp.results : devResp);
        setDevice(dev);

        // Fetch sensors for device
        try {
          const sResp = await apiClient.get(`/api/sensors/sensors/?device=${deviceId}`, { authToken: token });
          const sensorsList = Array.isArray(sResp?.results) ? sResp.results : (Array.isArray(sResp) ? sResp : (sResp?.sensors || []));
          setSensors(sensorsList);

          // Fetch latest reading for sensors (sensor__in)
          const ids = sensorsList.map(s => s.id).filter(Boolean);
          if (ids.length > 0) {
            const dataResp = await apiClient.get(`/api/sensors/sensor-data/?sensor__in=${ids.join(',')}&limit=1`, { authToken: token });
            const entries = Array.isArray(dataResp?.results) ? dataResp.results : (Array.isArray(dataResp) ? dataResp : (dataResp?.data || []));
            const map = {};
            entries.forEach(e => { if (e && e.sensor) map[e.sensor] = e.value ?? e.v ?? e.val ?? e.value_raw; });
            setSensorValues(map);
          }
        } catch (e) {
          // ignore sensor errors for now
          console.warn('Failed to load sensors', e);
        }

        // Fetch alerts for this device
        try {
          const aResp = await apiClient.get(`/api/notifications/logs/alerts/?device=${deviceId}&limit=50`, { authToken: token });
          const arr = aResp?.alerts || aResp?.results || (Array.isArray(aResp) ? aResp : []);
          setAlerts(arr.slice(0, 50));
        } catch (e) {
          console.warn('Failed to load alerts', e);
        }
      } catch (e) {
        console.warn('DeviceDetails: error', e);
        Alert.alert('Error', 'Failed to load device');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [deviceId]);

  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access photos is required to upload plant photo');
        return;
      }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true });
  // Modern Expo ImagePicker returns { canceled: boolean, assets: [{ uri, ... }] }
  const wasCancelled = !!(res && (res.canceled || res.cancelled));
  const uri = res?.assets?.[0]?.uri;
  if (wasCancelled || !uri) return;
      const name = uri.split('/').pop();
      const match = name && name.match(/\.([0-9a-z]+)$/i);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const file = { uri, name: name, type: mimeType };
      setUploading(true);
      const token = await AsyncStorage.getItem('authToken');
      await deviceApi.uploadPlantPhoto(deviceId, file, token);
      Alert.alert('Success', 'Photo uploaded');
      // Refresh device
      const refreshed = await deviceApi.get(deviceId, token);
      setDevice(refreshed);
    } catch (e) {
      console.warn('Upload failed', e);
      Alert.alert('Upload failed', e?.message || 'Unable to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (!deviceId) {
    return (
      <View style={styles.center}><Text>No device specified</Text></View>
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{device?.name || `Device ${deviceId}`}</Text>

      {device?.plant ? (
        <View style={styles.plantCard}>
          {device.plant.image ? (
            <Image source={{ uri: device.plant.image }} style={styles.plantImage} />
          ) : (
            <View style={[styles.plantImage, styles.plantPlaceholder]}><Text style={{color: theme.colors.muted}}>No image</Text></View>
          )}
          <View style={{flex:1, marginLeft:12}}>
            <Text style={styles.plantTitle}>{device.plant.name}</Text>
            <Text style={styles.plantSubtitle}>{device.plant.variety}</Text>
            <Text style={styles.plantStatus}>{device.plant.status || ''}</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickAndUploadImage} disabled={uploading}>
              <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Change Plant Photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noPlant}><Text style={{color:'#666'}}>No plant information</Text></View>
      )}

  <Text style={styles.sectionTitle}>Sensors</Text>
      {sensors.length === 0 ? <Text style={{color:'#666'}}>No sensors found for this device.</Text> : (
        <FlatList
          data={sensors}
          keyExtractor={i => String(i.id)}
          renderItem={({item}) => (
            <View style={styles.sensorRow}>
              <Text style={styles.sensorName}>{item.name || item.sensor_type}</Text>
              <Text style={styles.sensorValue}>{sensorValues[item.id] ?? '—'}</Text>
            </View>
          )}
        />
      )}

  <Text style={styles.sectionTitle}>Alerts</Text>
      {alerts.length === 0 ? <Text style={{color:'#666'}}>No recent alerts.</Text> : (
        <View>
          {alerts.map(a => (
            <View key={a.id || a.reading_id || Math.random()} style={styles.alertRow}>
              <Text style={styles.alertTitle}>{a.title || a.type || 'Alert'}</Text>
              <Text style={styles.alertMsg}>{a.body || a.message || a.text || ''}</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.l, backgroundColor: theme.colors.background, flexGrow: 1 },
  heading: { fontSize: theme.fonts.h2, fontWeight: '700', marginBottom: theme.spacing.m, color: theme.colors.text },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  plantCard: { flexDirection: 'row', padding: theme.spacing.m, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.m, alignItems:'center' },
  plantImage: { width: 96, height: 96, borderRadius: theme.radii.sm, backgroundColor: '#f6f6f6' },
  plantPlaceholder: { alignItems:'center', justifyContent:'center' },
  plantTitle: { fontWeight: '700', fontSize: 18, color: theme.colors.text },
  plantSubtitle: { color: theme.colors.muted },
  plantStatus: { color: theme.colors.primary, marginTop: theme.spacing.s },
  uploadButton: { marginTop: theme.spacing.s, padding: theme.spacing.s, backgroundColor: theme.colors.accent, borderRadius: theme.radii.sm, alignSelf:'flex-start' },
  uploadText: { color: '#fff', fontWeight: '600' },
  noPlant: { padding: theme.spacing.m, borderWidth:1, borderColor:theme.colors.border, borderRadius:theme.radii.md, marginBottom:theme.spacing.m },
  sectionTitle: { fontSize: theme.fonts.h2, fontWeight: '700', marginTop: theme.spacing.m, marginBottom: theme.spacing.s, color: theme.colors.text },
  sensorRow: { flexDirection:'row', justifyContent:'space-between', padding: theme.spacing.s, borderWidth:1, borderColor:'#f0f0f0', borderRadius:theme.radii.sm, marginBottom:theme.spacing.s },
  sensorName: { fontWeight:'600', color: theme.colors.text },
  sensorValue: { color: theme.colors.text },
  alertRow: { padding:theme.spacing.s, borderWidth:1, borderColor:'#fff1f0', backgroundColor:'#fff6f6', borderRadius:theme.radii.sm, marginBottom:theme.spacing.s },
  alertTitle: { fontWeight:'700', color:theme.colors.danger },
  alertMsg: { color:theme.colors.text }
});
