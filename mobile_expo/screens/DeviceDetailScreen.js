import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DeviceDetailScreen({ route }) {
  const { id } = route.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Device Detail</Text>
      <Text style={styles.label}>Device ID: {id}</Text>
      <Text style={styles.paragraph}>Here you would show sensor data, graphs, and actions (calibrate, alerts).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 16, marginBottom: 12 },
  paragraph: { color: '#666' }
});
