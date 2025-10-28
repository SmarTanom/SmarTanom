import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigation from './navigation';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import theme from './src/theme';

export default function App() {
  // load Ionicons + app fonts so icons and typography render immediately
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    AbrilFatface_400Regular,
    Montserrat_400Regular,
    Montserrat_600SemiBold
  });

  if (!fontsLoaded) {
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
