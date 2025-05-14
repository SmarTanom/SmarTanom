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
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function SensorSettingsScreen({ navigation, route }) {
  const { device } = route.params;
  const [sensors, setSensors] = useState([
    { id: 'ph', name: 'pH Sensor', enabled: true, status: 'active', lastReading: '6.2 pH', description: 'Measures the acidity or alkalinity of the nutrient solution.' },
    { id: 'ec', name: 'EC Sensor', enabled: true, status: 'active', lastReading: '2.4 mS/cm', description: 'Measures electrical conductivity to determine nutrient concentration.' },
    { id: 'tds', name: 'TDS Sensor', enabled: true, status: 'active', lastReading: '950 ppm', description: 'Measures total dissolved solids in the nutrient solution.' },
    { id: 'temp', name: 'Temperature Sensor', enabled: true, status: 'active', lastReading: '24.5°C', description: 'Monitors ambient temperature around the plants.' },
    { id: 'humidity', name: 'Humidity Sensor', enabled: true, status: 'active', lastReading: '65%', description: 'Monitors relative humidity in the growing environment.' },
    { id: 'light', name: 'Light Sensor', enabled: true, status: 'active', lastReading: '9,000 Lux', description: 'Measures light intensity for optimal plant growth.' },
    { id: 'co2', name: 'CO₂ Sensor', enabled: false, status: 'inactive', lastReading: '415 ppm', description: 'Monitors carbon dioxide levels in the growing environment.' },
    { id: 'water', name: 'Water Level Sensor', enabled: true, status: 'active', lastReading: '85%', description: 'Monitors water level in the reservoir.' },
    { id: 'turbidity', name: 'Turbidity Sensor', enabled: true, status: 'active', lastReading: '3 NTU', description: 'Measures water clarity and particulate matter.' },
  ]);

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

  const toggleSensor = (id) => {
    setSensors(sensors.map(sensor => 
      sensor.id === id 
        ? { ...sensor, enabled: !sensor.enabled, status: !sensor.enabled ? 'active' : 'inactive' } 
        : sensor
    ));
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
        <Text style={styles.headerTitle}>Sensor Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>All sensors functioning normally</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sensor Management</Text>
          
          {sensors.map(sensor => (
            <View key={sensor.id} style={styles.sensorItem}>
              <View style={styles.sensorInfo}>
                <View style={[styles.sensorIconContainer, !sensor.enabled && styles.sensorDisabled]}>
                  {sensor.id === 'ph' && <MaterialCommunityIcons name="ph" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'ec' && <MaterialCommunityIcons name="flash" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'tds' && <Ionicons name="water-outline" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'temp' && <MaterialCommunityIcons name="thermometer" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'humidity' && <MaterialCommunityIcons name="water-percent" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'light' && <Ionicons name="sunny-outline" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'co2' && <MaterialCommunityIcons name="molecule-co2" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'water' && <Ionicons name="water" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                  {sensor.id === 'turbidity' && <MaterialCommunityIcons name="water-opacity" size={20} color={sensor.enabled ? Colors.primary : Colors.lightGray} />}
                </View>
                <View style={styles.sensorDetails}>
                  <Text style={styles.sensorName}>{sensor.name}</Text>
                  <Text style={styles.sensorDescription}>{sensor.description}</Text>
                  <View style={styles.sensorReadingContainer}>
                    <Text style={styles.sensorReadingLabel}>Last reading:</Text>
                    <Text style={styles.sensorReading}>{sensor.lastReading}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.sensorControls}>
                <Text style={[styles.sensorStatus, sensor.enabled ? styles.statusActive : styles.statusInactive]}>
                  {sensor.status}
                </Text>
                <Switch
                  trackColor={{ false: "#DDDDDD", true: "rgba(51, 148, 50, 0.4)" }}
                  thumbColor={sensor.enabled ? Colors.primary : "#f4f3f4"}
                  ios_backgroundColor="#DDDDDD"
                  onValueChange={() => toggleSensor(sensor.id)}
                  value={sensor.enabled}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Calibration</Text>
          <TouchableOpacity style={styles.calibrationButton}>
            <Ionicons name="options-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Calibrate Sensors</Text>
          </TouchableOpacity>
          <Text style={styles.calibrationNote}>
            Regular calibration ensures accurate readings. We recommend calibrating your sensors every 2-3 months.
          </Text>
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
  sensorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sensorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sensorIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sensorDisabled: {
    backgroundColor: '#F5F5F5',
  },
  sensorDetails: {
    flex: 1,
  },
  sensorName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  sensorDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  sensorReadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorReadingLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  sensorReading: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  sensorControls: {
    alignItems: 'flex-end',
  },
  sensorStatus: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    marginBottom: 6,
  },
  statusActive: {
    color: Colors.primary,
  },
  statusInactive: {
    color: '#999999',
  },
  calibrationButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  calibrationNote: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});
