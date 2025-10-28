import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const DEVICES = [{ id: '1', name: 'Device 1' }, { id: '2', name: 'Device 2' }];

export default function AdminDevices() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin — Devices</Text>
      <FlatList data={DEVICES} keyExtractor={i => i.id} renderItem={({item}) => <Text style={styles.item}>{item.name}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  item: { paddingVertical: 8 }
});
