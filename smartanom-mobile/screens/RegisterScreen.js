import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [fontsLoaded] = useFonts({
    AbrilFatface_400Regular,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const registerUser = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    // Simulate a delay to make it feel like it's processing
    setTimeout(() => {
      setIsLoading(false);

      // Store user data in AsyncStorage for demo purposes
      try {
        AsyncStorage.setItem('user_data', JSON.stringify({
          name: name,
          email: email,
          contact: contact
        }));

        // Navigate to the username setup screen
        navigation.navigate("UsernameSetup");
      } catch (error) {
        console.error("Storage Error:", error);
        Alert.alert(
          "Error",
          "Failed to save user data. Please try again."
        );
      }
    }, 1500);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>SMARTANOM</Text>
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>Register on SmarTanom</Text>
        <Text style={styles.subtitle}>Create a SmarTanom account, we can't wait to have you.</Text>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={24} color="white" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name*"
              placeholderTextColor="white"
              style={styles.input}
              value={name}
              onChangeText={setName}
              underlineColorAndroid="transparent"
            />
          </View>
          <View style={styles.inputUnderline} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={24} color="white" style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address*"
              placeholderTextColor="white"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              underlineColorAndroid="transparent"
            />
          </View>
          <View style={styles.inputUnderline} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={24} color="white" style={styles.inputIcon} />
            <TextInput
              placeholder="Contact Number"
              placeholderTextColor="white"
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              underlineColorAndroid="transparent"
            />
          </View>
          <View style={styles.inputUnderline} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={24} color="white" style={styles.inputIcon} />
            <TextInput
              placeholder="Password*"
              placeholderTextColor="white"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              underlineColorAndroid="transparent"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="white"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.inputUnderline} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={24} color="white" style={styles.inputIcon} />
            <TextInput
              placeholder="Confirm Password*"
              placeholderTextColor="white"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              underlineColorAndroid="transparent"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="white"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.inputUnderline} />
        </View>

        {/* Social Media Section */}
        <Text style={styles.or}>Or Register using social media</Text>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-facebook" size={22} color={Colors.primary} />
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-google" size={22} color={Colors.primary} />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.disabledButton]}
          onPress={registerUser}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}> Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
    marginTop: -40, // Match LoginScreen
  },
  logo: {
    width: 30, // Match LoginScreen
    height: 30, // Match LoginScreen
    tintColor: 'white',
  },
  logoText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10, // Match LoginScreen
    fontFamily: 'Montserrat_700Bold',
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    marginBottom: 10,
    fontFamily: 'AbrilFatface_400Regular', // Using Abril Fatface as specified
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 40,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 22,
    opacity: 0.9,
  },
  inputContainer: {
    marginBottom: 25, // Match LoginScreen
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputUnderline: {
    height: 1,
    backgroundColor: 'white', // Match LoginScreen - solid white
    marginTop: 5,
  },
  inputIcon: {
    marginRight: 10, // Match LoginScreen
    width: 24, // Match LoginScreen
  },
  eyeIcon: {
    padding: 5, // Match LoginScreen
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    height: 30,
    padding: 0,
  },
  or: {
    color: Colors.white,
    textAlign: 'center', // Match LoginScreen
    marginBottom: 15, // Match LoginScreen
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16, // Match LoginScreen
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  socialBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Match LoginScreen
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Match LoginScreen
    flexDirection: "row",
    alignItems: "center",
    width: '48%',
    justifyContent: 'center',
  },
  socialText: {
    marginLeft: 10, // Match LoginScreen
    color: Colors.primary,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8, // Match LoginScreen
    alignItems: 'center',
    marginBottom: 20, // Match LoginScreen
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  registerButtonText: {
    color: '#339432', // Match LoginScreen - direct color value
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  footerContainer: {
    flexDirection: 'row', // Match LoginScreen
    justifyContent: 'center', // Match LoginScreen
    alignItems: 'center', // Match LoginScreen
  },
  footerText: {
    color: Colors.white,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  loginLink: {
    color: Colors.white,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
});