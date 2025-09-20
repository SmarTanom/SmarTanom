import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const sources = {
  white: require('../../assets/images/logo-mark-white.png'),
  green: require('../../assets/images/logo-mark-green.png'),
};

const BrandMark = ({ variant = 'white', size = 40 }) => {
  const src = variant === 'white' ? sources.white : sources.green;
  return (
    <Image
      source={src}
      style={{ width: size, height: size, resizeMode: 'contain' }}
      accessibilityIgnoresInvertColors
    />
  );
};

export const Brand = ({ showText = true, variant = 'white', size = 40 }) => (
  <View style={styles.container}>
    <BrandMark variant={variant} size={size} />
    {showText && (
      <Text style={[styles.brandText, { color: variant === 'white' ? '#ffffff' : '#339432' }]}>
        SMARTANOM
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
});

export default BrandMark;