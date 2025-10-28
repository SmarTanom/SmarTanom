import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import theme from '../src/theme';
import { auth } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoMarkWhite } from '../src/assets';

export default function EmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function isValidEmail(v) { return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v); }

  async function handleSendCode() {
    setError('');
    const trimmed = (email || '').trim();
    if (!trimmed) { setError('Email required'); inputRef.current?.focus(); return; }
    if (!isValidEmail(trimmed)) { setError('Enter a valid email'); inputRef.current?.focus(); return; }
    setLoading(true);
    try {
      const purpose = 'login';
      const resp = await auth.requestOtp(trimmed, purpose);
      setCodeSent(true);
      setStatus('Code sent. Check your email.');
      setResendCooldown(30);
    } catch (err) {
      setError(err?.message || 'Could not send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    setStatus('Verifying...');
    try {
      const resp = await auth.verifyOtp(email, code);
      if (resp?.token) {
        try { await AsyncStorage.setItem('authToken', resp.token); } catch (_) {}
      }
      // After login navigate to Home/Dashboard
      navigation.replace('Home');
    } catch (err) {
      setError(err?.message || 'Invalid or expired code');
      setCode('');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      await auth.requestOtp(email, 'login');
      setStatus('Code resent');
      setResendCooldown(30);
    } catch (err) {
      setError(err?.message || 'Could not resend');
      setResendCooldown(10);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Image source={{ uri: logoMarkWhite }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{codeSent ? 'Verify Your Identity' : 'Sign in'}</Text>
        <Text style={styles.subtitle}>{codeSent ? `Enter the 6-digit code sent to ${email}` : 'Enter your email to receive a verification code'}</Text>
      </View>

      <View style={styles.card}>
        {!codeSent && (
          <>
            <TextInput ref={inputRef} style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
            </TouchableOpacity>
          </>
        )}

        {codeSent && (
          <>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="123456" keyboardType="numeric" maxLength={6} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading || code.length !== 6}>
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={[styles.link, { opacity: resendCooldown > 0 ? 0.5 : 1 }]}>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Didn't receive a code? Resend"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setCodeSent(false); setCode(''); setError(''); }}>
              <Text style={styles.link}>Change email address</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: theme.colors.background },
  top: { paddingTop: 40, alignItems: 'center', marginBottom: 20 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  subtitle: { color: theme.colors.muted, marginTop: 8, textAlign: 'center' },
  card: { marginTop: 20, backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, padding: 10, marginBottom: 12 },
  button: { backgroundColor: theme.colors.accent, padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: theme.colors.primary, textAlign: 'center', marginTop: 8 },
  error: { color: '#c00', marginBottom: 8 },
  status: { textAlign: 'center', marginTop: 12, color: theme.colors.muted }
});
