import React, { useContext } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors'; // Adjust colors based on your theme
import { AppSettingsContext } from '../context/AppSettingsContext';

export default function SettingsScreen({ navigation }) {
  const { darkMode, toggleDarkMode } = useContext(AppSettingsContext);

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={[styles.headerText, darkMode && styles.darkText]}>Settings</Text>
      </View>

      {/* Dark Mode Toggle */}
      <View style={styles.settingItem}>
        <Ionicons name="moon-outline" size={24} color={darkMode ? Colors.white : Colors.primary} />
        <Text style={[styles.settingText, darkMode && styles.darkText]}>Dark Mode</Text>
        <Switch
          trackColor={{ false: '#767577', true: Colors.primary }}
          thumbColor={darkMode ? Colors.white : '#f4f3f4'}
          onValueChange={toggleDarkMode}
          value={darkMode}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  darkContainer: {
    backgroundColor: Colors.black, // Dark mode background color
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  darkText: {
    color: Colors.white, // Dark mode text color
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomColor: Colors.lightGray,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 16,
    color: Colors.darkText,
    flex: 1,
    marginLeft: 10,
  },
});
