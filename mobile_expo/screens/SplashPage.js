import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SplashPage({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('LandingPage'), 1200);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmarTanom</Text>
      <Text style={styles.subtitle}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 34, fontWeight: '800' },
  subtitle: { marginTop: 12, color: '#666' }
});
