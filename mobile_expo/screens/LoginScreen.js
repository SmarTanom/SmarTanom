import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import theme from '../src/theme';
import { logoMarkGreen } from '../src/assets';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Image source={{ uri: logoMarkGreen }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>SmarTanom</Text>
        <Text style={styles.h1}>Manage your plants, simply</Text>
        <Text style={styles.subtitle}>Monitor water, pH and sensor data — setup in minutes.</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EmailPage') }>
          <Text style={styles.buttonText}>Sign in with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.replace('Home')}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Skip / Demo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.l },
  header: { paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.m },
  brand: { color: theme.colors.primary, fontWeight: '800', fontSize: 16 },
  h1: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.s },
  subtitle: { color: theme.colors.muted, marginTop: theme.spacing.s },

  card: { marginTop: theme.spacing.l, backgroundColor: '#fff', padding: theme.spacing.l, borderRadius: theme.radii.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  button: { backgroundColor: theme.colors.accent, padding: theme.spacing.m, borderRadius: theme.radii.md, marginBottom: theme.spacing.s, alignItems: 'center' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderColor: theme.colors.border, borderWidth: 1 },
  secondaryText: { color: theme.colors.text }
});
