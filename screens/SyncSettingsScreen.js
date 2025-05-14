import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Image,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function SyncSettingsScreen({ navigation, route }) {
  const { device } = route.params;
  const [autoSync, setAutoSync] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('hourly');
  const [dataSharing, setDataSharing] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(true);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SmarTanom Sync Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Last synced: 5 minutes ago</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sync Settings</Text>
          
          <View style={styles.optionRow}>
            <View style={styles.optionLabelContainer}>
              <Ionicons name="sync-outline" size={20} color={Colors.primary} />
              <Text style={styles.optionLabel}>Auto Sync</Text>
            </View>
            <Switch
              trackColor={{ false: "#DDDDDD", true: "rgba(51, 148, 50, 0.4)" }}
              thumbColor={autoSync ? Colors.primary : "#f4f3f4"}
              ios_backgroundColor="#DDDDDD"
              onValueChange={setAutoSync}
              value={autoSync}
            />
          </View>
          
          {autoSync && (
            <View style={styles.frequencyContainer}>
              <Text style={styles.frequencyLabel}>Sync Frequency</Text>
              <View style={styles.frequencyOptions}>
                <TouchableOpacity 
                  style={[styles.frequencyOption, syncFrequency === 'hourly' && styles.selectedFrequency]}
                  onPress={() => setSyncFrequency('hourly')}
                >
                  <Text style={[styles.frequencyText, syncFrequency === 'hourly' && styles.selectedFrequencyText]}>Hourly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.frequencyOption, syncFrequency === 'daily' && styles.selectedFrequency]}
                  onPress={() => setSyncFrequency('daily')}
                >
                  <Text style={[styles.frequencyText, syncFrequency === 'daily' && styles.selectedFrequencyText]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.frequencyOption, syncFrequency === 'weekly' && styles.selectedFrequency]}
                  onPress={() => setSyncFrequency('weekly')}
                >
                  <Text style={[styles.frequencyText, syncFrequency === 'weekly' && styles.selectedFrequencyText]}>Weekly</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.optionRow}>
            <View style={styles.optionLabelContainer}>
              <MaterialCommunityIcons name="share-variant" size={20} color={Colors.primary} />
              <Text style={styles.optionLabel}>Data Sharing</Text>
            </View>
            <Switch
              trackColor={{ false: "#DDDDDD", true: "rgba(51, 148, 50, 0.4)" }}
              thumbColor={dataSharing ? Colors.primary : "#f4f3f4"}
              ios_backgroundColor="#DDDDDD"
              onValueChange={setDataSharing}
              value={dataSharing}
            />
          </View>
          
          <View style={styles.optionRow}>
            <View style={styles.optionLabelContainer}>
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
              <Text style={styles.optionLabel}>Cloud Backup</Text>
            </View>
            <Switch
              trackColor={{ false: "#DDDDDD", true: "rgba(51, 148, 50, 0.4)" }}
              thumbColor={backupEnabled ? Colors.primary : "#f4f3f4"}
              ios_backgroundColor="#DDDDDD"
              onValueChange={setBackupEnabled}
              value={backupEnabled}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Sharing</Text>
          
          <View style={styles.qrContainer}>
            <Image 
              source={require('../assets/qr-code-placeholder.png')} 
              style={styles.qrCode}
              resizeMode="contain"
            />
            <Text style={styles.qrText}>Scan this QR code with another device to share your SmarTanom account</Text>
          </View>
          
          <View style={styles.backupCodeContainer}>
            <Text style={styles.backupCodeLabel}>Backup Code</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.backupCode}>SMART-TANOM-1234-5678</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.backupCodeHelp}>Use this code to link your account on another device if QR scanning is unavailable</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.syncNowButton}>
          <Ionicons name="sync" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Sync Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6fef8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  deviceInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 4,
  },
  deviceId: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.secondary,
    marginLeft: 12,
  },
  frequencyContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  frequencyLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 12,
  },
  frequencyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedFrequency: {
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
  },
  frequencyText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
  },
  selectedFrequencyText: {
    color: Colors.primary,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 12,
  },
  qrText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backupCodeContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  backupCodeLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backupCode: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: Colors.primary,
    letterSpacing: 1,
  },
  copyButton: {
    padding: 4,
  },
  backupCodeHelp: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
  },
  syncNowButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
