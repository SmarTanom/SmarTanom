import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BrandMark from '../components/Brand';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to landing after delay
    const timer = setTimeout(() => {
      navigation.replace('Landing');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#2d7d32', '#339432', '#43a047']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <BrandMark variant="white" size={80} />
        <Text style={styles.title}>SmarTanom</Text>
        <Text style={styles.subtitle}>Hydroponic Intelligence</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 48,
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;