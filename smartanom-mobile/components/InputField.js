import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export default function InputField({ placeholder, secureTextEntry = false, onChangeText, value }) {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        placeholder={placeholder}
        style={styles.input}
        secureTextEntry={secureTextEntry}
        onChangeText={onChangeText}
        value={value}
        placeholderTextColor={Colors.lightGray}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 10,
  },
  input: {
    fontSize: 16,
    color: Colors.darkText,
  },
});
