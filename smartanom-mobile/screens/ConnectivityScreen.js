import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function ConnectivityScreen({ navigation, route }) {
  const { device } = route.params;
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState('Just now');

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

  const checkConnection = () => {
    setIsChecking(true);

    // Simulate checking connection
    setTimeout(() => {
      // Randomly determine if connected or not for demo purposes
      const isConnected = Math.random() > 0.3;
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      setIsChecking(false);
      setLastChecked('Just now');
    }, 2000);
  };

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
        <Text style={styles.headerTitle}>Connectivity</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>

          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              connectionStatus === 'connected' ? styles.statusConnected : styles.statusDisconnected
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus === 'connected'
                ? 'Connected via WiFi'
                : 'Disconnected'}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IP Address:</Text>
              <Text style={styles.infoValue}>192.168.1.105</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Signal Strength:</Text>
              <View style={styles.signalStrength}>
                <View style={[styles.signalBar, styles.signalBar1, styles.signalActive]} />
                <View style={[styles.signalBar, styles.signalBar2, styles.signalActive]} />
                <View style={[styles.signalBar, styles.signalBar3, styles.signalActive]} />
                <View style={[styles.signalBar, styles.signalBar4, connectionStatus === 'connected' ? styles.signalActive : styles.signalInactive]} />
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Synced:</Text>
              <Text style={styles.infoValue}>5 minutes ago</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Checked:</Text>
              <Text style={styles.infoValue}>{lastChecked}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkConnection}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Check Connection</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.troubleshootingCard}>
          <Text style={styles.cardTitle}>Troubleshooting Tips</Text>

          <View style={styles.tipContainer}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="wifi" size={20} color={Colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Check WiFi Connection</Text>
              <Text style={styles.tipText}>Ensure your SmarTanom device is within range of your WiFi router.</Text>
            </View>
          </View>

          <View style={styles.tipContainer}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="power" size={20} color={Colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Power Cycle</Text>
              <Text style={styles.tipText}>Try turning your SmarTanom device off and on again.</Text>
            </View>
          </View>

          <View style={styles.tipContainer}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Reset Network Settings</Text>
              <Text style={styles.tipText}>If problems persist, try resetting the network settings on your device.</Text>
            </View>
          </View>
        </View>
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
  },
  deviceInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 20,
    color: Colors.secondary,
    marginBottom: 4,
  },
  deviceId: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(51, 148, 50, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#339432',
  },
  statusDisconnected: {
    backgroundColor: '#CD5151',
  },
  statusText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: Colors.secondary,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.secondary,
  },
  signalStrength: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  signalBar: {
    width: 6,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  signalBar: {
    width: 6,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  signalBar1: {
    height: 6,
  },
  signalBar2: {
    height: 10,
  },
  signalBar3: {
    height: 14,
  },
  signalBar4: {
    height: 18,
  },
  signalActive: {
    backgroundColor: Colors.primary,
  },
  signalInactive: {
    backgroundColor: '#DDDDDD',
  },
  checkButton: {
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
  troubleshootingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 16,
  },
  tipContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});
