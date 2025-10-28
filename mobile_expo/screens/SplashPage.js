import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import theme from '../src/theme';
import { splashLogo } from '../src/assets';

export default function SplashPage({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('LandingPage'), 1200);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={splashLogo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  logo: { width: 160, height: 160, marginBottom: 12 },
  title: { fontSize: 34, fontWeight: '800', color: '#fff' },
  subtitle: { marginTop: 12, color: 'rgba(255,255,255,0.9)' }
});
