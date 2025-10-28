import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import theme from '../src/theme';

export default function SettingsScreen() {
  // Simple placeholder for settings. Replace with real toggles and API hooks.
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Enable notifications</Text>
        <Switch value={true} onValueChange={() => {}} />
      </View>
      <Text style={styles.note}>Profile, account, and application settings go here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.l, backgroundColor: theme.colors.background },
  heading: { fontSize: theme.fonts.h2, fontWeight: '700', marginBottom: theme.spacing.m, color: theme.colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.m },
  label: { fontSize: theme.fonts.body, color: theme.colors.text },
  note: { color: theme.colors.muted, marginTop: theme.spacing.m }
});
