import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SmarTanom</Text>
      <Text style={styles.subtitle}>
        From sensors to sunshine, everything your hydroponic plant needs is here.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.buttonText, { color: Colors.primary }]}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.buttonText, { color: Colors.white }]}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 8,
    marginBottom: 10,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
