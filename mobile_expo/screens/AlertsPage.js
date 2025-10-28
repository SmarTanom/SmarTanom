import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const ALERTS = [
  { id: '1', text: 'Reservoir level critical for Device 1' },
  { id: '2', text: 'Sensor 3 reporting abnormal values' }
];

export default function AlertsPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Alerts</Text>
      <FlatList data={ALERTS} keyExtractor={i => i.id} renderItem={({item}) => <Text style={styles.item}>{item.text}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  item: { paddingVertical: 8, color: '#444' }
});
