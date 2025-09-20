import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { useResponsive } from '../hooks/useResponsive';

const LandingScreen = ({ navigation }) => {
  const { width, clampVw, isXL, is2XL } = useResponsive();

  return (
    <AuthLayout>
      <View style={styles.heroWrap}>
        <Text
          style={[
            styles.title,
            {
              fontSize: clampVw(38, 6.5, 72),
              lineHeight: clampVw(42, 7.2, 82),
            },
          ]}
        >
          Welcome to SmarTanom
        </Text>
        <Text
          style={[
            styles.tagline,
            { fontSize: clampVw(15, 1.8, 20), maxWidth: 520 },
          ]}
        >
          Watch every drop, every ray, every moment, with complete hydroponic monitoring at your fingertips.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('SignInEmail')}
            activeOpacity={0.92}
          >
            <Text style={styles.primaryBtnText}>Login with Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('SignUpEmail')}
            activeOpacity={0.92}
          >
            <Text style={styles.outlineBtnText}>Register New Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  heroWrap: {
    gap: 18,
    maxWidth: 700,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 24,
  },
  actions: {
    gap: 14,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#016b22',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

export default LandingScreen;