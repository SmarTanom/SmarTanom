import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BackButton } from '../components/Icons';
import { AuthLayout } from '../components/AuthLayout';
import { useResponsive } from '../hooks/useResponsive';
import { useAuthFlow } from '../context/AuthFlowContext';

const CodeScreen = ({ navigation, route }) => {
  const { mode = 'signin' } = route.params || {};
  const { email, setVerificationCode } = useAuthFlow();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);
  const [otpSize, setOtpSize] = useState(54);
  const [otpGap, setOtpGap] = useState(8);

  // Use screen width to compute box size and gap (~2% of width), ensure ≥44pt
  const { width } = useResponsive();
  React.useEffect(() => {
    const COUNT = 6;
    const sidePad = 16; // container side padding
    const available = Math.max(200, width - sidePad * 2);
    const baseGap = Math.max(4, Math.min(16, Math.round(width * 0.02))); // ~2% width
    let size = Math.floor((available - baseGap * (COUNT - 1)) / COUNT);

    if (size < 44) {
      // Recompute minimal gap to keep 44pt boxes within available width
      const gap2 = Math.max(2, Math.floor((available - 44 * COUNT) / (COUNT - 1)));
      setOtpGap(gap2);
      setOtpSize(44);
    } else {
      // Allow bigger boxes on larger screens but keep proportional
      const maxBox = Math.min(72, Math.round(width * 0.14));
      setOtpGap(baseGap);
      setOtpSize(Math.max(44, Math.min(maxBox, size)));
    }
  }, [width]);

  const handleDigitChange = (index, value) => {
    // Only allow single digits
    if (value.length > 1) return;
    
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleKeyPress = (index, key) => {
    // Handle backspace to go to previous input
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVerificationCode(code);
      
      if (mode === 'signup') {
        navigation.navigate('Username');
      } else {
        navigation.navigate('Home');
      }
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
  };

  const maskedEmail = email.replace(/(.{3}).*(@.*)/, '$1***$2');

  const { clampVw } = useResponsive();

  return (
    <AuthLayout headerLeft={<BackButton onPress={() => navigation.goBack()} />}> 
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 24, paddingBottom: 24, paddingHorizontal: 8 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        <View style={[styles.titleSection, { alignItems: 'center' }]}>
          <Text style={[styles.title, { fontSize: clampVw(28, 8, 72), textAlign: 'center' }]}>Verify Your Identity</Text>
          <Text style={[styles.subtitle, { fontSize: clampVw(14, 3.5, 20), textAlign: 'center' }]}>Enter the 6-digit code sent to {maskedEmail}</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.otpContainer}>
            <View style={[styles.otpGrid, { gap: otpGap }]}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  { width: otpSize, height: otpSize, fontSize: Math.max(16, Math.round(otpSize * 0.36)) },
                  error && styles.otpInputError,
                ]}
                value={digit}
                onChangeText={value => handleDigitChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus={true}
              />
            ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </KeyboardAvoidingView>

        <View style={[styles.actions, { alignItems: 'center' }]}>
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.disabledButton]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.92}
          >
            <Text style={styles.verifyButtonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendButton} onPress={handleResendCode} activeOpacity={0.85}>
            <Text style={styles.resendButtonText}>Didn't receive a code? Resend</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>Check your email inbox and spam folder for the verification code.</Text>
        </View>
      </KeyboardAwareScrollView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'AbrilFatface_400Regular',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  otpContainer: {
    alignItems: 'center',
    gap: 16,
  },
  otpGrid: {
    width: '92%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    color: '#ffffff',
  },
  otpInputError: {
    borderColor: '#ffb3b3',
    backgroundColor: 'rgba(255,0,0,0.10)',
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#ffcccb',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 20,
    alignItems: 'center',
  },
  verifyButton: {
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
  verifyButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#016b22',
    letterSpacing: 0.5,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
  helperText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});

export default CodeScreen;