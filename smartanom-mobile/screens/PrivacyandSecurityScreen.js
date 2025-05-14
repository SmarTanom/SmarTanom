import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { AppSettingsContext } from '../context/AppSettingsContext';

const DATA_RETENTION_OPTIONS = ['1m', '6m', '12m', 'Custom'];

export default function PrivacyandSecurityScreen({ navigation }) {
  const { darkMode } = useContext(AppSettingsContext);
  const styles = getStyles(darkMode);

  const [dataRetention, setDataRetention] = useState('6m');
  const [locationAccess, setLocationAccess] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);

  const onChangePassword = () => {
    Alert.alert('Change Password', 'Change password functionality to be implemented.');
  };

  const onExportData = () => {
    Alert.alert('Export Data', 'Export data functionality to be implemented.');
  };

  const onDeleteData = () => {
    Alert.alert('Delete Data', 'Delete data functionality to be implemented.');
  };

  const onViewPolicy = () => {
    const url = 'https://example.com/gdpr-iot-security-policy';
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open policy URL.');
    });
  };

  const onSelectDataRetention = () => {
    Alert.alert(
      'Select Data Retention',
      null,
      DATA_RETENTION_OPTIONS.map(option => ({
        text: option,
        onPress: () => setDataRetention(option),
      })),
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header Row with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>Email Verification</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="key-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>Change Password</Text>
            <TouchableOpacity style={styles.changeButton} onPress={onChangePassword}>
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <View style={styles.row}>
            <Ionicons name="eye-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>This Device – Online</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Privacy</Text>
          <View style={styles.row}>
            <Ionicons name="brush-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>Data Retention</Text>
            <TouchableOpacity style={styles.dropdown} onPress={onSelectDataRetention}>
              <Text style={styles.dropdownText}>{dataRetention}</Text>
              <Ionicons name="chevron-down-outline" size={18} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={onExportData}>
              <Text style={styles.actionButtonText}>Export My Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDeleteData}>
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete My Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>Location Access</Text>
            <Switch
              value={locationAccess}
              onValueChange={setLocationAccess}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? (locationAccess ? Colors.primary : Colors.white) : ''}
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>Camera Access (for pairing)</Text>
            <Switch
              value={cameraAccess}
              onValueChange={setCameraAccess}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? (cameraAccess ? Colors.primary : Colors.white) : ''}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance & Info</Text>
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            <Text style={styles.rowText}>GDPR & IoT Security Practices</Text>
          </View>
          <TouchableOpacity onPress={onViewPolicy}>
            <Text style={styles.linkText}>Learn how we protect your data → View Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (darkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: darkMode ? Colors.darkBackground : Colors.white,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
      marginTop: 10,
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
      fontSize: 22,
      fontWeight: '700',
      color: darkMode ? Colors.white : Colors.darkText,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: darkMode ? Colors.white : Colors.darkText,
      marginBottom: 15,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    rowText: {
      flex: 1,
      marginLeft: 15,
      fontSize: 16,
      color: darkMode ? Colors.white : Colors.darkText,
    },
    changeButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    changeButtonText: {
      color: Colors.white,
      fontWeight: '600',
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.lightGray,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dropdownText: {
      marginRight: 5,
      fontSize: 16,
      color: darkMode ? Colors.white : Colors.darkText,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      flex: 1,
      backgroundColor: Colors.primary,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      marginRight: 10,
    },
    deleteButton: {
      backgroundColor: Colors.alertRed,
      marginRight: 0,
    },
    actionButtonText: {
      color: Colors.white,
      fontWeight: '600',
    },
    deleteButtonText: {
      color: Colors.white,
    },
    linkText: {
      color: Colors.primary,
      fontWeight: '600',
      fontSize: 16,
      marginTop: 10,
    },
  });
