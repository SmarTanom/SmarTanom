import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * useResponsive
 * - Provides viewport width/height
 * - Common breakpoints based on web CSS (769px, 1200px, 1600px)
 * - clamp helpers to approximate CSS clamp() and vw-based sizing
 */
export function useResponsive() {
  const getSize = () => Dimensions.get('window');
  const [{ width, height }, setSize] = useState(getSize());

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setSize(getSize()));
    return () => {
      // RN < 0.65 used remove; modern uses .remove()
      // Guard for compatibility
      if (typeof sub?.remove === 'function') sub.remove();
    };
  }, []);

  const isWide = width >= 769;
  const isXL = width >= 1200;
  const is2XL = width >= 1600;

  // CSS-like clamp: clamp(min, preferred, max)
  const clamp = (min, preferred, max) => Math.max(min, Math.min(max, preferred));

  // clamp using vw: e.g. clamp(38, 6.5vw, 72) -> clamp(38, width * 0.065, 72)
  const clampVw = (min, vwPercent, max) => clamp(min, width * (vwPercent / 100), max);

  // padding utility similar to clamp with vw
  const pad = (min, vwPercent, max) => clamp(min, width * (vwPercent / 100), max);

  return useMemo(() => ({
    width,
    height,
    isWide,
    isXL,
    is2XL,
    clamp,
    clampVw,
    pad,
    isWeb: Platform.OS === 'web',
  }), [width, height, isWide, isXL, is2XL]);
}
