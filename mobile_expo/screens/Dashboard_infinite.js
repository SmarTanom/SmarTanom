import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardInfinite() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Dashboard (Infinite)</Text>
      <Text style={styles.note}>A variation of dashboard with infinite/dynamic loading. Implement FlatList with onEndReached for lists.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flex: 1 },
  heading: { fontSize: 22, fontWeight: '700' },
  note: { color: '#666', marginTop: 8 }
});
