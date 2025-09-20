import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Brand } from '../components/Brand';
import { BackButton, Mail } from '../components/Icons';
import { useAuthFlow } from '../context/AuthFlowContext';

const EmailScreen = ({ navigation, route }) => {
  const { mode = 'signin' } = route.params || {};
  const { setMode, email, setEmail } = useAuthFlow();
  const [localEmail, setLocalEmail] = useState(email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  const validateEmail = (emailText) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText);
  };

  const handleContinue = async () => {
    setError('');
    
    if (!localEmail.trim()) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(localEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setEmail(localEmail);
      
      // Navigate to code verification
      const nextScreen = mode === 'signin' ? 'SignInCode' : 'SignUpCode';
      navigation.navigate(nextScreen);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'signin' ? 'Welcome Back' : 'Create Account';
  const subtitle = mode === 'signin' 
    ? 'Sign in to access your hydroponic dashboard'
    : 'Join the SmarTanom community and start monitoring your garden';

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
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#ffffff" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={localEmail}
                    onChangeText={setLocalEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.continueButton, loading && styles.disabledButton]}
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Sending...' : 'Continue'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.helperText}>
                We'll send you a verification code to confirm your email address
              </Text>
            </View>

            {/* Switch Mode */}
            <View style={styles.switchMode}>
              <Text style={styles.switchText}>
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const nextScreen = mode === 'signin' ? 'SignUpEmail' : 'SignInEmail';
                  navigation.replace(nextScreen);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.switchLink}>
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </Text>
              </TouchableOpacity>
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
  },
  titleSection: {
    gap: 12,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 36,
    color: '#ffffff',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#ffcccb',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
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
  helperText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  switchText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  switchLink: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
});

export default EmailScreen;