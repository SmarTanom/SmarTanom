import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function StartCyclePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Start Cycle</Text>
      <Text style={styles.note}>Trigger an irrigation/cycle for a device or reservoir.</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  note: { color: '#666', marginBottom: 12 },
  button: { backgroundColor: '#0b6efd', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }
});
