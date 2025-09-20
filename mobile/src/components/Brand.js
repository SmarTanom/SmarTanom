import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BrandMark = ({ variant = 'white', size = 40 }) => {
  const color = variant === 'white' ? '#ffffff' : '#339432';
  
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {/* SmarTanom logo paths - simplified hydroponic leaf design */}
      <Path
        d="M20 4C26.627 4 32 9.373 32 16C32 22.627 26.627 28 20 28C13.373 28 8 22.627 8 16C8 9.373 13.373 4 20 4Z"
        fill={color}
        fillOpacity={0.9}
      />
      <Path
        d="M20 8C24.418 8 28 11.582 28 16C28 20.418 24.418 24 20 24C15.582 24 12 20.418 12 16C12 11.582 15.582 8 20 8Z"
        fill={color}
        fillOpacity={0.7}
      />
      <Path
        d="M20 12C22.209 12 24 13.791 24 16C24 18.209 22.209 20 20 20C17.791 20 16 18.209 16 16C16 13.791 17.791 12 20 12Z"
        fill={color}
      />
      {/* Stem */}
      <Path
        d="M20 28L20 36"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
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