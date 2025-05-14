import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const checklistItems = [
  'Hardware (Sensor, ESP32, Solar Panel, Battery)',
  'Firmware (ESP32 Code)',
  'Mobile App (React Native)',
  'Web App (React/Django)',
  'Cloud Backend/API (Django/Database)',
  'Communication (Wi-Fi, MQTT, HTTP)',
  'UX/UI',
];

export default function ReportIssueScreen({ navigation }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [comments, setComments] = useState('');

  const toggleItem = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSend = () => {
    Alert.alert('Report Sent', 'Thank you for reporting the issue.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainApp');
            }
          }}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityHint="Navigates to the previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report a problem</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.description}>
          We will help you as soon as you describe the problem in the paragraphs below.
        </Text>

        <TouchableOpacity style={styles.addPhotoButton} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={20} color={Colors.primary} style={styles.addPhotoIcon} />
          <View>
            <Text style={styles.addPhotoText}>+ Add a photo</Text>
            <Text style={styles.photoNote}>Maximum 1 photo with a total size of up to 5 mb</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.checklistTitle}>Component Affected: (Select one or more)</Text>
        {checklistItems.map((item, index) => (
          <View key={index} style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => toggleItem(item)}
              style={[styles.checkbox, selectedItems.includes(item) && styles.checkboxSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedItems.includes(item) }}
              accessibilityLabel={item}
            >
              {selectedItems.includes(item) && <Ionicons name="checkmark" size={20} color={Colors.white} />}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>{item}</Text>
          </View>
        ))}

        <Text style={styles.commentsLabel}>Comments</Text>
        <TextInput
          style={styles.commentsInput}
          multiline
          maxLength={140}
          placeholder="Here you can describe the problem in more detail"
          value={comments}
          onChangeText={setComments}
          textAlignVertical="top"
          accessibilityLabel="Comments input"
        />
        <Text style={styles.charCount}>{comments.length}/140</Text>

        <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Send report">
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkText,
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    color: Colors.darkText,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
  },
  addPhotoIcon: {
    marginRight: 10,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  photoNote: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 3,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: Colors.darkText,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.darkText,
    flexShrink: 1,
  },
  commentsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 12,
    color: Colors.darkText,
  },
  commentsInput: {
    height: 110,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.darkText,
    backgroundColor: Colors.white,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: 12,
    color: Colors.darkGray,
  },
  sendButton: {
    marginTop: 30,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
