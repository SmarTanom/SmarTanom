import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function CycleSettingsScreen({ navigation, route }) {
  const { device } = route.params;
  const [currentCycle, setCurrentCycle] = useState({
    plant: 'Romaine Lettuce',
    startDate: '2023-10-15',
    estimatedHarvestDate: '2023-11-25',
    daysSinceStart: 42,
    daysToHarvest: 10,
    stage: 'Growth',
  });

  const [cycles, setCycles] = useState([
    {
      id: '1',
      plant: 'Basil',
      startDate: '2023-08-01',
      endDate: '2023-09-15',
      status: 'completed',
      notes: 'Excellent yield, slightly higher pH than optimal',
    },
    {
      id: '2',
      plant: 'Spinach',
      startDate: '2023-09-20',
      endDate: '2023-10-10',
      status: 'completed',
      notes: 'Lower yield due to temperature fluctuations',
    },
  ]);

  const [newCycleData, setNewCycleData] = useState({
    plant: '',
    startDate: '',
    estimatedHarvestDate: '',
  });

  const [showNewCycleForm, setShowNewCycleForm] = useState(false);

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

  const handleInputChange = (field, value) => {
    setNewCycleData({
      ...newCycleData,
      [field]: value,
    });
  };

  const addNewCycle = () => {
    // In a real app, this would validate and save to backend
    setShowNewCycleForm(false);
    setNewCycleData({
      plant: '',
      startDate: '',
      estimatedHarvestDate: '',
    });
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
        <Text style={styles.headerTitle}>Cycle Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Current Growing Cycle</Text>
          
          <View style={styles.currentCycleContainer}>
            <View style={styles.plantIconContainer}>
              <MaterialCommunityIcons name="sprout" size={24} color={Colors.primary} />
            </View>
            <View style={styles.cycleInfo}>
              <Text style={styles.plantName}>{currentCycle.plant}</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Started:</Text>
                <Text style={styles.dateValue}>{currentCycle.startDate}</Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Estimated Harvest:</Text>
                <Text style={styles.dateValue}>{currentCycle.estimatedHarvestDate}</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(currentCycle.daysSinceStart / (currentCycle.daysSinceStart + currentCycle.daysToHarvest)) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentCycle.daysSinceStart} days since planting • {currentCycle.daysToHarvest} days to harvest
                </Text>
              </View>
              <View style={styles.stageContainer}>
                <Text style={styles.stageLabel}>Current Stage:</Text>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageText}>{currentCycle.stage}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Edit Current Cycle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Previous Cycles</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowNewCycleForm(!showNewCycleForm)}
            >
              <Ionicons name={showNewCycleForm ? "close" : "add"} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {showNewCycleForm && (
            <View style={styles.newCycleForm}>
              <Text style={styles.formTitle}>Start New Cycle</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Plant Type</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCycleData.plant}
                  onChangeText={(text) => handleInputChange('plant', text)}
                  placeholder="e.g., Lettuce, Basil, Spinach"
                  placeholderTextColor="#AAAAAA"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCycleData.startDate}
                  onChangeText={(text) => handleInputChange('startDate', text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#AAAAAA"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Estimated Harvest Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCycleData.estimatedHarvestDate}
                  onChangeText={(text) => handleInputChange('estimatedHarvestDate', text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#AAAAAA"
                />
              </View>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={addNewCycle}
              >
                <Text style={styles.buttonText}>Start New Cycle</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {cycles.map(cycle => (
            <View key={cycle.id} style={styles.cycleItem}>
              <View style={styles.cycleHeader}>
                <Text style={styles.cyclePlant}>{cycle.plant}</Text>
                <View style={[styles.statusBadge, cycle.status === 'completed' ? styles.completedBadge : styles.activeBadge]}>
                  <Text style={styles.statusText}>{cycle.status}</Text>
                </View>
              </View>
              
              <View style={styles.cycleDates}>
                <Text style={styles.cycleDate}>{cycle.startDate} to {cycle.endDate}</Text>
              </View>
              
              {cycle.notes && (
                <Text style={styles.cycleNotes}>{cycle.notes}</Text>
              )}
            </View>
          ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentCycleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  plantIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cycleInfo: {
    flex: 1,
  },
  plantName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dateLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
    width: 120,
  },
  dateValue: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.secondary,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
  },
  stageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stageLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  stageBadge: {
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  editButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  newCycleForm: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  textInput: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.secondary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cycleItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cyclePlant: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  statusText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: Colors.primary,
  },
  cycleDates: {
    marginBottom: 4,
  },
  cycleDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  cycleNotes: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
});
