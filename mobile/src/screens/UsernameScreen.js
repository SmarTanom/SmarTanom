import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BackButton } from '../components/Icons';
import { AuthLayout } from '../components/AuthLayout';
import { useResponsive } from '../hooks/useResponsive';
import { useAuthFlow } from '../context/AuthFlowContext';

const UsernameScreen = ({ navigation }) => {
  const { email, verificationCode, setUsername } = useAuthFlow();
  const [inputUsername, setInputUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleUsernameChange = (text) => {
    // Remove spaces and convert to lowercase
    const cleanText = text.replace(/\s/g, '').toLowerCase();
    setInputUsername(cleanText);
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleContinue = async () => {
    if (!inputUsername) {
      setError('Username is required');
      return;
    }

    if (!isValidUsername(inputUsername)) {
      setError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call to create account
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate username availability check
      if (inputUsername === 'admin' || inputUsername === 'test' || inputUsername === 'user') {
        throw new Error('Username already taken');
      }
      
      setUsername(inputUsername);
      
      // Show success message and navigate to home
      Alert.alert(
        'Account Created!',
        'Your SmarTanom account has been successfully created.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      if (err.message === 'Username already taken') {
        setError('This username is already taken. Please choose another one.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const suggestedUsernames = [
    `smartgardener${Math.floor(Math.random() * 100)}`,
    `hydrogrower${Math.floor(Math.random() * 100)}`,
    `plantlover${Math.floor(Math.random() * 100)}`,
  ];

  const handleSuggestionPress = (suggestion) => {
    setInputUsername(suggestion);
    setError('');
  };

  const { clampVw } = useResponsive();

  return (
    <AuthLayout headerLeft={<BackButton onPress={() => navigation.goBack()} />}> 
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        <View style={[styles.titleSection]}> 
          <Text style={[styles.title, { fontSize: clampVw(28, 8, 72) }]}>Choose Your Username</Text>
          <Text style={[styles.subtitle, { fontSize: clampVw(14, 3.5, 20) }]}>Pick a unique username for your SmarTanom account. This will be your identity in the community.</Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={inputUsername}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            <View style={styles.inputHint}>
              <Text style={styles.hintText}>3-20 characters, lowercase letters, numbers, and underscores only</Text>
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>Suggestions:</Text>
          <View style={styles.suggestionsContainer}>
            {suggestedUsernames.map((suggestion, index) => (
              <TouchableOpacity key={index} style={styles.suggestionChip} onPress={() => handleSuggestionPress(suggestion)} activeOpacity={0.85}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.92}
          >
            <Text style={styles.continueButtonText}>{loading ? 'Creating Account...' : 'Complete Setup'}</Text>
          </TouchableOpacity>
          <Text style={styles.termsText}>Your username will be visible to other users and cannot be changed later.</Text>
        </View>
      </KeyboardAwareScrollView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    gap: 12,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  inputSection: {
    width: '100%',
    gap: 8,
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ffb3b3',
    backgroundColor: 'rgba(255,0,0,0.10)',
  },
  inputHint: {
    paddingHorizontal: 8,
  },
  hintText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#ffcccb',
    paddingHorizontal: 8,
  },
  suggestionsSection: {
    width: '100%',
    gap: 12,
  },
  suggestionsTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  suggestionText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  actions: {
    width: '100%',
    gap: 20,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#016b22',
    letterSpacing: 0.5,
  },
  termsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default UsernameScreen;