import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BrandMark from '../components/Brand';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current; // 0..1 loop, drives subtle pulse
  const { width } = useWindowDimensions();
  // Make logo much bigger on phones, with a sane cap for tablets
  const logoSize = Math.max(140, Math.min(width * 0.5, 260));

  useEffect(() => {
    // Animate entrance (fade + spring-in)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 140,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle breathing/pulse while waiting
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    breathe.start();

    // Navigate to landing after delay
    const timer = setTimeout(() => {
      navigation.replace('Landing');
    }, 2500);

    return () => {
      clearTimeout(timer);
      breathe.stop();
    };
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
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { scale: Animated.multiply(
                  scaleAnim,
                  breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })
                ) },
            ],
          }}
        >
          <BrandMark variant="white" size={logoSize} />
        </Animated.View>
        <Text style={styles.title}>SmarTanom</Text>
        <Text style={styles.subtitle}>Smart Hydroponic Monitoring</Text>
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