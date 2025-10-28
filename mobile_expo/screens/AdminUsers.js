import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const USERS = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];

export default function AdminUsers() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin — Users</Text>
      <FlatList data={USERS} keyExtractor={i => i.id} renderItem={({item}) => <Text style={styles.item}>{item.name}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  item: { paddingVertical: 8 }
});
