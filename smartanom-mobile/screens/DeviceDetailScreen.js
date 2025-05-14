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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import * as ImagePicker from 'expo-image-picker';
import { useDeviceImages } from '../context/DeviceImageContext';
import Colors from '../constants/Colors';

export default function DeviceDetailScreen({ route }) {
  const navigation = useNavigation();
  const { device } = route.params;
  const [activeTab, setActiveTab] = useState('PLANTS');
  const { getDeviceImage, updateDeviceImage } = useDeviceImages();
  const [currentImage, setCurrentImage] = useState(getDeviceImage(device.id));
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

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
});
