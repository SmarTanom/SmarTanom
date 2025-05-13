import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';

export default function SetupScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let’s set you up</Text>
      <Text style={styles.subtitle}>Sync your SmarTanom with the app for added functionality</Text>

      <View style={styles.deviceBox}>
        <Text style={styles.deviceText}>Porch SmarTanom{"\n"}ID: 0000000001</Text>
        <Text style={styles.synced}>✅ Synced</Text>
      </View>
      <View style={styles.deviceBox}>
        <Text style={styles.deviceText}>Backyard SmarTanom{"\n"}ID: 0000000002</Text>
        <Text style={styles.synced}>✅ Synced</Text>
      </View>
      <TouchableOpacity style={styles.syncBox}>
        <Text style={styles.syncText}>➕ Sync new SmarTanom</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 20,
  },
  deviceBox: {
    backgroundColor: '#ffffff20',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceText: {
    color: Colors.white,
  },
  synced: {
    color: 'lightgreen',
  },
  syncBox: {
    backgroundColor: '#ffffff20',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  syncText: {
    color: Colors.white,
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
});
