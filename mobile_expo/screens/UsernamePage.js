import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import theme from '../src/theme';

export default function UsernamePage({ navigation }) {
  const [username, setUsername] = useState('');

  const onContinue = () => {
    if (!username) return Alert.alert('Choose username', 'Please enter a username');
    // continue signup flow
    navigation.navigate('AddDevicePage');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Choose a username</Text>
      <Text style={styles.subtitle}>This will be visible in the app when sharing devices or alerts.</Text>

      <View style={styles.card}>
        <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.primary, padding: theme.spacing.l },
  h1: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: theme.spacing.xl },
  subtitle: { color: 'rgba(255,255,255,0.95)', marginTop: theme.spacing.s },
  card: { marginTop: theme.spacing.l, backgroundColor: '#fff', padding: theme.spacing.l, borderRadius: theme.radii.lg },
  input: { borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.m, borderRadius: theme.radii.md, marginBottom: theme.spacing.m },
  button: { backgroundColor: theme.colors.accent, padding: theme.spacing.m, borderRadius: theme.radii.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' }
});
