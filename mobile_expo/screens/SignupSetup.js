import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import theme from '../src/theme';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web palette constants (from frontend CSS)
const WEB_BG = '#1e8a3a'; // page background green
const WEB_ACCENT = '#22c55e'; // bright accent (used for status)
const WEB_DARK = '#016b22'; // dark green used for button text on web

// Multi-step signup flow for Expo mobile app.
// Steps mirror web: 1) Identify Device, 2) Device Setup, 3) Bind Email, 4) Verify OTP, 5) Choose username, 6) WiFi, 7) Profile
// NOTE: This implementation is UI-first and simulates network/camera interactions. Wire real APIs and native camera/image-picker as needed.

function OtpInput({ value, setValue, error, editable = true }) {
  // value is a string of length up to 6
  const refs = useRef([]);
  useEffect(() => {
    // autofocus first empty
    const idx = value.split('').findIndex(c => !c);
    const target = idx === -1 ? 5 : idx;
    refs.current[target]?.focus?.();
  }, []);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = !!(value[i]);
        return (
          <TextInput
            key={i}
            ref={el => refs.current[i] = el}
            value={value[i] || ''}
            onChangeText={(t) => {
              const digit = (t || '').replace(/\D/g, '').slice(0, 1);
              const arr = value.padEnd(6, '').split('');
              arr[i] = digit || '';
              setValue(arr.join(''));
              if (digit && i < 5) refs.current[i + 1]?.focus?.();
            }}
            keyboardType="numeric"
            maxLength={1}
            style={[
              styles.otpCell,
              filled && styles.otpFilled,
              error && { borderColor: theme.colors.danger }
            ]}
            editable={editable}
          />
        );
      })}
    </View>
  );
}

