import React, { useEffect, useContext } from 'react';
import { View, /* Image, */ StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { AuthContext } from '../context/AuthContext';

export default function LaunchScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user is logged in
      if (user) {
        // User is logged in, navigate to MainApp
        navigation.replace('MainApp');
      } else {
        // User is not logged in, navigate to Welcome screen
        navigation.replace('Welcome');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, navigation]);

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
