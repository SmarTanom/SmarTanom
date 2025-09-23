import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

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

export const Brand = ({ showText = true, variant = 'white', size }) => {
  // Match web CSS in AuthUsernamePage.css:
  // .brand-logo-img { width: clamp(30px, 3vw, 48px) }
  // .auth-brand-wordmark { font-size: clamp(14px, 1.5vw, 22px); on >=769px: clamp(16px, 1.8vw, 24px) }
  // .auth-brand { gap: clamp(0.75rem, 1.2vw, 1.2rem) } -> 12px .. 19.2px
  const { width, clamp, clampVw, isWide } = useResponsive();

  // If a fixed size prop is passed, honor it for the logo only; otherwise follow web clamp
  const logoSize = typeof size === 'number' && size > 0
    ? size
    : clampVw(30, 3, 48);

  const wordmarkSize = isWide
    ? clampVw(16, 1.8, 24)
    : clampVw(14, 1.5, 22);

  // Approximate letter-spacing: web uses 0.07em; convert to px by multiplying font size
  const letterSpacingPx = Math.round(wordmarkSize * 0.07 * 10) / 10;

  // Gap between logo and wordmark: clamp(12px, 1.2vw, 19.2px)
  const gap = clamp(12, width * 0.012, 19.2);

  return (
    <View style={[styles.container, { gap }] }>
      <BrandMark variant={variant} size={logoSize} />
      {showText && (
        <Text
          style={[
            styles.brandText,
            {
              color: variant === 'white' ? '#ffffff' : '#339432',
              fontSize: wordmarkSize,
              letterSpacing: letterSpacingPx,
            },
          ]}
        >
          SMARTANOM
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
});

export default BrandMark;