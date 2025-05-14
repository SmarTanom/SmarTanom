import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import Colors from '../constants/Colors';

export default function DeviceDetailScreen({ route }) {
  const navigation = useNavigation();
  const { device } = route.params;
  const [activeTab, setActiveTab] = useState('PLANTS');

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbhayaLibre_800ExtraBold,
  });

  useEffect(() => {
    // Set status bar to light content for better visibility
    StatusBar.setBarStyle('dark-content');
    return () => {
      // Reset when unmounting
      StatusBar.setBarStyle('default');
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header Image with back button and menu */}
        <View style={styles.headerImageContainer}>
          <Image
            source={device.image}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              <Text style={styles.backText}>Go back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
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

        {/* Plant Status */}
        {activeTab === 'PLANTS' && (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Ionicons name="time-outline" size={24} color={Colors.primary} />
                <Text style={styles.statusText}>
                  Romaine Lettuce is estimated to be ready for harvest in 35 days.
                </Text>
              </View>
            </View>

            <View style={styles.growingNowContainer}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons name="sprout" size={18} color="rgba(6, 73, 44, 0.75)" />
                <Text style={styles.sectionTitle}>Growing now</Text>
              </View>

              <View style={styles.plantCard}>
                <Image
                  source={require('../assets/romaine.png')}
                  style={styles.plantImage}
                />
                <View style={styles.plantDetails}>
                  <Text style={styles.plantName}>Romaine</Text>
                  <Text style={styles.plantType}>Lettuce</Text>
                </View>
                <Text style={styles.harvestTime}>Harvest in 35 days</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.newCycleButton}>
              <Text style={styles.newCycleButtonText}>Start New Cycle</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Log Tab Content */}
        {activeTab === 'LOG' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No logs available</Text>
          </View>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'SETTINGS' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Device settings will appear here</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MainApp', { screen: 'Tanom' })}
        >
          <MaterialCommunityIcons name="sprout" size={24} color={Colors.primary} />
          <Text style={styles.navButtonText}>Tanom</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MainApp', { screen: 'Alerts' })}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.darkGray} />
          <Text style={styles.navButtonText}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MainApp', { screen: 'Profile' })}
        >
          <Ionicons name="person-outline" size={24} color={Colors.darkGray} />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  headerImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  menuButton: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceInfo: {
    padding: 16,
    paddingBottom: 8,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f7f0',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#8bc48a',
  },
  activeTabText: {
    color: Colors.secondary,
    fontFamily: 'Montserrat_700Bold',
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    flex: 1,
    marginLeft: 12,
  },
  growingNowContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 147, 89, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: 'rgba(6, 73, 44, 0.75)',
    marginLeft: 8,
  },
  plantCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  plantDetails: {
    marginLeft: 16,
    flex: 1,
  },
  plantName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#06492C',
  },
  plantType: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#AAAAAA',
  },
  harvestTime: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#06492C',
    textAlign: 'right',
  },
  newCycleButton: {
    backgroundColor: '#339432',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newCycleButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: 'white',
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
  },
  emptyStateText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: Colors.darkGray,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    backgroundColor: Colors.white,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  navButtonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 4,
  },
});
