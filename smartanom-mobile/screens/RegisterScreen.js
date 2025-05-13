import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import InputField from '../components/InputField';
import Colors from '../constants/Colors';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const registerUser = async () => {
    try {
      const response = await fetch("http://10.0.2.2:8000/api/accounts/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          email: email,
          contact: contact,
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Registration failed:", errorData);
        Alert.alert("Registration Error", JSON.stringify(errorData));
        return;
      }

      const data = await response.json();
      console.log("Registration success:", data);
      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("Login");

    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Network Error", "Failed to connect to backend.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register on SmarTanom</Text>
      <Text style={styles.subtitle}>Create an account to get started.</Text>

      <InputField placeholder="Full Name" value={name} onChangeText={setName} />
      <InputField placeholder="Email Address" value={email} onChangeText={setEmail} />
      <InputField placeholder="Contact Number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
      <InputField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <TouchableOpacity style={styles.button} onPress={registerUser}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Login</Text>
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
