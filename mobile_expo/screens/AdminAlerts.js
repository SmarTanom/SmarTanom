import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const ALERTS = [{ id: '1', text: 'Alert A' }, { id: '2', text: 'Alert B' }];

export default function AdminAlerts() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin — Alerts</Text>
      <FlatList data={ALERTS} keyExtractor={i => i.id} renderItem={({item}) => <Text style={styles.item}>{item.text}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  item: { paddingVertical: 8 }
});
