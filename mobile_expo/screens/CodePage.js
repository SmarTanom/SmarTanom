import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../src/services/apiClient';
import theme from '../src/theme';

export default function CodePage({ navigation }) {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const e = await AsyncStorage.getItem('pendingOtpEmail');
      if (e) setEmail(e);
    })();
  }, []);

  const onResend = async () => {
    if (!email) return Alert.alert('No email', 'Email not found to resend code');
    setLoading(true);
    try {
      await authApi.requestOtp(email);
      Alert.alert('Sent', `A new code was sent to ${email}`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Unable to resend code');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!code) {
      Alert.alert('Enter code', 'Please enter the code sent to your email');
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.verifyOtp(email, code);
      // Backend often returns token or auth info; this will attempt to store token in common keys
      const token = resp && (resp.token || resp.auth_token || resp.key || resp.data && resp.data.token);
      if (token) {
        await AsyncStorage.setItem('authToken', token);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return;
      }
      // If no token, still navigate — you may have a different flow (session cookie)
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      Alert.alert('Verification failed', e?.message || 'Unable to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.h1}>Enter the code</Text>
        <Text style={styles.hint}>We sent a one-time code to {email || 'your email'}</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="123456"
          keyboardType="numeric"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.muted}
        />

        <TouchableOpacity style={styles.button} onPress={onVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity onPress={onResend} disabled={loading}>
            <Text style={styles.link}>Resend code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.l },
  header: { paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.s },
  h1: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  hint: { color: theme.colors.muted, marginTop: theme.spacing.s },

  card: { marginTop: theme.spacing.l, backgroundColor: '#fff', padding: theme.spacing.l, borderRadius: theme.radii.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  input: { borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.m, borderRadius: theme.radii.md, marginBottom: theme.spacing.m, fontSize: 20, letterSpacing: 6, textAlign: 'center' },
  button: { backgroundColor: theme.colors.accent, padding: theme.spacing.m, borderRadius: theme.radii.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  row: { alignItems: 'center', marginTop: theme.spacing.m },
  link: { color: theme.colors.primary, fontWeight: '700' }
});
