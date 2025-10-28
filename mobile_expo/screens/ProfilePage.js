import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../src/theme';

export default function ProfilePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.note}>User information and settings go here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.l, backgroundColor: theme.colors.background },
  heading: { fontSize: theme.fonts.h2, fontWeight: '700', color: theme.colors.text },
  note: { color: theme.colors.muted, marginTop: theme.spacing.s }
});
