// AboutScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function AboutScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

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
          <Text style={styles.title}>About SmartTanom</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.text}>
            SmartTanom is an intelligent plant care system developed by IT students with a mission to integrate modern IoT solutions into agriculture. It helps users monitor plant health using real-time sensor data and make informed decisions on care.
          </Text>
          <Text style={styles.text}>
            Originally inspired by hydroponics, the project evolved to focus on scalable, sensor-based solutions that work in a wide range of environments, from home gardens to commercial greenhouses.
          </Text>
          <Text style={styles.subtitle}>Team Members</Text>
          <Text style={styles.text}>• Ariel Jay Lyster Villarta</Text>
          <Text style={styles.text}>• Ivi Susej Marie Salas</Text>
          <Text style={styles.text}>• Neil Andrew Llagas</Text>
          <Text style={styles.text}>• Ian Kent Olandria</Text>
          <Text style={styles.text}>• Javy Rodillon</Text>

          <Text style={styles.subtitle}>Supervised by</Text>
          <Text style={styles.text}>Dario C. Miñosa Jr (Adviser/Chair)</Text>

          <Text style={styles.subtitle}>Contact Us</Text>
          <Text style={styles.text}>
            For any inquiries or support, feel free to email us at:
          </Text>
          <Text style={styles.text}>• villartaariel478@gmail.com</Text>
          <Text style={styles.text}>• salas.ivisusej@gmail.com</Text>
          <Text style={styles.text}>• llagasneilandrew@gmail.com</Text>
          <Text style={styles.text}>• olandria.iankent@gmail.com</Text>
          <Text style={styles.text}>• rodillon.javy.32181@gmail.com</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
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
    color: Colors.darkText,
    marginBottom: 8,
  },
  note: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: Colors.darkGray,
    fontStyle: 'italic',
    marginTop: 5,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});
