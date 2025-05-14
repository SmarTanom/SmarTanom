import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useFonts, Alexandria_700Bold } from '@expo-google-fonts/alexandria';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function WelcomeScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Alexandria_700Bold,
    AbrilFatface_400Regular,
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/smartanom.png')}
          style={styles.logo}
        />
        <Text style={styles.logoText}>SMARTANOM</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Welcome to SmarTanom</Text>
        <Text style={styles.subtitle}>
          From sensors to sunshine, everything your hydroponic plant needs is here.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#339432', // SmarTanom brand green
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(6, 73, 44, 0.2)', // Darker green with opacity
    bottom: -100,
    right: -100,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6, 73, 44, 0.15)', // Darker green with opacity
    bottom: 50,
    right: -50,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginLeft: 20,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  logoText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: 'Alexandria_700Bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    color: Colors.white,
    fontFamily: 'AbrilFatface_400Regular',
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.white,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 30,
    textAlign: 'justify',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  registerButton: {
    backgroundColor: Colors.white,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  loginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
});
