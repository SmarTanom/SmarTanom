import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Brand } from '../components/Brand';
import { BackButton } from '../components/Icons';
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

  return (
    <LinearGradient
      colors={['#2d7d32', '#339432', '#43a047']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={50}
        >
          {/* Header */}
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <Brand showText={true} variant="white" size={32} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Choose Your Username</Text>
              <Text style={styles.subtitle}>
                Create a unique username for your SmarTanom account
              </Text>
            </View>

            {/* Username Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={inputUsername}
                  onChangeText={handleUsernameChange}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                <View style={styles.inputHint}>
                  <Text style={styles.hintText}>
                    3-20 characters, letters, numbers, and underscores only
                  </Text>
                </View>
              </View>
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* Suggestions */}
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              <View style={styles.suggestionsContainer}>
                {suggestedUsernames.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(suggestion)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.continueButton, loading && styles.disabledButton]}
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  content: {
    flex: 1,
    gap: 32,
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 32,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
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
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ffcccb',
    backgroundColor: 'rgba(255,0,0,0.1)',
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
    fontFamily: 'Montserrat_500Medium',
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
    borderRadius: 12,
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
    color: '#339432',
    letterSpacing: 0.5,
  },
  termsText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});

export default UsernameScreen;