import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BackButton, Mail } from '../components/Icons';
import { AuthLayout } from '../components/AuthLayout';
import { useResponsive } from '../hooks/useResponsive';
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

  const { clampVw } = useResponsive();

  return (
    <AuthLayout
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
    >
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontSize: clampVw(28, 8, 72) }]}>{title}</Text>
          <Text style={[styles.subtitle, { fontSize: clampVw(14, 3.5, 20) }]}>{subtitle}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#ffffff" />
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
            style={[styles.submit, loading && styles.disabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.92}
          >
            <Text style={styles.submitText}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>We'll send a secure code to verify your identity.</Text>
        </View>

        <View style={styles.switchMode}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const nextScreen = mode === 'signin' ? 'SignUpEmail' : 'SignInEmail';
              navigation.replace(nextScreen);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.switchLink}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Text>
          </TouchableOpacity>
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
  form: {
    gap: 20,
    marginTop: 14, // a bit more breathing room above EMAIL label
  },
  inputContainer: {
    gap: 10,
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
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
    paddingVertical: 2,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#ffcccb',
    marginTop: 4,
  },
  submit: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  disabled: {
    opacity: 0.7,
  },
  submitText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#016b22',
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