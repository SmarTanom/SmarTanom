import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import InputField from '../components/InputField';
import Colors from '../constants/Colors';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register on SmarTanom</Text>
      <Text style={styles.subtitle}>Create an SmarTanom account. We can't wait to have you.</Text>

      <InputField placeholder="Email Address" value={email} onChangeText={setEmail} />
      <InputField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Text style={styles.or}>Or Register using social media</Text>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn}>
          <Text>📘 Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn}>
          <Text>🟢 Google</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Personalize')}>
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
  or: {
    color: Colors.white,
    textAlign: 'center',
    marginVertical: 10,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  socialBtn: {
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 6,
  },
  button: {
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
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
