import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import theme from '../src/theme';

export default function Dashboard() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.note}>This is the main dashboard page converted from the Vite web app.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview cards / charts</Text>
        <Text style={styles.sectionNote}>Replace with charts (react-native-chart-kit / victory-native) and cards.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.l, backgroundColor: theme.colors.background, flexGrow: 1 },
  heading: { fontSize: theme.fonts.h1, fontWeight: '700', marginBottom: theme.spacing.s, color: theme.colors.text },
  note: { color: theme.colors.muted, marginBottom: theme.spacing.m },
  section: { padding: theme.spacing.m, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md },
  sectionTitle: { fontWeight: '700', color: theme.colors.text },
  sectionNote: { color: theme.colors.muted }
});
