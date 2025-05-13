import React, { useEffect } from 'react';
import { View, /* Image, */ StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export default function LaunchScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // For testing, navigate directly to MainApp
      // In production, you would navigate to 'Welcome' for new users
      navigation.replace('MainApp');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo temporarily disabled */}
      {/* <Image source={require('../assets/logo.png')} style={styles.logo} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
});
