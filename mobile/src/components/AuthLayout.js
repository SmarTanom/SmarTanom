import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';
import { Brand } from './Brand';

/**
 * AuthLayout
 * - Replicates web two-column layout used by Landing/Auth pages
 * - Left: content; Right: hydroponic visual panel (>=769px)
 * - Provides consistent padding and background gradient
 */
export function AuthLayout({ children, headerLeft, headerRight, showImagePanel = true }) {
  const { isWide, pad, width } = useResponsive();

  return (
    <LinearGradient colors={['#2d7d32', '#339432', '#43a047']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.grid, isWide && styles.gridWide]}>
          <View style={[styles.contentWrapper, { paddingHorizontal: pad(16, 4, 48) }]}> 
            <View style={styles.topBar}>
              <View style={styles.headerLeft}>{headerLeft}</View>
              <View style={styles.brandWrap}>
                {headerRight || (<Brand showText={true} variant="white" size={isWide ? 40 : 32} />)}
              </View>
            </View>
            <View style={styles.content}>{children}</View>
          </View>

          {isWide && showImagePanel && (
            <ImageBackground
              source={require('../../assets/images/landingpage_img.png')}
              defaultSource={require('../../assets/images/landingpage_img.png')}
              style={styles.imagePanel}
              imageStyle={styles.imageStyle}
              resizeMode="cover"
              fadeDuration={0}
              accessibilityIgnoresInvertColors
              importantForAccessibility="no-hide-descendants"
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  grid: { flex: 1 },
  gridWide: { flexDirection: 'row' },
  contentWrapper: {
    flex: 1,
    paddingVertical: 24,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  brandWrap: {},
  content: { flex: 1, justifyContent: 'center' },
  imagePanel: { flex: 1, height: '100%' },
  imageStyle: { resizeMode: 'cover' },
});
