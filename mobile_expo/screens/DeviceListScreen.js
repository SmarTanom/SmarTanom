import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import theme from '../src/theme';

const SAMPLE_DEVICES = [
  { id: '1', name: 'Device #1', location: 'East Farm' },
  { id: '2', name: 'Device #2', location: 'West Farm' }
];

export default function DeviceListScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Devices</Text>
      <FlatList
        data={SAMPLE_DEVICES}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('DeviceDetails', { id: item.id })}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.sub}>{item.location}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.l, backgroundColor: theme.colors.background },
  heading: { fontSize: theme.fonts.h2, fontWeight: '700', marginBottom: theme.spacing.m, color: theme.colors.text },
  row: { padding: theme.spacing.m, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.m },
  title: { fontWeight: '700', color: theme.colors.text },
  sub: { color: theme.colors.muted }
});
