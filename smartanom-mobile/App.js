import React from 'react';
import { NavigationContainer } from '@react-navigation/native';  // Import NavigationContainer
import AppNavigator from './navigation/AppNavigator'; // Your AppNavigator
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { DeviceImageProvider } from './context/DeviceImageContext'; // Import DeviceImageProvider

export default function App() {
  return (
    <AuthProvider>  {/* Wrap the app with AuthProvider */}
      <DeviceImageProvider> {/* Wrap with DeviceImageProvider */}
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </DeviceImageProvider>
    </AuthProvider>
  );
}
