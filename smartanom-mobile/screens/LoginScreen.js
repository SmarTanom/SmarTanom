import React, { useState, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import InputField from "../components/InputField";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainApp" }],
        });
      } else {
        Alert.alert("Login Failed", result.error || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert(
        "Error", 
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>
        Let's get back to growing your SmarTanom, shall we?
      </Text>

      <InputField
        placeholder="Email Address*"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField
        placeholder="Password*"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot your password?</Text>
      </TouchableOpacity>

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

      <Text style={styles.footer}>
        New to SmarTanom?{" "}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate("Register")}
        >
          Register
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 20,
  },
  forgot: {
    color: Colors.white,
    textAlign: "right",
    marginBottom: 10,
    textDecorationLine: "underline",
  },
  button: {
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  buttonText: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  footer: {
    color: Colors.white,
    marginTop: 15,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
});