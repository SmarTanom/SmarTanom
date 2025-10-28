import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigation from './navigation';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import theme from './src/theme';

export default function App() {
  // load Ionicons font so tab icons (and any vector icons) can render immediately
  const [iconsLoaded] = useFonts(Ionicons.font || {});

  if (!iconsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors?.primary || '#2a9d8f'} />
      </View>
    );
  }

  return (
    <>
      <AppNavigation />
      <StatusBar style="auto" />
    </>
  );
}
