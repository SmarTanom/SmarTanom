import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import theme from '../src/theme';

const DATA = [
  { id: '1', text: 'Low reservoir level on Device 1' },
  { id: '2', text: 'New firmware available' }
];

export default function NotificationsPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Notifications</Text>
      <FlatList data={DATA} keyExtractor={i => i.id} renderItem={({item}) => <Text style={styles.item}>{item.text}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.l, backgroundColor: theme.colors.background },
  heading: { fontSize: theme.fonts.h2, fontWeight: '700', marginBottom: theme.spacing.m, color: theme.colors.text },
  item: { paddingVertical: theme.spacing.s, color: theme.colors.text }
});
