import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../src/theme';

export default function LandingPage({ navigation }) {
  return (
    <View style={styles.root}>
      {/* Decorative arcs (approximation) */}
      <View style={styles.arcTop} />
      <View style={styles.arcBottom} />

      {/* Header with small brand mark and wordmark */}
      <View style={styles.header}>
        <View style={styles.brandMark} />
        <Text style={styles.wordmark}>SMARTANOM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Welcome to SmarTanom</Text>
          <Text style={styles.tagline}>Watch every drop, every ray, every moment, with complete hydroponic monitoring at your fingertips.</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('EmailPage')}>
              <Text style={styles.primaryBtnText}>Login with Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('SignupSetup')}>
              <Text style={styles.outlineBtnText}>Register New Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    position: 'relative'
  },
  arcTop: {
    position: 'absolute',
    width: '180%',
    height: '140%',
    top: -160,
    left: -120,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 500,
    transform: [{ rotate: '15deg' }]
  },
  arcBottom: {
    position: 'absolute',
    width: '200%',
    height: '160%',
    bottom: -180,
    right: -140,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 600
  },
  header: {
    position: 'absolute',
    top: 36,
    left: 20,
    right: 20,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fff',
    opacity: 0.95
  },
  wordmark: {
    marginLeft: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 3
  },
  container: {
    paddingTop: 140,
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.l,
    flexGrow: 1
  },
  hero: {
    maxWidth: 520
  },
  title: {
    color: '#fff',
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '700',
    marginBottom: theme.spacing.m
  },
  tagline: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: theme.spacing.l
  },
  actions: {
    flexDirection: 'column',
    gap: theme.spacing.s
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginBottom: theme.spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4
  },
  primaryBtnText: { color: '#016b22', fontWeight: '800', textAlign: 'center' },
  outlineBtn: {
    borderColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  outlineBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' }
});
