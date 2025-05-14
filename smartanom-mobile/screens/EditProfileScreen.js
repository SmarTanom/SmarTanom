import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { AppSettingsContext } from '../context/AppSettingsContext';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUserProfile } = useContext(AuthContext);
  const { darkMode } = useContext(AppSettingsContext);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  const styles = getStyles(darkMode);

  const handleSave = async () => {
    if (!password) {
      alert('Please enter your password for confirmation');
      return;
    }

    const updated = await updateUserProfile({ name, email, password });

    if (updated) {
      navigation.goBack();
    } else {
      alert('Failed to update profile');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor={darkMode ? Colors.lightGray : Colors.darkGray}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor={darkMode ? Colors.lightGray : Colors.darkGray}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={darkMode ? Colors.lightGray : Colors.darkGray}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (darkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: darkMode ? Colors.darkBackground : Colors.white,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    backButton: {
      backgroundColor: Colors.primary,
      padding: 10,
      borderRadius: 25,
      marginRight: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: darkMode ? Colors.white : Colors.darkText,
    },
    input: {
      height: 45,
      borderColor: Colors.lightGray,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 15,
      color: darkMode ? Colors.white : Colors.darkText,
      backgroundColor: darkMode ? '#1c1c1e' : Colors.white,
    },
    button: {
      backgroundColor: Colors.primary,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: Colors.white,
      fontSize: 16,
    },
  });
