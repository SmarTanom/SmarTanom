import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Switch } from 'react-native';
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
        <View style={styles.header}>
          <Ionicons name="notifications-outline" size={28} color={Colors.white} />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: Colors.white,
    marginLeft: 10,
  },
  settingsList: {
    padding: 20,
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
