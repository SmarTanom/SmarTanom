import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import * as SplashScreen from 'expo-splash-screen';

// Import screens
import SplashScreenComponent from './src/screens/SplashScreen';
import LandingScreen from './src/screens/LandingScreen';
import EmailScreen from './src/screens/EmailScreen';
import CodeScreen from './src/screens/CodeScreen';
import UsernameScreen from './src/screens/UsernameScreen';
import HomeScreen from './src/screens/HomeScreen';

// Import providers
import { AuthFlowProvider } from './src/context/AuthFlowContext';

const Stack = createStackNavigator();

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbrilFatface_400Regular,
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#339432" />
      <AuthFlowProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#339432' },
              animationEnabled: true,
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreenComponent} />
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen 
              name="SignInEmail" 
              component={EmailScreen} 
              initialParams={{ mode: 'signin' }}
            />
            <Stack.Screen 
              name="SignUpEmail" 
              component={EmailScreen} 
              initialParams={{ mode: 'signup' }}
            />
            <Stack.Screen 
              name="SignInCode" 
              component={CodeScreen} 
              initialParams={{ mode: 'signin' }}
            />
            <Stack.Screen 
              name="SignUpCode" 
              component={CodeScreen} 
              initialParams={{ mode: 'signup' }}
            />
            <Stack.Screen name="Username" component={UsernameScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthFlowProvider>
    </SafeAreaProvider>
  );
}