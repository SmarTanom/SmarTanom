import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import theme from '../src/theme';
import { auth } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoMarkWhite } from '../src/assets';

export default function EmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [digits, setDigits] = useState(Array(6).fill(''));
  const digitRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
    const joined = digits.map(d => (d || '').toString()).join('').replace(/\D/g, '');
    const filledCount = digits.reduce((n, d) => n + (/\d/.test(d) ? 1 : 0), 0);
    if (filledCount !== 6 || joined.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    setStatus('Verifying...');
    try {
      const resp = await auth.verifyOtp(email, joined);
      if (resp?.token) {
        try { await AsyncStorage.setItem('authToken', resp.token); } catch (_) {}
      }
      // After login navigate to Home/Dashboard
      navigation.replace('Home');
    } catch (err) {
      setError(err?.message || 'Invalid or expired code');
      setDigits(Array(6).fill(''));
      // focus first
      setTimeout(() => digitRefs.current[0]?.focus?.(), 100);
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

  // Auto-focus first OTP cell when we enter the code-sent state
  useEffect(() => {
    if (codeSent) {
      setTimeout(() => digitRefs.current[0]?.focus?.(), 120);
    }
  }, [codeSent]);

  function onDigitChange(value, idx) {
    const raw = (value || '').replace(/\D/g, '');
    if (!raw) {
      const next = digits.slice();
      next[idx] = '';
      setDigits(next);
      return;
    }

    // If user pasted or autofilled the entire code into one input, spread it across cells
    if (raw.length > 1) {
      const next = digits.slice();
      for (let i = 0; i < raw.length && (idx + i) < 6; i++) {
        next[idx + i] = raw[i];
      }
      setDigits(next);
      // focus the first empty cell after the pasted sequence
      const firstEmpty = next.findIndex(ch => !ch);
      const focusIdx = firstEmpty === -1 ? 5 : firstEmpty;
      setTimeout(() => digitRefs.current[focusIdx]?.focus?.(), 50);
      return;
    }

    const v = raw.slice(0, 1);
    const next = digits.slice();
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) {
      digitRefs.current[idx + 1]?.focus?.();
    }
    // if after this input all digits are filled, clear any previous error
    const filledNow = next.reduce((n, ch) => n + (/\d/.test(ch) ? 1 : 0), 0);
    if (filledNow === 6) setError('');
  }

  function onKeyPress(e, idx) {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[idx]) {
        // clearing current
        const next = digits.slice();
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        digitRefs.current[idx - 1]?.focus?.();
        const next = digits.slice();
        next[idx - 1] = '';
        setDigits(next);
      }
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
  <Image source={logoMarkWhite} style={styles.logo} resizeMode="contain" />
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
            <View style={styles.otpGroup}>
              {digits.map((d, i) => {
                const filled = !!d;
                const isFocused = focusedIndex === i;
                return (
                  <TextInput
                    key={i}
                    ref={el => digitRefs.current[i] = el}
                    value={d}
                    onChangeText={(v) => onDigitChange(v, i)}
                    onKeyPress={(e) => onKeyPress(e, i)}
                    onFocus={() => setFocusedIndex(i)}
                    onBlur={() => setFocusedIndex(-1)}
                    style={[styles.otpCell, (filled || isFocused) ? styles.otpCellActive : null]}
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    maxLength={1}
                    returnKeyType={i === 5 ? 'done' : 'next'}
                    onSubmitEditing={() => { if (i === 5) handleVerify(); }}
                    textContentType="oneTimeCode"
                    importantForAutofill="yes"
                    autoFocus={i === 0}
                    textAlign='center'
                  />
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading || digits.join('').length !== 6}>
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={[styles.link, { opacity: resendCooldown > 0 ? 0.5 : 1 }]}>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Didn't receive a code? Resend"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setCodeSent(false); setDigits(Array(6).fill('')); setError(''); }}>
              <Text style={styles.link}>← Change email address</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: 'rgba(51,148,50,0.95)' },
  top: { paddingTop: 40, alignItems: 'center', marginBottom: 20 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { color: 'rgba(255,255,255,0.95)', marginTop: 8, textAlign: 'center', maxWidth: 520 },
  card: { marginTop: 20, backgroundColor: '#fff', padding: 18, borderRadius: 12, width: '100%', alignItems: 'center' },
  /* Email input (welcome variant) */
  input: { borderWidth: 1, borderColor: '#016b22', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, fontSize: 16, color: '#222', backgroundColor: '#fff' },
  /* OTP group */
  // OTP group constrained to a max width so it never overflows the white card on small screens
  otpGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12, width: '100%', maxWidth: 340, alignSelf: 'center' },
  otpCell: {
    flex: 1,
    minWidth: 40,
    maxWidth: 64,
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.18)',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#015d1d',
    padding: 0,
    marginHorizontal: 6,
  },
  otpCellActive: {
    borderColor: '#4A9B4D',
    shadowColor: '#4A9B4D',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  /* Submit button — white background, green text to match web */
  button: { backgroundColor: '#ffffff', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8, borderWidth: 0, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 2 },
  buttonText: { color: '#016b22', fontWeight: '800' },
  link: { color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginTop: 8 },
  error: { color: '#ffe2e2', marginBottom: 8, backgroundColor: 'rgba(255, 107, 107, 0.12)', padding: 8, borderRadius: 8 },
  status: { textAlign: 'center', marginTop: 12, color: 'rgba(255,255,255,0.95)' }
});
