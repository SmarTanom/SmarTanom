import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function DashboardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.blurb}>Overview of devices and recent sensor readings (sample).</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DeviceDetail', { id: 1 })}>
        <Text style={styles.cardTitle}>Device #1</Text>
        <Text style={styles.cardSubtitle}>Reservoir: East Farm — Last reading: 12:34</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  blurb: { color: '#666', marginBottom: 16 },
  card: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  cardTitle: { fontWeight: '700' },
  cardSubtitle: { color: '#666', marginTop: 4 }
});
