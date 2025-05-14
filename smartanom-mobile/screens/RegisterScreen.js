import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import InputField from '../components/InputField';
import Colors from '../constants/Colors';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      const response = await fetch("http://10.0.2.2:8000/api/accounts/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          contact: contact,
          password: password,
          password2: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Registration failed");
      }

      Alert.alert(
        "Success",
        "Registration successful! Please check your email to activate your account.",
        [
          { 
            text: "OK", 
            onPress: () => navigation.navigate("Login") 
          }
        ]
      );
    } catch (error) {
      console.error("Registration Error:", error);
      Alert.alert(
        "Registration Error",
        error.message || "Failed to register. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register on SmarTanom</Text>
      <Text style={styles.subtitle}>Create an account to get started.</Text>

      <InputField 
        placeholder="Full Name*" 
        value={name} 
        onChangeText={setName} 
      />
      <InputField 
        placeholder="Email Address*" 
        value={email} 
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField 
        placeholder="Contact Number" 
        value={contact} 
        onChangeText={setContact} 
        keyboardType="phone-pad"
      />
      <InputField 
        placeholder="Password*" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword}
      />
      <InputField 
        placeholder="Confirm Password*" 
        secureTextEntry 
        value={confirmPassword} 
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.disabledButton]} 
        onPress={registerUser}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        Already have an account?{' '}
        <Text 
          style={styles.link} 
          onPress={() => navigation.navigate('Login')}
        >
          Login
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
    justifyContent: 'center',
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  buttonText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    color: Colors.white,
    marginTop: 15,
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});