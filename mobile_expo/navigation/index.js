import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth / entry
import LoginScreen from '../screens/LoginScreen';
import SplashPage from '../screens/SplashPage';
import LandingPage from '../screens/LandingPage';

// Main app pages (from frontend)
import Dashboard from '../screens/Dashboard';
import Dashboard_infinite from '../screens/Dashboard_infinite';
import DeviceListScreen from '../screens/DeviceListScreen';
import DeviceDetails from '../screens/DeviceDetails';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import NotificationsPage from '../screens/NotificationsPage';
import ProfilePage from '../screens/ProfilePage';
import SettingsScreen from '../screens/SettingsScreen';

// Auth flow pages
import EmailPage from '../screens/EmailPage';
import CodePage from '../screens/CodePage';
import UsernamePage from '../screens/UsernamePage';
import SignupSetup from '../screens/SignupSetup';

// Other pages
import AlertsPage from '../screens/AlertsPage';
import AddDevicePage from '../screens/AddDevicePage';
import WiFiSetup from '../screens/WiFiSetup';
import StartCyclePage from '../screens/StartCyclePage';

// Admin
import AdminDashboard from '../screens/AdminDashboard';
import AdminUsers from '../screens/AdminUsers';
import AdminSettings from '../screens/AdminSettings';
import AdminDevices from '../screens/AdminDevices';
import AdminCreate from '../screens/AdminCreate';
import AdminAlerts from '../screens/AdminAlerts';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Dashboard">
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Devices" component={DeviceListScreen} />
      <Tab.Screen name="Notifications" component={NotificationsPage} />
      <Tab.Screen name="Profile" component={ProfilePage} />
    </Tab.Navigator>
  );
}

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        {/* entry screens */}
        <Stack.Screen name="Splash" component={SplashPage} options={{ headerShown: false }} />
        <Stack.Screen name="LandingPage" component={LandingPage} options={{ title: 'Welcome' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

        {/* auth flow */}
        <Stack.Screen name="EmailPage" component={EmailPage} options={{ title: 'Email' }} />
        <Stack.Screen name="CodePage" component={CodePage} options={{ title: 'Enter code' }} />
        <Stack.Screen name="UsernamePage" component={UsernamePage} options={{ title: 'Username' }} />
        <Stack.Screen name="SignupSetup" component={SignupSetup} options={{ title: 'Signup' }} />

        {/* main app */}
        <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard_infinite" component={Dashboard_infinite} options={{ title: 'Dashboard (Infinite)' }} />
        <Stack.Screen name="DeviceDetails" component={DeviceDetails} options={{ title: 'Device Details' }} />
        <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Device' }} />
        <Stack.Screen name="AddDevice" component={AddDevicePage} options={{ title: 'Add Device' }} />
        <Stack.Screen name="WiFiSetup" component={WiFiSetup} options={{ title: 'WiFi Setup' }} />
        <Stack.Screen name="StartCycle" component={StartCyclePage} options={{ title: 'Start Cycle' }} />
        <Stack.Screen name="Alerts" component={AlertsPage} options={{ title: 'Alerts' }} />

        {/* settings & admin */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin' }} />
        <Stack.Screen name="AdminUsers" component={AdminUsers} options={{ title: 'Admin — Users' }} />
        <Stack.Screen name="AdminDevices" component={AdminDevices} options={{ title: 'Admin — Devices' }} />
        <Stack.Screen name="AdminSettings" component={AdminSettings} options={{ title: 'Admin — Settings' }} />
        <Stack.Screen name="AdminCreate" component={AdminCreate} options={{ title: 'Admin — Create' }} />
        <Stack.Screen name="AdminAlerts" component={AdminAlerts} options={{ title: 'Admin — Alerts' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
