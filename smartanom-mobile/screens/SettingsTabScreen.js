import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import { useDeviceImages } from '../context/DeviceImageContext';
import Colors from '../constants/Colors';

export default function SettingsTabScreen({ navigation, route }) {
  const { device } = route.params || { device: { id: '0000000001', name: 'Porch SmarTanom' } };
  const { getDeviceImage } = useDeviceImages();
  const [activeTab, setActiveTab] = useState('SETTINGS');

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbhayaLibre_800ExtraBold,
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

  const renderSettingsContent = () => {
    return (
      <View style={styles.settingsContainer}>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('ConnectivityScreen', { device })}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="wifi" size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Connectivity</Text>
            <Text style={styles.settingStatus}>Connected via WiFi</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('SensorSettingsScreen', { device })}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Sensor Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('CycleSettingsScreen', { device })}
        >
          <View style={styles.settingIconContainer}>
            <MaterialCommunityIcons name="sprout" size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Cycle Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('SyncSettingsScreen', { device })}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="sync-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>SmarTanom Sync Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
        </TouchableOpacity>
      </View>
    );
  };

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
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.darkGray} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.deviceInfoContainer}>
          <Image 
            source={getDeviceImage(device.id) || require('../assets/hydroponic-plant.jpg')} 
            style={styles.deviceImage} 
          />
          <View style={styles.deviceTextContainer}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceId}>ID: {device.id}</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'PLANTS' && styles.activeTab]}
            onPress={() => setActiveTab('PLANTS')}
          >
            <Text style={[styles.tabText, activeTab === 'PLANTS' && styles.activeTabText]}>PLANTS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'LOG' && styles.activeTab]}
            onPress={() => setActiveTab('LOG')}
          >
            <Text style={[styles.tabText, activeTab === 'LOG' && styles.activeTabText]}>LOG</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'SETTINGS' && styles.activeTab]}
            onPress={() => setActiveTab('SETTINGS')}
          >
            <Text style={[styles.tabText, activeTab === 'SETTINGS' && styles.activeTabText]}>SETTINGS</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'SETTINGS' && renderSettingsContent()}
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
  menuButton: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  deviceInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  deviceImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  deviceTextContainer: {
    marginBottom: 8,
  },
  deviceName: {
    fontFamily: 'AbhayaLibre_800ExtraBold',
    fontSize: 24,
    color: '#111111',
    marginBottom: 4,
  },
  deviceId: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#AAAAAA',
  },
  activeTabText: {
    color: Colors.primary,
    fontFamily: 'Montserrat_600SemiBold',
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#333333',
  },
  settingStatus: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
});
