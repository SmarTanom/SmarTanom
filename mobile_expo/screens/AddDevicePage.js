import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import theme from '../src/theme';

export default function AddDevicePage({ navigation }) {
  const [deviceId, setDeviceId] = useState('');
  const [scanning, setScanning] = useState(false);

  const onOpenCamera = () => {
    // placeholder: trigger camera/QR scanner
    setScanning(true);
    setTimeout(() => setScanning(false), 1200);
    Alert.alert('Camera', 'Open camera (placeholder)');
  };

  const onChooseImage = () => {
    Alert.alert('Choose', 'Pick image from gallery (placeholder)');
  };

  const onVerify = () => {
    if (!deviceId) return Alert.alert('Missing device id', 'Please input or scan the device id');
    // call verify endpoint if available
    Alert.alert('Verify', `Verifying device ${deviceId}`);
    navigation.navigate('WiFiSetup', { deviceName: null, deviceIdentifier: deviceId });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.stepRow}>
        {[1,2,3,4,5,6].map(n => (
          <View key={n} style={[styles.stepCircle, n===1 && styles.stepActive]}>
            <Text style={[styles.stepText, n===1 && styles.stepTextActive]}>{n}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.stage}>Step 1 of 6</Text>
      <Text style={styles.h1}>Identify your device</Text>

      <View style={styles.actionsRow}>
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Scan QR Code</Text>
          <Text style={styles.actionDesc}>Open your camera and point to the QR label.</Text>
          <TouchableOpacity style={styles.actionButton} onPress={onOpenCamera}>
            <Text style={styles.actionButtonText}>{scanning ? 'Opening...' : 'Open Camera'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Upload QR Image</Text>
          <Text style={styles.actionDesc}>Choose an existing photo of the QR label.</Text>
          <TouchableOpacity style={styles.actionButton} onPress={onChooseImage}>
            <Text style={styles.actionButtonText}>Choose Image</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualCard}>
        <Text style={styles.manualTitle}>Manual Entry</Text>
        <Text style={styles.manualHint}>Type the Device ID printed underneath the QR label.</Text>
        <TextInput value={deviceId} onChangeText={setDeviceId} placeholder="Input Device ID here" style={styles.manualInput} placeholderTextColor={theme.colors.muted} />
      </View>

      <View style={styles.verifyRow}>
        <View style={styles.verifyLeft}>
          <Text style={styles.verifyTitle}>Verify your device</Text>
          <Text style={styles.verifyDesc}>We'll confirm your SmarTanom before moving on.</Text>
        </View>
        <TouchableOpacity style={styles.verifyButton} onPress={onVerify}>
          <Text style={styles.verifyButtonText}>Verify Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.primary, padding: theme.spacing.l },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.s, marginBottom: theme.spacing.s },
  stepCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: '#fff' },
  stepText: { color: 'rgba(255,255,255,0.9)' },
  stepTextActive: { color: theme.colors.primary, fontWeight: '800' },

  stage: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginTop: theme.spacing.s },
  h1: { color: '#fff', fontSize: 28, fontWeight: '900', marginVertical: theme.spacing.m },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: theme.spacing.m, borderRadius: theme.radii.lg, marginRight: theme.spacing.s },
  actionTitle: { color: '#fff', fontWeight: '800', marginBottom: theme.spacing.s },
  actionDesc: { color: 'rgba(255,255,255,0.9)', marginBottom: theme.spacing.s },
  actionButton: { backgroundColor: '#fff', padding: theme.spacing.m, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: theme.colors.primary, fontWeight: '800' },

  manualCard: { marginTop: theme.spacing.l, backgroundColor: 'rgba(255,255,255,0.06)', padding: theme.spacing.m, borderRadius: theme.radii.lg },
  manualTitle: { color: '#fff', fontWeight: '800', marginBottom: theme.spacing.s },
  manualHint: { color: 'rgba(255,255,255,0.9)', marginBottom: theme.spacing.s },
  manualInput: { backgroundColor: '#fff', borderRadius: 10, padding: theme.spacing.m, color: '#222' },

  verifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.l, backgroundColor: 'rgba(0,0,0,0.12)', padding: theme.spacing.m, borderRadius: theme.radii.lg },
  verifyLeft: { flex: 1, paddingRight: theme.spacing.s },
  verifyTitle: { color: '#fff', fontWeight: '800' },
  verifyDesc: { color: 'rgba(255,255,255,0.9)' },
  verifyButton: { backgroundColor: '#fff', paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.l, borderRadius: 10 },
  verifyButtonText: { color: theme.colors.primary, fontWeight: '800' }
});
