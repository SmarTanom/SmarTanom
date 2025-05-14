import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

export default function UsernameSetupScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updateUserProfile } = useContext(AuthContext) || {};

  const [fontsLoaded] = useFonts({
    AbrilFatface_400Regular,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      // Save username to AsyncStorage
      await AsyncStorage.setItem('username', username);
      
      // Update user profile if context method exists
      if (updateUserProfile) {
        await updateUserProfile({ username });
      }

      // Navigate to the setup screen
      navigation.navigate('Setup');
    } catch (error) {
      console.error('Error saving username:', error);
      Alert.alert(
        'Error',
        'Failed to save your username. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/smartanom.png')}
          style={styles.logo}
          resizeMode="contain"
          tintColor="white"
        />
        <Text style={styles.logoText}>SMARTANOM</Text>
      </View>

      {/* Title and Subtitle */}
      <Text style={styles.title}>Let's personalize your experience</Text>
      <Text style={styles.subtitle}>
        What can we call you? Could be your name or a nickname.
      </Text>

      {/* Username Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={24} color="white" style={styles.inputIcon} />
          <TextInput
            placeholder="Name"
            placeholderTextColor="white"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            underlineColorAndroid="transparent"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputUnderline} />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, isLoading && styles.disabledButton]}
        onPress={handleContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.continueButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#339432', // Match LoginScreen - solid green
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: -40,
  },
  logo: {
    width: 30,
    height: 30,
    tintColor: 'white',
  },
  logoText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    marginBottom: 10,
    fontFamily: 'AbrilFatface_400Regular',
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 40,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputUnderline: {
    height: 1,
    backgroundColor: 'white',
    marginTop: 5,
  },
  inputIcon: {
    marginRight: 10,
    width: 24,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    height: 30,
    padding: 0,
  },
  continueButton: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  continueButtonText: {
    color: '#339432',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
});
