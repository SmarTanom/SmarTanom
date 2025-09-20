import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand } from '../components/Brand';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  return (
    <LinearGradient
      colors={['#2d7d32', '#339432', '#43a047']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Brand showText={true} variant="white" size={48} />
          </View>

          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              Smart Hydroponic{'\n'}Monitoring
            </Text>
            <Text style={styles.heroSubtitle}>
              Take control of your hydroponic garden with intelligent monitoring and automation
            </Text>
          </View>

          {/* Background Image Placeholder */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🌱</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignUpEmail')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('SignInEmail')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Features Preview */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureTitle}>Real-time Analytics</Text>
              <Text style={styles.featureText}>Monitor pH, nutrients, and growth metrics</Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureTitle}>Smart Automation</Text>
              <Text style={styles.featureText}>Automated feeding and climate control</Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureTitle}>Remote Control</Text>
              <Text style={styles.featureText}>Manage your garden from anywhere</Text>
            </View>
          </View>
        </ScrollView>
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
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: Math.min(42, width * 0.11),
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: Math.min(50, width * 0.13),
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imagePlaceholder: {
    width: Math.min(300, width * 0.8),
    height: Math.min(200, width * 0.53),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  actions: {
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
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
  primaryButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#339432',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  features: {
    gap: 24,
  },
  feature: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LandingScreen;