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
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbhayaLibre_800ExtraBold } from '@expo-google-fonts/abhaya-libre';
import Colors from '../constants/Colors';

export default function CycleSettingsScreen({ navigation, route }) {
  const { device } = route.params;
  const [currentCycle, setCurrentCycle] = useState({
    plant: 'Romaine Lettuce',
    startDate: 'May 1, 2025',
    estimatedHarvestDate: 'June 5, 2025',
    daysRemaining: 35,
    progress: 0.3, // 30% complete
    image: require('../assets/romaine.png')
  });

  const [showPlantSelector, setShowPlantSelector] = useState(false);

  // Available plants for growing
  const availablePlants = [
    { id: 1, name: 'Romaine Lettuce', cycleDays: 35, image: require('../assets/romaine.png') },
    { id: 2, name: 'Basil', cycleDays: 28, image: require('../assets/hydroponic-plant.jpg') },
    { id: 3, name: 'Spinach', cycleDays: 30, image: require('../assets/porch-plant.png') },
    { id: 4, name: 'Kale', cycleDays: 40, image: require('../assets/romaine.png') },
    { id: 5, name: 'Arugula', cycleDays: 25, image: require('../assets/hydroponic-plant.jpg') },
  ];

  const selectPlant = (plant) => {
    // Calculate new dates based on today
    const today = new Date();
    const startDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const harvestDate = new Date();
    harvestDate.setDate(today.getDate() + plant.cycleDays);
    const estimatedHarvestDate = harvestDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Update current cycle
    setCurrentCycle({
      plant: plant.name,
      startDate: startDate,
      estimatedHarvestDate: estimatedHarvestDate,
      daysRemaining: plant.cycleDays,
      progress: 0, // Just started
      image: plant.image
    });

    // Close modal
    setShowPlantSelector(false);
  };

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
        <Text style={styles.headerTitle}>Cycle Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.currentCycleCard}>
          <Text style={styles.cardTitle}>Current Growing Cycle</Text>

          <View style={styles.plantInfoContainer}>
            <Image source={currentCycle.image} style={styles.plantImage} />
            <View style={styles.plantDetails}>
              <Text style={styles.plantName}>{currentCycle.plant}</Text>
              <View style={styles.dateContainer}>
                <MaterialCommunityIcons name="calendar-start" size={16} color={Colors.primary} style={styles.dateIcon} />
                <Text style={styles.dateText}>Started: {currentCycle.startDate}</Text>
              </View>
              <View style={styles.dateContainer}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.primary} style={styles.dateIcon} />
                <Text style={styles.dateText}>Harvest: {currentCycle.estimatedHarvestDate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${currentCycle.progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentCycle.daysRemaining} days until harvest
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newCycleButton}
          onPress={() => setShowPlantSelector(true)}
        >
          <MaterialCommunityIcons name="sprout" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Start New Cycle</Text>
        </TouchableOpacity>

        <View style={styles.cycleInfoCard}>
          <Text style={styles.cardTitle}>Cycle Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nutrient Solution:</Text>
            <Text style={styles.infoValue}>Standard Hydroponic Mix</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Light Schedule:</Text>
            <Text style={styles.infoValue}>16 hours on / 8 hours off</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target pH:</Text>
            <Text style={styles.infoValue}>5.8 - 6.2</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target EC:</Text>
            <Text style={styles.infoValue}>1.5 - 2.0 mS/cm</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Water Change:</Text>
            <Text style={styles.infoValue}>Every 14 days</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={20} color={Colors.primary} style={styles.buttonIcon} />
          <Text style={styles.settingsButtonText}>Customize Cycle Parameters</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Plant Selection Modal */}
      <Modal
        visible={showPlantSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlantSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plant for New Cycle</Text>
              <TouchableOpacity onPress={() => setShowPlantSelector(false)}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availablePlants}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.plantItem}
                  onPress={() => selectPlant(item)}
                >
                  <Image source={item.image} style={styles.plantItemImage} />
                  <View style={styles.plantItemDetails}>
                    <Text style={styles.plantItemName}>{item.name}</Text>
                    <Text style={styles.plantItemCycle}>{item.cycleDays} days to harvest</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.plantList}
            />
          </View>
        </View>
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
  currentCycleCard: {
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
  cardTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 16,
  },
  plantInfoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  plantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  plantDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  plantName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateIcon: {
    marginRight: 6,
  },
  dateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
  },
  newCycleButton: {
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
  cycleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
  },
  settingsButton: {
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
  },
  plantList: {
    paddingHorizontal: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  plantItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  plantItemDetails: {
    flex: 1,
  },
  plantItemName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 4,
  },
  plantItemCycle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
  },
});
