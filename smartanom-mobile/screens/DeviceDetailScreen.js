import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  PanResponder,
  Alert,
  Vibration
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import * as ImagePicker from 'expo-image-picker';
import { useDeviceImages } from '../context/DeviceImageContext';
import Colors from '../constants/Colors';

export default function DeviceDetailScreen({ route }) {
  const navigation = useNavigation();
  const { device, newCycleStarted, selectedPlants } = route.params || {};
  const [activeTab, setActiveTab] = useState('PLANTS');
  const { getDeviceImage, updateDeviceImage } = useDeviceImages();
  const [currentImage, setCurrentImage] = useState(getDeviceImage(device.id));
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState('Date: Descending');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [currentPlant, setCurrentPlant] = useState({
    name: 'Romaine',
    type: 'Lettuce',
    daysToHarvest: 35
  });

  // Sample log data
  const logData = [
    {
      id: 1,
      type: 'warning',
      title: 'Inadequate nutrients',
      message: 'This SmarTanom\'s EC is too low (1.0 mS/cm). Please refill Part A (Calcium Nitrate) and Part B (Micronutrient mix).',
      icon: 'warning',
      iconColor: '#FFA500',
      date: '05/07/25'
    },
    {
      id: 2,
      type: 'info',
      title: 'New cycle started',
      message: 'You just started a new cycle, time to grow new plants.',
      icon: 'information-circle',
      iconColor: '#339432',
      date: '05/06/25',
      timeAgo: '5m'
    },
    {
      id: 3,
      type: 'success',
      title: 'Ready for harvest',
      message: 'Your SmarTanom is now ready for harvest. Harvest now to start a new cycle of plants.',
      icon: 'checkmark-circle',
      iconColor: '#339432',
      date: '05/06/25'
    },
    {
      id: 4,
      type: 'warning',
      title: 'Low water levels',
      message: 'Low water level detected. Refill reservoir with fresh water.',
      icon: 'water',
      iconColor: '#3498db',
      date: '05/05/25'
    }
  ];

  // Function to sort log entries based on selected sort order
  const getSortedLogEntries = () => {
    const entries = [...logData];

    if (sortOrder === 'Date: Descending') {
      // Sort by date descending (newest first)
      return entries.sort((a, b) => {
        // Handle entries with timeAgo (like "5m") - these are always newest
        if (a.timeAgo && !b.timeAgo) return -1;
        if (!a.timeAgo && b.timeAgo) return 1;
        if (a.timeAgo && b.timeAgo) return 0;

        // Otherwise sort by date
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB - dateA;
      });
    }
    else if (sortOrder === 'Date: Ascending') {
      // Sort by date ascending (oldest first)
      return entries.sort((a, b) => {
        // Handle entries with timeAgo (like "5m") - these are always newest
        if (a.timeAgo && !b.timeAgo) return 1;
        if (!a.timeAgo && b.timeAgo) return -1;
        if (a.timeAgo && b.timeAgo) return 0;

        // Otherwise sort by date
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
      });
    }

    return entries;
  };

  // Get sorted log entries based on current sort order
  const logEntries = getSortedLogEntries();

  // Available photos for selection
  const availablePhotos = [
    { id: 1, source: require('../assets/porch-plant.png'), label: 'Porch Plant' },
    { id: 2, source: require('../assets/hydroponic-plant.jpg'), label: 'Hydroponic Plant' },
    { id: 3, source: require('../assets/romaine.png'), label: 'Romaine Lettuce' },
  ];

  // Animation for modal
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Create PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward swipe
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) { // If swiped down more than 50px, close the modal
          hidePhotoModal();
        } else {
          // Otherwise, snap back to open position
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Function to show the photo modal with animation
  const showPhotoModal = () => {
    setPhotoModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to hide the photo modal with animation
  const hidePhotoModal = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPhotoModalVisible(false);
    });
  };

  // Function to change the displayed photo
  const changePhoto = (newPhoto) => {
    // Update the global context with the new image
    updateDeviceImage(device.id, newPhoto.source);

    // Update the local state
    setCurrentImage(newPhoto.source);

    // Close the modal
    hidePhotoModal();
  };

  // Function to pick an image from the device's photo library
  const pickImage = async () => {
    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select a custom image.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Create an image object with the URI
        const newImage = { uri: result.assets[0].uri };

        // Update the global context with the new image
        updateDeviceImage(device.id, newImage);

        // Update the local state
        setCurrentImage(newImage);

        // Close the modal
        hidePhotoModal();
      }
    } catch (error) {
      // If the image picker fails (likely because the package isn't installed),
      // fall back to the simulated experience
      Alert.alert(
        'Feature Not Available',
        'To use this feature, please install the expo-image-picker package. For now, we\'ll use a sample image.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Use one of our existing images as a fallback
              const customImages = [
                require('../assets/romaine.png'),
                require('../assets/hydroponic-plant.jpg'),
                require('../assets/porch-plant.png')
              ];

              // Randomly select one of the images as a fallback
              const randomImage = customImages[Math.floor(Math.random() * customImages.length)];

              // Update the global context with the new image
              updateDeviceImage(device.id, randomImage);

              // Update the local state
              setCurrentImage(randomImage);

              // Close the modal
              hidePhotoModal();
            }
          }
        ]
      );
    }
  };

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

  // Handle new cycle data when returning from NewCycleScreen
  useEffect(() => {
    if (newCycleStarted && selectedPlants && selectedPlants.length > 0) {
      // Update the current plant with the first selected plant
      const newPlant = selectedPlants[0];
      setCurrentPlant({
        name: newPlant.name,
        type: newPlant.type,
        daysToHarvest: 35 // Default days to harvest
      });

      // In a real app, we would add a new log entry for starting a new cycle
      // For example:
      // const newLogEntry = {
      //   id: logData.length + 1,
      //   type: 'info',
      //   title: 'New cycle started',
      //   message: `You just started a new cycle with ${newPlant.name} ${newPlant.type}.`,
      //   icon: 'information-circle',
      //   iconColor: '#339432',
      //   date: new Date().toLocaleDateString('en-US', {
      //     month: '2-digit',
      //     day: '2-digit',
      //     year: '2-digit'
      //   }),
      //   timeAgo: 'now'
      // };
      // logData.unshift(newLogEntry);

      // We would normally update the log data here, but since it's static in this example,
      // we'll just show an alert to simulate the change
      Alert.alert(
        'New Cycle Started',
        `You've successfully started a new growing cycle with ${newPlant.name} ${newPlant.type}.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [newCycleStarted, selectedPlants]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header Image with back button and menu */}
        <View style={styles.headerImageContainer}>
          <Image
            source={currentImage}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="rgba(51, 148, 50, 0.9)" />
              <Text style={styles.backText}>Go back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={showPhotoModal}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="rgba(51, 148, 50, 0.9)" />
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
                  {currentPlant.name} {currentPlant.type} is estimated to be ready for harvest in {currentPlant.daysToHarvest} days.
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
                  <Text style={styles.plantName}>{currentPlant.name}</Text>
                  <Text style={styles.plantType}>{currentPlant.type}</Text>
                </View>
                <Text style={styles.harvestTime}>Harvest in {currentPlant.daysToHarvest} days</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newCycleButton}
              onPress={() => navigation.navigate('NewCycle', { device })}
            >
              <Text style={styles.newCycleButtonText}>Start New Cycle</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Log Tab Content */}
        {activeTab === 'LOG' && (
          <>
            {/* Sort dropdown */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  setShowSortOptions(!showSortOptions);
                  // Add a small vibration feedback when pressed
                  if (Platform.OS === 'ios' || Platform.OS === 'android') {
                    try {
                      Vibration.vibrate(10);
                    } catch (e) {
                      // Ignore if vibration is not supported
                    }
                  }
                }}
              >
                <Text style={styles.sortButtonText}>{sortOrder}</Text>
                <AntDesign
                  name="down"
                  size={14}
                  color="#06492C"
                />
              </TouchableOpacity>


            </View>

            {/* Log entries */}
            <ScrollView
              style={styles.logsContainer}
              contentContainerStyle={styles.logsContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {logEntries.map((entry) => (
                <View key={entry.id} style={styles.logEntry}>
                  {/* Icon */}
                  <View style={styles.logIconContainer}>
                    <Ionicons name={entry.icon} size={24} color={entry.iconColor} />
                  </View>

                  {/* Content */}
                  <View style={styles.logContent}>
                    <Text style={styles.logTitle}>{entry.title}</Text>
                    <Text style={styles.logMessage}>{entry.message}</Text>
                  </View>

                  {/* Timestamp */}
                  <Text style={styles.logDate}>
                    {entry.timeAgo ? entry.timeAgo : entry.date}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'SETTINGS' && (
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ConnectivityScreen', { device })}
            >
              <View style={styles.settingIconContainerRound}>
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
              onPress={() => navigation.navigate('SensorSettings', { device })}
            >
              <View style={styles.settingIconContainerRound}>
                <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Sensor Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('CycleSettings', { device })}
            >
              <View style={styles.settingIconContainerRound}>
                <MaterialCommunityIcons name="sprout" size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Cycle Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('SyncSettings', { device })}
            >
              <View style={styles.settingIconContainerRound}>
                <Ionicons name="sync-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>SmarTanom Sync Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.darkGray} />
            </TouchableOpacity>
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

      {/* Sort Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortOptions}
        onRequestClose={() => setShowSortOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSortOptions(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.sortModalContent}>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => {
                    setSortOrder('Date: Descending');
                    setShowSortOptions(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOrder === 'Date: Descending' && styles.selectedSortOption
                  ]}>
                    Date: Descending
                  </Text>
                  <AntDesign
                    name="down"
                    size={16}
                    color={sortOrder === 'Date: Descending' ? "#339432" : "#06492C"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortOption, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setSortOrder('Date: Ascending');
                    setShowSortOptions(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOrder === 'Date: Ascending' && styles.selectedSortOption
                  ]}>
                    Date: Ascending
                  </Text>
                  <AntDesign
                    name="up"
                    size={16}
                    color={sortOrder === 'Date: Ascending' ? "#339432" : "#06492C"}
                  />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Photo Selection Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={hidePhotoModal}
      >
        <TouchableWithoutFeedback onPress={hidePhotoModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <View
                  {...panResponder.panHandlers}
                  style={styles.modalPillContainer}
                >
                  <View style={styles.modalPill} />
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>Change Photo</Text>

                  {/* Option to select from device */}
                  <TouchableOpacity
                    style={styles.photoOption}
                    onPress={pickImage}
                  >
                    <View style={styles.galleryIconContainer}>
                      <FontAwesome5 name="images" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.photoLabel}>Select from device</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>Sample Photos</Text>

                  {availablePhotos.map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoOption}
                      onPress={() => changePhoto(photo)}
                    >
                      <Image
                        source={photo.source}
                        style={styles.photoThumbnail}
                        resizeMode="cover"
                      />
                      <Text style={styles.photoLabel}>{photo.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: "rgba(51, 148, 50, 0.9)",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 0,
  },
  modalPillContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalPill: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 20,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  photoLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: Colors.secondary,
  },
  galleryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: 15,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 10,
  },
  deviceInfo: {
    padding: 16,
    paddingBottom: 8,
  },
  deviceName: {
    fontFamily: 'AbhayaLibre_800ExtraBold',
    fontSize: 28,
    color: 'rgba(17, 17, 17, 0.86)',
    marginBottom: 4,
  },
  deviceId: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(17, 17, 17, 0.5)',
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
    fontSize: 14,
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

  // Log styles
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#06492C',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#06492C',
    marginRight: 8,
  },
  sortOptionsContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 2000,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#06492C',
  },
  selectedSortOption: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#339432',
  },
  sortModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'absolute',
    top: 60,
    right: 16,
  },
  logsContainer: {
    backgroundColor: '#f6fef8',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    maxHeight: 450, // Limit height to ensure it fits on one screen
  },
  logsContentContainer: {
    paddingBottom: 8,
  },
  logEntry: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
    marginRight: 8,
  },
  logTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  logMessage: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  logDate: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: Colors.darkGray,
    alignSelf: 'flex-start',
    minWidth: 50,
    textAlign: 'right',
  },
  // Settings styles
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
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
  settingIconContainerRound: {
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
