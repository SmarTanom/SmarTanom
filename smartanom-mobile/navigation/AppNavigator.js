import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LaunchScreen from '../screens/LaunchScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PersonalizeScreen from '../screens/PersonalizeScreen';
import SetupScreen from '../screens/SetupScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Launch" component={LaunchScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Personalize" component={PersonalizeScreen} />
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
