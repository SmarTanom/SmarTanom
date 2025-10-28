import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { authApi } from '../src/services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../src/theme';

export default function EmailPage({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onRequestOtp = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authApi.requestOtp(email);
      // Save email for verification step
      await AsyncStorage.setItem('pendingOtpEmail', email);
      navigation.navigate('CodePage');
    } catch (e) {
      Alert.alert('Request failed', e?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Text style={styles.welcome}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Enter your email address to receive a verification code to login.</Text>

        <View style={styles.inputWrap}>
          <View style={styles.inputLeft}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <TouchableOpacity style={styles.cta} onPress={onRequestOtp} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.ctaText}>Send Verification Code</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>We'll send a secure code to verify your identity.</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, backgroundColor: theme.colors.primary, padding: theme.spacing.l },
  heroInner: { paddingTop: theme.spacing.xl },
  welcome: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: theme.spacing.m },
  subtitle: { color: 'rgba(255,255,255,0.95)', marginBottom: theme.spacing.l, width: '85%', lineHeight: 20 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginBottom: theme.spacing.l, height: 56 },
  inputLeft: { width: 36, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  input: { flex: 1, paddingVertical: 0, color: '#222' },

  cta: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.l, elevation: 2 },
  ctaText: { color: theme.colors.primary, fontWeight: '800', fontSize: 16 },

  note: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: theme.spacing.s }
});
