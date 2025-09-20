import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { Asset } from 'expo-asset';

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

// Enable native screens for better performance and smoother transitions
enableScreens(true);

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbrilFatface_400Regular,
  });
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);

  // Preload heavy images to avoid flicker when screens mount
  React.useEffect(() => {
    async function preloadAssets() {
      try {
        const images = [
          require('./assets/images/landingpage_img.png'),
          require('./assets/images/logo-mark-white.png'),
          require('./assets/images/logo-mark-green.png'),
        ];
        const tasks = images.map((img) => Asset.fromModule(img).downloadAsync());
        await Promise.all(tasks);
      } catch (e) {
        // Non-fatal; continue even if asset preloading fails
      } finally {
        setAssetsLoaded(true);
      }
    }
    preloadAssets();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded && assetsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsLoaded]);

  if (!fontsLoaded || !assetsLoaded) {
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
              // Keep cards transparent so shared background/gradients don't flash
              cardStyle: { backgroundColor: 'transparent' },
              sceneContainerStyle: { backgroundColor: 'transparent' },
              animationEnabled: true,
              // Use a smooth cross-fade between screens
              cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
              animationTypeForReplace: 'push',
              gestureEnabled: true,
              detachPreviousScreen: false,
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