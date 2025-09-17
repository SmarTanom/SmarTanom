// Expo entry app that loads Montserrat fonts and renders navigation shell
import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#339432" />
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  // TODO: Replace with NavigationContainer + screens once implemented
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* App navigation + screens will mount here */}
      {/* Fonts loaded globally, use fontFamily: 'Montserrat_400Regular' etc in styles */}
      <StatusBar barStyle="dark-content" />
    </View>
  );
}
