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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function SensorSettingsScreen({ navigation, route }) {
  const { device } = route.params;

  // Sensor states
  const [sensors, setSensors] = useState([
    {
      id: 'ph',
      name: 'pH Sensor',
      status: 'connected',
      enabled: true,
      icon: 'flask',
      iconType: 'ionicons',
      description: 'Monitors the acidity or alkalinity of your nutrient solution. Optimal pH ensures proper nutrient absorption by plants.',
      lastReading: '6.2',
      unit: 'pH'
    },
    {
      id: 'ec',
      name: 'EC Sensor',
      status: 'connected',
      enabled: true,
      icon: 'water-outline',
      iconType: 'ionicons',
      description: 'Measures electrical conductivity to determine nutrient concentration in your solution.',
      lastReading: '1.8',
      unit: 'mS/cm'
    },
    {
      id: 'tds',
      name: 'TDS Sensor',
      status: 'connected',
      enabled: true,
      icon: 'eyedropper',
      iconType: 'font-awesome',
      description: 'Measures Total Dissolved Solids to monitor nutrient concentration in parts per million.',
      lastReading: '900',
      unit: 'ppm'
    },
    {
      id: 'temp',
      name: 'Temperature Sensor',
      status: 'warning',
      enabled: true,
      icon: 'thermometer',
      iconType: 'font-awesome',
      description: 'Monitors water temperature. Proper temperature ensures optimal nutrient uptake and plant growth.',
      lastReading: '24',
      unit: '°C'
    },
    {
      id: 'humidity',
      name: 'Humidity Sensor',
      status: 'connected',
      enabled: true,
      icon: 'water-percent',
      iconType: 'material',
      description: 'Measures ambient humidity. Proper humidity levels prevent mold and optimize plant transpiration.',
      lastReading: '65',
      unit: '%'
    },
    {
      id: 'light',
      name: 'Light Sensor',
      status: 'connected',
      enabled: true,
      icon: 'sunny-outline',
      iconType: 'ionicons',
      description: 'Monitors light intensity to ensure plants receive adequate light for photosynthesis.',
      lastReading: '850',
      unit: 'lux'
    },
    {
      id: 'co2',
      name: 'CO₂ Sensor',
      status: 'disconnected',
      enabled: false,
      icon: 'cloud-outline',
      iconType: 'ionicons',
      description: 'Measures carbon dioxide levels. CO₂ is essential for photosynthesis and plant growth.',
      lastReading: '450',
      unit: 'ppm'
    },
    {
      id: 'water',
      name: 'Water Level Sensor',
      status: 'connected',
      enabled: true,
      icon: 'water',
      iconType: 'material',
      description: 'Monitors water level in your reservoir to prevent pump damage and plant dehydration.',
      lastReading: '85',
      unit: '%'
    }
  ]);

  const toggleSensor = (id) => {
    setSensors(sensors.map(sensor =>
      sensor.id === id ? { ...sensor, enabled: !sensor.enabled } : sensor
    ));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return Colors.primary;
      case 'warning': return '#FFA500';
      case 'disconnected': return '#CD5151';
      default: return Colors.darkGray;
    }
  };

  const renderIcon = (sensor) => {
    switch(sensor.iconType) {
      case 'ionicons':
        return <Ionicons name={sensor.icon} size={20} color={Colors.primary} />;
      case 'material':
        return <MaterialCommunityIcons name={sensor.icon} size={20} color={Colors.primary} />;
      case 'font-awesome':
        return <FontAwesome5 name={sensor.icon} size={18} color={Colors.primary} />;
      default:
        return <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />;
    }
  };

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
        <Text style={styles.headerTitle}>Sensor Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Sensor Status</Text>
        <Text style={styles.sectionDescription}>
          Monitor and manage your SmarTanom sensors. Each sensor plays a vital role in maintaining optimal growing conditions.
        </Text>

        {sensors.map((sensor) => (
          <View key={sensor.id} style={styles.sensorCard}>
            <View style={styles.sensorHeader}>
              <View style={styles.sensorTitleContainer}>
                <View style={styles.sensorIconContainer}>
                  {renderIcon(sensor)}
                </View>
                <View>
                  <Text style={styles.sensorName}>{sensor.name}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensor.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(sensor.status) }]}>
                      {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#DDDDDD", true: "rgba(51, 148, 50, 0.4)" }}
                thumbColor={sensor.enabled ? Colors.primary : "#f4f3f4"}
                ios_backgroundColor="#DDDDDD"
                onValueChange={() => toggleSensor(sensor.id)}
                value={sensor.enabled}
              />
            </View>

            <View style={styles.sensorDetails}>
              <Text style={styles.sensorDescription}>{sensor.description}</Text>

              <View style={styles.readingContainer}>
                <Text style={styles.readingLabel}>Last Reading:</Text>
                <Text style={styles.readingValue}>{sensor.lastReading} <Text style={styles.readingUnit}>{sensor.unit}</Text></Text>
              </View>
            </View>
          </View>
        ))}
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
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  sensorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sensorName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
  },
  sensorDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  sensorDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  readingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 148, 50, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  readingLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.secondary,
  },
  readingValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
  },
  readingUnit: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
  },
});
