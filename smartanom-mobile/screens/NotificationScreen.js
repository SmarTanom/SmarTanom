import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function Notification({ navigation }) {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [allowNotifications, setAllowNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [badgeAppIcon, setBadgeAppIcon] = useState(true);
  const [showOnLockScreen, setShowOnLockScreen] = useState(true);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsList}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Allow Notifications</Text>
            <Switch
              value={allowNotifications}
              onValueChange={setAllowNotifications}
              trackColor={{ false: '#767577', true: Colors.primary }}
              thumbColor={allowNotifications ? Colors.white : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sounds</Text>
            <Switch
              value={sounds}
              onValueChange={setSounds}
              trackColor={{ false: '#767577', true: Colors.primary }}
              thumbColor={sounds ? Colors.white : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Badge App Icon</Text>
            <Switch
              value={badgeAppIcon}
              onValueChange={setBadgeAppIcon}
              trackColor={{ false: '#767577', true: Colors.primary }}
              thumbColor={badgeAppIcon ? Colors.white : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show on Lock Screen</Text>
            <Switch
              value={showOnLockScreen}
              onValueChange={setShowOnLockScreen}
              trackColor={{ false: '#767577', true: Colors.primary }}
              thumbColor={showOnLockScreen ? Colors.white : '#f4f3f4'}
            />
          </View>
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
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 20,
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
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: Colors.darkText,
  },
  settingsList: {
    paddingHorizontal: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.darkText,
  },
});
