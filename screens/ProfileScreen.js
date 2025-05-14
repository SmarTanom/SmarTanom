import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('User');

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbhayaLibre_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout from your account?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: () => {
            // Navigate to the login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: "destructive"
        }
      ]
    );
  };

  // Render a menu item
  const renderMenuItem = (title, onPress, isLast = false) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isLast ? { borderBottomWidth: 0 } : null
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.menuItemText}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey, <Text style={styles.username}>{username}</Text> <MaterialCommunityIcons name="leaf" size={24} color={Colors.primary} /></Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {renderMenuItem("Username", () => Alert.alert("Edit Username", "This feature will be available soon."))}
          {renderMenuItem("Email", () => Alert.alert("Edit Email", "This feature will be available soon."))}
          {renderMenuItem("Change Password", () => Alert.alert("Change Password", "This feature will be available soon."))}
          {renderMenuItem("SmarTanom Sync Settings", () => Alert.alert("Sync Settings", "This feature will be available soon."), true)}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f7f0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 20, // Reduced padding to avoid double navigation bar issue
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  greeting: {
    fontFamily: 'AbhayaLibre_800ExtraBold',
    fontSize: 28,
    color: '#111111',
  },
  username: {
    color: Colors.secondary,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#005500',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.alertRed,
  },
});
