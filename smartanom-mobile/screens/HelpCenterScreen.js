import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';
import { AppSettingsContext } from '../context/AppSettingsContext';

export default function HelpCenterScreen({ navigation }) {
  const { darkMode } = useContext(AppSettingsContext);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  const styles = getStyles(darkMode);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Help Center</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.text}>
            Need assistance? We're here to help! If you're experiencing issues, have questions about how SmartTanom works, or need technical support, reach out to us through the emails below.
          </Text>

          <Text style={styles.subtitle}>Contact Support</Text>
          <Text style={styles.text}>• villartaariel478@gmail.com</Text>
          <Text style={styles.text}>• salas.ivisusej@gmail.com</Text>
          <Text style={styles.text}>• llagasneilandrew@gmail.com</Text>
          <Text style={styles.text}>• olandria.iankent@gmail.com</Text>
          <Text style={styles.text}>• rodillon.javy.32181@gmail.com</Text>

          <Text style={styles.subtitle}>Common Issues</Text>
          <Text style={styles.text}>• App not syncing with sensors</Text>
          <Text style={styles.text}>• Incorrect plant data</Text>
          <Text style={styles.text}>• Notifications not appearing</Text>

          <Text style={styles.text}>
            For all these and more, don’t hesitate to reach out. We'll get back to you as soon as possible.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (darkMode) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: darkMode ? Colors.darkBackground : Colors.white,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 10,
      width: 40,
      height: 40,
      backgroundColor: Colors.primary,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingTop: 100,
      paddingBottom: 30,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    title: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 24,
      color: Colors.white,
      marginTop: 10,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    subtitle: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 18,
      color: Colors.primary,
      marginTop: 20,
      marginBottom: 5,
    },
    text: {
      fontFamily: 'Montserrat_400Regular',
      fontSize: 15,
      color: darkMode ? Colors.white : Colors.darkText,
      marginBottom: 8,
    },
    logo: {
      width: 200,
      height: 200,
      resizeMode: 'contain',
    },
  });