export default function SignupSetup({ navigation }) {
  const [step, setStep] = useState(1);
  const total = 7;

  // Step 1: Identify
  const [deviceId, setDeviceId] = useState('');
  const [fileName, setFileName] = useState('');
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);

  // Step 2: Device setup
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [reservoirName, setReservoirName] = useState('');
  const [plantId, setPlantId] = useState('');

  // Step 3: bind
  const [bindEmail, setBindEmail] = useState('');

  // Step 4: OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  // Step 5: provisioning
  const [provisioningStatus, setProvisioningStatus] = useState('idle');

  // Step 6: profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  function isValidSerial(s) {
    return /^SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test((s || '').toUpperCase());
  }

  // Username step state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Permission helpers with rationale that open app settings when denied
  async function requestCameraPermissionOrShowSettings() {
    try {
      const res = await BarCodeScanner.requestPermissionsAsync();
      if (res.status === 'granted') return true;
      if (res.status === 'denied') {
        Alert.alert(
          'Camera permission required',
          'SmarTanom needs access to your camera to scan QR codes. Open settings to enable?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return false;
    } catch (e) {
      console.warn('Camera permission error', e);
      return false;
    }
  }

  async function requestMediaLibraryPermissionOrShowSettings() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
      if (!perm) return true;
      if (perm.status === 'granted') return true;
      if (perm.status === 'denied') {
        Alert.alert(
          'Photos permission required',
          'SmarTanom needs access to your photos to select QR images. Open settings to enable?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return false;
    } catch (e) {
      console.warn('Media permission error', e);
      return false;
    }
  }

  function withTimeout(promise, ms = 8000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
    ]);
  }

  async function verifyDevice() {
    if (checking) return;
    setChecking(true);
    try {
      const serial = (deviceId || '').trim().toUpperCase();
      if (!serial) return (setChecking(false), Alert.alert('Missing device ID', 'Please enter your device ID or scan the QR.'));
      if (!isValidSerial(serial)) return (setChecking(false), Alert.alert('Invalid device ID', 'Device ID should look like SMRT-XXX-XXX'));
      // call backend checkDevice API with a timeout to avoid long hangs
  try {
  const resp = await api.checkDevice(serial);
        if (resp && resp.exists && !resp.is_bound) {
          setVerified(true);
          setStep(2);
        } else if (resp && resp.is_bound) {
          Alert.alert('Device already bound', 'This device is already bound to an email address.');
        } else {
          Alert.alert('Not found', 'Device not found. Please check the serial.');
        }
      } catch (e) {
        console.warn('checkDevice error', e);
        Alert.alert('Check failed', e.message || 'Unable to check device (network or timeout)');
      } finally {
        setChecking(false);
      }
    } catch (e) {
      setChecking(false);
      Alert.alert('Verification failed', e.message || 'Unable to verify device');
    }
  }

  function sendCode() {
    if (!/[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(bindEmail || '')) return Alert.alert('Invalid email', 'Please enter a valid email');
    // call API to request device OTP
    (async () => {
      try {
        await api.requestDeviceOTP(deviceId.trim().toUpperCase(), bindEmail.trim());
        setStep(4);
      } catch (e) {
        Alert.alert('Send failed', e.message || 'Unable to send verification code');
      }
    })();
  }

  function verifyOtp() {
    setOtpError('');
    if ((otpCode || '').length !== 6) return setOtpError('Enter the 6-digit code');
    (async () => {
      try {
        const resp = await api.verifyDeviceOTP(deviceId.trim().toUpperCase(), bindEmail.trim(), otpCode);
        if (resp && resp.success) {
          // save auth token if provided
          if (resp.auth && resp.auth.token) {
            try { global.authToken = resp.auth.token; await AsyncStorage.setItem('authToken', resp.auth.token); } catch (_) { }
          }
          setStep(5);
        } else {
          setOtpError('Verification failed');
        }
      } catch (e) {
        setOtpError(e.message || 'Verification failed');
      }
    })();
  }

  function startProvisioning() {
    setProvisioningStatus('waiting');
    // Simulate provisioning then success
    setTimeout(() => {
      setProvisioningStatus('checking');
      setTimeout(() => {
        setProvisioningStatus('success');
        setTimeout(() => setStep(6), 700);
      }, 1600);
    }, 800);
  }

  function finalizeAccount() {
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Missing name', 'First and last name are required');
    (async () => {
      try {
        const token = global.authToken || (await AsyncStorage.getItem('authToken'));
        if (!token) return Alert.alert('Session expired', 'Please complete the verification step again.');
        // Update profile with first/last name
        await api.updateProfile(token, { first_name: firstName.trim(), last_name: lastName.trim() });
        Alert.alert('Setup complete', 'Your profile and device are configured', [{ text: 'Go to Dashboard', onPress: () => navigation.navigate('Dashboard') }]);
      } catch (e) {
        Alert.alert('Finalize failed', e.message || 'Unable to finalize account');
      }
    })();
  }

  const headings = ['Identify', 'Setup', 'Bind', 'Verify', 'Choose username', 'WiFi', 'Profile'];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.h1}>{headings[step - 1]} your device</Text>
        <Text style={styles.subtitle}>{`Step ${step} of ${total}`}</Text>
      </View>

      <View style={styles.cardWrap}>
        {/* Step 1 */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.methodTitle}>Scan QR Code</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={async () => {
              const ok = await requestCameraPermissionOrShowSettings();
              if (ok) {
                setHasCameraPermission(true);
                setQrScannerOpen(true);
              }
            }}>
              <Text style={styles.btnSecondaryText}>Open Camera</Text>
            </TouchableOpacity>

            <Text style={[styles.methodTitle, { marginTop: 14 }]}>Upload QR Image</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={async () => {
              try {
                const ok = await requestMediaLibraryPermissionOrShowSettings();
                if (!ok) return;
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
                // Modern Expo ImagePicker returns { canceled: boolean, assets: [{ uri, ... }] }
                const wasCancelled = !!(res && (res.canceled || res.cancelled));
                const uri = res?.assets?.[0]?.uri;
                if (!wasCancelled && uri) {
                  setFileName(uri.split('/').pop());
                  // Try client-side decode using BarCodeScanner.scanFromURLAsync if available
                  try {
                    if (BarCodeScanner.scanFromURLAsync) {
                      const scans = await BarCodeScanner.scanFromURLAsync(uri);
                      if (Array.isArray(scans) && scans.length > 0) {
                        const data = scans[0].data || scans[0].value || '';
                        const m = /SMRT-[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/i.exec(String(data || ''));
                        if (m) {
                          const serial = m[0].toUpperCase();
                          setDeviceId(serial);
                          Alert.alert('Device ID detected', serial);
                          return;
                        }
                      }
                    }
                  } catch (decodeErr) {
                    console.warn('QR decode from image failed', decodeErr);
                  }
                  Alert.alert('Image selected', 'Image selected. QR decoding from image not available — try scanning with the camera or upload via web.');
                }
              } catch (e) { Alert.alert('Image error', e.message || String(e)); }
            }}>
              <Text style={styles.btnSecondaryText}>Choose Image</Text>
            </TouchableOpacity>

            <Text style={[styles.methodTitle, { marginTop: 14 }]}>Manual Entry</Text>
            <Text style={styles.label}>Device ID</Text>
            <TextInput value={deviceId} onChangeText={t => { setDeviceId(t); if (verified) setVerified(false); }} style={styles.input} placeholder="SMRT-ABC-123" autoCapitalize="characters"/>

            <TouchableOpacity style={styles.button} onPress={verifyDevice} disabled={checking}>
              <Text style={styles.buttonText}>{checking ? 'Verifying…' : 'Verify Device'}</Text>
            </TouchableOpacity>
            {/* QR Scanner Modal */}
            {qrScannerOpen && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' }}>
                <BarCodeScanner
                  onBarCodeScanned={({ type, data }) => {
                    try {
                      // attempt to extract serial from data
                      const text = String(data || '');
                      const m = /SMRT-[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/i.exec(text);
                      if (m) {
                        const serial = m[0].toUpperCase();
                        setDeviceId(serial);
                        setQrScannerOpen(false);
                        setVerified(false);
                        Alert.alert('Device ID detected', serial);
                        return;
                      }
                      Alert.alert('QR scanned', 'No valid device ID found in QR.');
                    } catch (e) {
                      Alert.alert('Scan error', e.message || String(e));
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity style={{ position: 'absolute', top: 40, left: 16, padding: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8 }} onPress={() => setQrScannerOpen(false)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Device Information</Text>
            <Text style={styles.label}>Device Nickname (optional)</Text>
            <TextInput value={nickname} onChangeText={setNickname} style={styles.input} placeholder="Optional — defaults to serial ID" />
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="e.g., Balcony" />
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Reservoir</Text>
            <Text style={styles.label}>Reservoir Name</Text>
            <TextInput value={reservoirName} onChangeText={setReservoirName} style={styles.input} placeholder="Main Tank" />
            <Text style={styles.label}>Plant (optional)</Text>
            <TextInput value={plantId} onChangeText={setPlantId} style={styles.input} placeholder="e.g., Lettuce (select later)" />

            <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bind Device to Email</Text>
            <Text style={styles.label}>Email Address</Text>
            <TextInput value={bindEmail} onChangeText={setBindEmail} style={styles.input} placeholder="user@example.com" keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={[styles.button, !bindEmail && styles.buttonDisabled]} onPress={sendCode} disabled={!bindEmail}>
              <Text style={styles.buttonText}>Send Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Enter Verification Code</Text>
            <Text style={styles.helper}>A 6-digit code was sent to {bindEmail || 'your email'}</Text>
            <OtpInput value={otpCode} setValue={setOtpCode} error={otpError} />
            {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.btnOutline, false && styles.buttonDisabled]} onPress={() => { setOtpCode(''); setOtpError(''); setStep(3); }}>
                <Text style={styles.btnOutlineText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, otpCode.length !== 6 && styles.buttonDisabled]} onPress={verifyOtp} disabled={otpCode.length !== 6}>
                <Text style={styles.buttonText}>Verify Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 5: Choose username */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Choose a username</Text>
            <Text style={styles.helper}>Pick a unique username for your SmarTanom account.</Text>
            <Text style={styles.label}>Username</Text>
            <TextInput value={username} onChangeText={t => { setUsername(t); setUsernameError(''); }} style={styles.input} placeholder="username" autoCapitalize="none" />
            {usernameError ? <Text style={styles.error}>{usernameError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.btnOutline]} onPress={() => setStep(4)}>
                <Text style={styles.btnOutlineText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, !username && styles.buttonDisabled]} disabled={!username || checkingUsername} onPress={async () => {
                try {
                  setCheckingUsername(true);
                  setUsernameError('');
                  const candidate = (username || '').trim();
                  if (!/^[A-Za-z0-9_-]{3,30}$/.test(candidate)) {
                    setUsernameError('Username must be 3-30 chars: letters, numbers, underscore or hyphen');
                    return;
                  }
                  const resp = await api.auth.checkUsername(candidate);
                  if (resp && resp.available === false) {
                    setUsernameError(resp.message || 'Username not available');
                    return;
                  }
                  const token = global.authToken || (await AsyncStorage.getItem('authToken'));
                  if (!token) return Alert.alert('Session expired', 'Please complete the verification step again.');
                  const finalResp = await api.auth.finalizeAccount(candidate, token, {});
                  if (finalResp && (finalResp.user || finalResp.message)) {
                    setStep(6);
                  } else {
                    Alert.alert('Could not finalize', 'Unexpected response from server');
                  }
                } catch (e) {
                  setUsernameError(e.message || 'Failed to check username');
                } finally { setCheckingUsername(false); }
              }}>
                <Text style={styles.buttonText}>{checkingUsername ? 'Checking…' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 6: Device WiFi Setup (moved) */}
        {step === 6 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Device WiFi Setup</Text>
            <Text style={styles.helper}>Follow these steps on your device hotspot: connect to the device AP, open http://192.168.4.1 and enter your network credentials.</Text>
            {provisioningStatus === 'idle' && (
              <TouchableOpacity style={styles.button} onPress={startProvisioning}>
                <Text style={styles.buttonText}>Start Provisioning</Text>
              </TouchableOpacity>
            )}
            {provisioningStatus === 'waiting' && <Text style={styles.helper}>Waiting for you to complete the device steps…</Text>}
            {provisioningStatus === 'checking' && <Text style={styles.helper}>Checking device status…</Text>}
            {provisioningStatus === 'success' && <Text style={[styles.helper, { color: WEB_ACCENT }]}>Device connected — continuing to profile setup…</Text>}
          </View>
        )}

        {/* Step 7 */}
        {step === 7 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Profile</Text>
            <Text style={styles.label}>First Name</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="Jane" />
            <Text style={styles.label}>Last Name</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Doe" />
            <TouchableOpacity style={[styles.button, (!firstName.trim() || !lastName.trim()) && styles.buttonDisabled]} onPress={finalizeAccount} disabled={!firstName.trim() || !lastName.trim()}>
              <Text style={styles.buttonText}>Finish Setup</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WEB_BG },
  header: { padding: theme.spacing.l, paddingTop: theme.spacing.xl },
  h1: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  cardWrap: { padding: theme.spacing.l, alignItems: 'center' },
  card: { width: '100%', maxWidth: 620, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: theme.spacing.l, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2, marginBottom: 12 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  helper: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 8 },
  label: { color: 'rgba(255,255,255,0.88)', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e6e6', padding: theme.spacing.m, borderRadius: 8, marginBottom: theme.spacing.m, color: theme.colors.text },
  button: { backgroundColor: '#ffffff', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: theme.spacing.s, minWidth: 140, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 6 },
  buttonText: { color: WEB_DARK, fontWeight: '800', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnSecondaryText: { color: '#ffffff', fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  btnOutlineText: { color: theme.colors.text },
  otpCell: { width: 54, height: 60, borderWidth: 1, borderColor: WEB_DARK, borderRadius: 18, textAlign: 'center', fontSize: 22, color: WEB_DARK, backgroundColor: '#fff', fontWeight: '700' },
  otpFilled: { backgroundColor: '#fff', borderColor: WEB_ACCENT, shadowColor: WEB_ACCENT, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 },
  error: { color: theme.colors.danger, marginTop: 8 }
});
