import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import theme from '../src/theme';

export default function WiFiSetup({ route, navigation }) {
  const { deviceName, deviceIdentifier } = route?.params || {};
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  const onSend = () => {
    if (!ssid) return Alert.alert('Missing SSID', 'Enter the Wi‑Fi network name');
    // Implement device provisioning call here (deviceApi.provision or similar)
    Alert.alert('Sent', `Wi‑Fi sent to ${deviceName || 'device'}`);
    navigation.navigate('Home');
  };

  return (
    <View style={styles.hero}>
      <View style={styles.topRow}>
        {[1,2,3,4,5,6].map(n => (
          <View key={n} style={[styles.stepCircle, n===2 && styles.stepActive]}>
            <Text style={[styles.stepText, n===2 && styles.stepTextActive]}>{n}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.stage}>Step 2 of 6</Text>
      <Text style={styles.h1}>Connect your device to Wi‑Fi</Text>

      <View style={styles.card}>
        {deviceName ? <Text style={styles.meta}>Device: <Text style={styles.metaBold}>{deviceName}</Text></Text> : null}
        {deviceIdentifier ? <Text style={styles.meta}>ID: <Text style={styles.metaBold}>{deviceIdentifier}</Text></Text> : null}

        <Text style={styles.label}>Network name (SSID)</Text>
        <TextInput value={ssid} onChangeText={setSsid} style={styles.input} placeholder="Your Wi‑Fi network" placeholderTextColor={theme.colors.muted} />

        <Text style={styles.label}>Password</Text>
        <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" secureTextEntry placeholderTextColor={theme.colors.muted} />
      </View>

      <View style={styles.verifyRow}>
        <View style={styles.verifyLeft}>
          <Text style={styles.verifyTitle}>Send network settings</Text>
          <Text style={styles.verifyDesc}>We’ll attempt to provision your device onto the network.</Text>
        </View>
        <TouchableOpacity style={styles.verifyButton} onPress={onSend}>
          <Text style={styles.verifyButtonText}>Send to device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, backgroundColor: theme.colors.primary, padding: theme.spacing.l },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.s },
  stepCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: '#fff' },
  stepText: { color: 'rgba(255,255,255,0.9)' },
  stepTextActive: { color: theme.colors.primary, fontWeight: '800' },

  stage: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginTop: theme.spacing.s },
  h1: { color: '#fff', fontSize: 24, fontWeight: '900', marginVertical: theme.spacing.m },

  card: { marginTop: theme.spacing.l, backgroundColor: 'rgba(255,255,255,0.08)', padding: theme.spacing.l, borderRadius: theme.radii.lg },
  meta: { color: 'rgba(255,255,255,0.9)', marginBottom: theme.spacing.s },
  metaBold: { color: '#fff', fontWeight: '700' },
  label: { color: 'rgba(255,255,255,0.9)', marginBottom: theme.spacing.xs, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: theme.spacing.m, marginBottom: theme.spacing.m },

  verifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.l, backgroundColor: 'rgba(0,0,0,0.12)', padding: theme.spacing.m, borderRadius: theme.radii.lg },
  verifyLeft: { flex: 1, paddingRight: theme.spacing.s },
  verifyTitle: { color: '#fff', fontWeight: '800' },
  verifyDesc: { color: 'rgba(255,255,255,0.9)' },
  verifyButton: { backgroundColor: '#fff', paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.l, borderRadius: 10 },
  verifyButtonText: { color: theme.colors.primary, fontWeight: '800' }
});
