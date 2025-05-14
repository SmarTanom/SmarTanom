import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

export default function AlertsScreen() {
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Sample alert data
  const todayAlerts = [
    {
      id: 1,
      device: 'Backyard SmarTanom',
      message: 'Low reservoir water level detected.',
      icon: 'water-outline',
      iconColor: '#3498db',
      image: require('../assets/hydroponic-plant.jpg'),
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      device: 'Porch SmarTanom',
      message: 'EC too low (Inadequate nutrients).',
      icon: 'flask-outline',
      iconColor: Colors.primary,
      image: require('../assets/porch-plant.png'),
      timestamp: '4 hours ago'
    }
  ];

  const yesterdayAlerts = [
    {
      id: 3,
      device: 'Backyard SmarTanom',
      message: 'Low reservoir water level detected.',
      icon: 'water-outline',
      iconColor: '#3498db',
      image: require('../assets/hydroponic-plant.jpg'),
      timestamp: '1 day ago'
    }
  ];

  // Render an alert item
  const renderAlertItem = (alert, isLast = false) => (
    <TouchableOpacity
      key={alert.id}
      style={[
        styles.alertItem,
        isLast ? { borderBottomWidth: 0 } : null
      ]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('DeviceDetail', {
        device: {
          id: alert.id === 1 || alert.id === 3 ? '0000000002' : '0000000001',
          name: alert.device,
          image: alert.image
        }
      })}
    >
      <Image source={alert.image} style={styles.deviceImage} />
      <View style={styles.alertContent}>
        <Text style={styles.deviceName}>{alert.device}</Text>
        <View style={styles.messageContainer}>
          <Ionicons name={alert.icon} size={16} color={alert.iconColor} style={styles.messageIcon} />
          <Text style={styles.alertMessage}>{alert.message}</Text>
        </View>
      </View>
      <View style={styles.statusDot} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>


      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Today's Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.alertsContainer}>
            {todayAlerts.map((alert, index) =>
              renderAlertItem(alert, index === todayAlerts.length - 1)
            )}
          </View>
        </View>

        {/* Yesterday's Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yesterday</Text>
          <View style={styles.alertsContainer}>
            {yesterdayAlerts.map((alert, index) =>
              renderAlertItem(alert, index === yesterdayAlerts.length - 1)
            )}
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

  container: {
    flex: 1,
    backgroundColor: '#f6fef8',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginLeft: 16,
    marginBottom: 10,
  },
  alertsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },

  deviceImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIcon: {
    marginRight: 6,
  },
  alertMessage: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.darkGray,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },

});
