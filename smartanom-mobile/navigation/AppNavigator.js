import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, Platform } from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium } from '@expo-google-fonts/montserrat';

// Auth Screens
import LaunchScreen from '../screens/LaunchScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PersonalizeScreen from '../screens/PersonalizeScreen';
import SetupScreen from '../screens/SetupScreen';
import LoginScreen from '../screens/LoginScreen';

import Notification from '../screens/NotificationScreen';

// Main App Screens
import DashboardScreen from '../screens/DashboardScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import Colors
import Colors from '../constants/Colors';

// Create the bottom tab navigator
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Tanom') {
            return <View><MaterialCommunityIcons name="sprout" size={size} color={color} /></View>;
          } else if (route.name === 'Alerts') {
            const iconName = focused ? 'notifications' : 'notifications-outline';
            return <View><Ionicons name={iconName} size={size} color={color} /></View>;
          } else if (route.name === 'Profile') {
            const iconName = focused ? 'person' : 'person-outline';
            return <View><Ionicons name={iconName} size={size} color={color} /></View>;
          }
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.darkGray,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
          fontFamily: 'Montserrat_400Regular',
        },
        tabBarLabel: ({ focused, color, children }) => (
          <Text style={{
            color: color,
            fontSize: 12,
            marginTop: 2,
            fontFamily: focused ? 'Montserrat_500Medium' : 'Montserrat_400Regular',
          }}>
            {children}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Tanom" component={DashboardScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Create the main stack navigator
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
      <Stack.Screen name="MainApp" component={MainTabNavigator} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
      <Stack.Screen name="NotificationScreen" component={Notification} />
      <Stack.Screen name="PrivacyandSecurityScreen" component={require('../screens/PrivacyandSecurityScreen').default} />
    </Stack.Navigator>
  );
}


