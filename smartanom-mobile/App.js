import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { DeviceImageProvider } from './context/DeviceImageContext';
import { AppSettingsProvider } from './context/AppSettingsContext';

export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <DeviceImageProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </DeviceImageProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
