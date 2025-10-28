import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminSettings() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin — Settings</Text>
      <Text style={styles.note}>Site-wide configuration and toggles.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700' },
  note: { color: '#666', marginTop: 8 }
});
