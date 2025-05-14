import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const plantTypes = [
  {
    id: '1',
    name: 'Romaine',
    type: 'Lettuce',
    image: require('../assets/romaine.png'),
  },
  {
    id: '2',
    name: 'Butterhead',
    type: 'Lettuce',
    image: require('../assets/butterhead.png'), 
  },
  {
    id: '3',
    name: 'Batavia',
    type: 'Lettuce',
    image: require('../assets/batavia.png'), 
  },
  {
    id: '4',
    name: 'Pechay',
    type: 'Bok Choy',
    image: require('../assets/pechay.png'), 
  },
];

export default function NewCycleScreen({ navigation, route }) {
  const { device } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlants, setSelectedPlants] = useState([]);

  const filteredPlants = plantTypes.filter(plant =>
    plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlantSelection = (plantId) => {
    if (selectedPlants.includes(plantId)) {
      setSelectedPlants(selectedPlants.filter(id => id !== plantId));
    } else {
      setSelectedPlants([...selectedPlants, plantId]);
    }
  };

  const handleStartCycle = () => {
    // Here you would implement the logic to start a new growing cycle
    // with the selected plants

    // For now, just navigate back to the device detail screen
    navigation.navigate('DeviceDetail', {
      device,
      newCycleStarted: true,
      selectedPlants: selectedPlants.map(id =>
        plantTypes.find(plant => plant.id === id)
      )
    });
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@smartanom.com?subject=Plant%20Request');
  };

  const renderPlantItem = ({ item }) => (
    <View style={styles.plantItem}>
      <View style={styles.plantInfo}>
        <Image source={item.image} style={styles.plantImage} />
        <View style={styles.plantTextContainer}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantType}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.selectButton,
            selectedPlants.includes(item.id) && styles.selectedButton
          ]}
          onPress={() => togglePlantSelection(item.id)}
        >
          <Ionicons
            name={selectedPlants.includes(item.id) ? "checkmark" : "add"}
            size={20}
            color={selectedPlants.includes(item.id) ? Colors.white : Colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoButton}>
          <MaterialCommunityIcons name="sprout" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Starting a New Cycle!</Text>
          <Text style={styles.subtitle}>
            Choose the type of plant you're growing to get tailored monitoring and nutrient recommendations.
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.darkGray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.darkGray}
          />
        </View>

        <FlatList
          data={filteredPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.plantList}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              selectedPlants.length === 0 && styles.disabledButton
            ]}
            onPress={handleStartCycle}
            disabled={selectedPlants.length === 0}
          >
            <Text style={styles.startButtonText}>Start Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportLink}
            onPress={handleContactSupport}
          >
            <Text style={styles.supportLinkText}>
              Don't see your plant? <Text style={styles.supportLinkHighlight}>Message us</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'AbhayaLibre_800ExtraBold',
    fontSize: 28,
    color: Colors.secondary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.darkGray,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 25,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.secondary,
  },
  plantList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  plantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plantImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  plantTextContainer: {
    marginLeft: 12,
  },
  plantName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
  },
  plantType: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.darkGray,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f6fef8',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: 'rgba(51, 148, 50, 0.5)',
  },
  startButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: Colors.white,
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  supportLinkText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.darkGray,
  },
  supportLinkHighlight: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
