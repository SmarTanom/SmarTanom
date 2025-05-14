import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { AppSettingsContext } from '../context/AppSettingsContext';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';

export default function LanguageScreen({ navigation }) {
  const { darkMode } = useContext(AppSettingsContext);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  const styles = getStyles(darkMode);

  if (!fontsLoaded) {
    return null;
  }

  const languages = ['English', 'Filipino', 'Cebuano'];

  const handleSelectLanguage = (lang) => {
    setSelectedLanguage(lang);
    // Optional: persist language using AsyncStorage or Context
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Language</Text>
        </View>

        <View style={styles.optionsContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageOption,
                selectedLanguage === lang && styles.selectedOption,
              ]}
              onPress={() => handleSelectLanguage(lang)}
            >
              <Text
                style={[
                  styles.languageText,
                  selectedLanguage === lang && styles.selectedText,
                ]}
              >
                {lang}
              </Text>
              {selectedLanguage === lang && (
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
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
      padding: 20,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
    },
    backButton: {
      width: 40,
      height: 40,
      backgroundColor: Colors.primary,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    headerTitle: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 22,
      color: darkMode ? Colors.white : Colors.darkText,
    },
    optionsContainer: {
      marginTop: 10,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: Colors.lightGray,
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginBottom: 15,
      backgroundColor: darkMode ? '#1c1c1e' : Colors.white,
    },
    selectedOption: {
      borderColor: Colors.primary,
      backgroundColor: darkMode ? '#0f2f1f' : '#f0fff4',
    },
    languageText: {
      fontFamily: 'Montserrat_500Medium',
      fontSize: 16,
      color: darkMode ? Colors.white : Colors.darkText,
    },
    selectedText: {
      color: Colors.primary,
    },
  });
