import React, { useState, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from "react-native";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
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

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      // Allow login with any credentials or even empty fields
      const result = await login(email, password);

      if (result.success) {
        // Navigation will be handled automatically by AppNavigator based on auth state
        console.log("Login successful, user authenticated");
      } else {
        Alert.alert("Login Failed", result.error || "Please try again");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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

      {/* Welcome Text */}
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>
        Let's get back to growing your SmarTanom, shall we?
      </Text>

      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={24} color="white" style={styles.inputIcon} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.inputField}
            placeholder="Email Address"
            placeholderTextColor="white"
            underlineColorAndroid="transparent"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputUnderline} />
      </View>

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={24} color="white" style={styles.inputIcon} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.inputField}
            placeholder="Password"
            placeholderTextColor="white"
            secureTextEntry={!showPassword}
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="white"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.inputUnderline} />
      </View>

      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot your password?</Text>
      </TouchableOpacity>

      <Text style={styles.or}>Or Login using social media</Text>

      <View style={styles.socialRow}>
        {/* Facebook Login Button */}
        <TouchableOpacity style={styles.socialBtn}>
          <Ionicons name="logo-facebook" size={22} color={Colors.primary} />
          <Text style={styles.socialText}>Facebook</Text>
        </TouchableOpacity>
        {/* Google Login Button */}
        <TouchableOpacity style={styles.socialBtn}>
          <Ionicons name="logo-google" size={22} color={Colors.primary} />
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.registerContainer}>
        <Text style={styles.footer}>New to SmarTanom?</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}> Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#339432', // Solid green as requested
    padding: 20,
    justifyContent: "center",
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
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
    width: 24,
  },
  inputField: {
    flex: 1,
    color: Colors.white,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    height: 30,
    padding: 0,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: 'white',
    marginTop: 5,
  },
  eyeIcon: {
    padding: 5,
  },
  forgot: {
    color: Colors.white,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 40,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  or: {
    color: Colors.white,
    textAlign: "center",
    marginBottom: 15,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  socialBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: "row",
    alignItems: "center",
    width: '48%',
    justifyContent: 'center',
  },
  socialText: {
    marginLeft: 10,
    color: Colors.primary,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  buttonText: {
    color: '#339432',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    color: Colors.white,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
  },
  link: {
    color: Colors.white,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
});
