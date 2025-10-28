import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PrivacySecurityPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Privacy & Security</Text>
      <Text style={styles.note}>Show privacy settings and security options here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700' },
  note: { color: '#666', marginTop: 8 }
});
