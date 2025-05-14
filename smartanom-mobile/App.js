import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { DeviceImageProvider } from './context/DeviceImageContext';
import { AppSettingsProvider } from './context/AppSettingsContext'; // ✅ Add this

export default function App() {
  return (
    <AuthProvider>
      <DeviceImageProvider>
        <AppSettingsProvider> {/* ✅ Wrap settings context here */}
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AppSettingsProvider>
      </DeviceImageProvider>
    </AuthProvider>
  );
}
