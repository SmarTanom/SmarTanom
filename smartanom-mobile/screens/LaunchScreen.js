import React, { useEffect, useRef, useContext } from 'react';
import { View, Image, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Colors from '../constants/Colors';
import { AuthContext } from '../context/AuthContext';

export default function LaunchScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const timerRef = useRef(null);
  const hasNavigated = useRef(false); // to prevent double navigation

  const handleSkip = () => {
    if (hasNavigated.current) return; // Prevent multiple navigations
    hasNavigated.current = true;
    clearTimeout(timerRef.current);
    navigation.replace(user ? 'MainApp' : 'Welcome');
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleSkip(); // auto navigate after 5 sec
    }, 5000);

    return () => clearTimeout(timerRef.current);
  }, [user]);

  return (
    <TouchableWithoutFeedback onPress={handleSkip}>
      <View style={styles.container}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
      </View>
    </TouchableWithoutFeedback>
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
