import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand } from '../components/Brand';
import { User } from '../components/Icons';
import { useAuthFlow } from '../context/AuthFlowContext';

const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { email, username } = useAuthFlow();

  const features = [
    {
      title: 'Smart Monitoring',
      description: 'Real-time tracking of your hydroponic system parameters',
      icon: '📊',
    },
    {
      title: 'Automated Control',
      description: 'Intelligent automation for optimal plant growth',
      icon: '🤖',
    },
    {
      title: 'Growth Analytics',
      description: 'Detailed insights and analytics for your crops',
      icon: '📈',
    },
    {
      title: 'Remote Access',
      description: 'Monitor and control your system from anywhere',
      icon: '🌐',
    },
  ];

  const quickActions = [
    {
      title: 'View System Status',
      description: 'Check current system health',
      color: '#4caf50',
    },
    {
      title: 'Manage Plants',
      description: 'Add or monitor your plants',
      color: '#2196f3',
    },
    {
      title: 'System Settings',
      description: 'Configure automation rules',
      color: '#ff9800',
    },
    {
      title: 'Data Analytics',
      description: 'View growth reports',
      color: '#9c27b0',
    },
  ];

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
            <Brand showText={true} variant="white" size={32} />
            <TouchableOpacity style={styles.profileButton}>
              <User size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              {username ? `@${username}` : email}
            </Text>
            <Text style={styles.welcomeDescription}>
              Your smart hydroponic system is ready to help you grow amazing plants
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>{action.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Features Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Features</Text>
            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* System Status Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Overview</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusCard}>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                  <Text style={styles.statusText}>System Online</Text>
                </View>
                <Text style={styles.statusDetails}>All systems operational</Text>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>24°C</Text>
                  <Text style={styles.metricLabel}>Temperature</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>65%</Text>
                  <Text style={styles.metricLabel}>Humidity</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>6.5</Text>
                  <Text style={styles.metricLabel}>pH Level</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Get Started Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.getStartedButton} activeOpacity={0.9}>
              <Text style={styles.getStartedButtonText}>Explore Your Dashboard</Text>
            </TouchableOpacity>
            
            <Text style={styles.footerText}>
              SmarTanom - Smart Hydroponic Management System
            </Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  welcomeTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 36,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  welcomeDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  featureDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  statusContainer: {
    gap: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  statusDetails: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    paddingLeft: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: '#ffffff',
  },
  metricLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  actionSection: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  getStartedButton: {
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
  getStartedButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#339432',
    letterSpacing: 0.5,
  },
  footerText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default HomeScreen;