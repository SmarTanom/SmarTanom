import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AuthContext } from '../context/AuthContext';
import Colors from '../constants/Colors';
import { AppSettingsContext } from '../context/AppSettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUserProfile } = useContext(AuthContext);
  const { darkMode } = useContext(AppSettingsContext);
  const [username, setUsername] = useState('');

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // Load username from AsyncStorage
  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
        }
      } catch (error) {
        console.error('Failed to load username:', error);
      }
    };

    loadUsername();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const handleEditUsername = () => {
    navigation.navigate('EditUsername');
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const styles = getStyles(darkMode);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container1}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={50} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.name}>{username || user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="person-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleEditUsername}>
            <Ionicons name="text-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Edit Username</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('NotificationScreen')}>
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacyandSecurityScreen')}>
            <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Language')}>
            <Ionicons name="language-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Language</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HelpCenter')}>
            <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>Help Center</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('About')}>
            <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuText}>About</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.darkGray} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    container1: {
      flex: 1,
      backgroundColor: darkMode ? Colors.darkBackground : Colors.white,
      marginBottom: 50,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 30,
      backgroundColor: Colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    profileImageContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: Colors.white,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    profileImagePlaceholder: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: Colors.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    name: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 22,
      color: Colors.white,
      marginBottom: 5,
    },
    email: {
      fontFamily: 'Montserrat_400Regular',
      fontSize: 14,
      color: Colors.white,
      opacity: 0.8,
    },
    section: {
      marginTop: 25,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 16,
      color: darkMode ? Colors.white : Colors.darkText,
      marginBottom: 15,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.lightGray,
    },
    menuText: {
      fontFamily: 'Montserrat_500Medium',
      fontSize: 15,
      color: darkMode ? Colors.white : Colors.darkText,
      flex: 1,
      marginLeft: 15,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.alertRed,
      marginHorizontal: 20,
      marginVertical: 30,
      paddingVertical: 12,
      borderRadius: 10,
    },
    logoutText: {
      fontFamily: 'Montserrat_600SemiBold',
      fontSize: 16,
      color: Colors.white,
      marginLeft: 10,
    },
  });
