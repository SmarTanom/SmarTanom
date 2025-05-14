import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Share,
  Alert,
  TextInput,
  Platform,
  Clipboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Colors from '../constants/Colors';

export default function SyncSettingsScreen({ navigation, route }) {
  const { device } = route.params;
  const [syncCode, setSyncCode] = useState('TANOM-4F8A-9C2D-7E6B');
  const [sharedUsers, setSharedUsers] = useState([
    { id: 1, name: 'Maria Garcia', email: 'maria@example.com', permission: 'view' },
    { id: 2, name: 'John Smith', email: 'john@example.com', permission: 'admin' }
  ]);
  const [inviteEmail, setInviteEmail] = useState('');

  const generateNewCode = () => {
    // In a real app, this would call an API to generate a new code
    // For demo purposes, we'll just create a random code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TANOM-';
    for (let i = 0; i < 12; i++) {
      if (i % 4 === 0 && i > 0) result += '-';
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setSyncCode(result);

    Alert.alert(
      'New Sync Code Generated',
      'Your new sync code has been generated. The old code is no longer valid.',
      [{ text: 'OK' }]
    );
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Use this code to sync with my SmarTanom device: ${syncCode}`,
        title: 'SmarTanom Sync Code'
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the sync code.');
    }
  };

  const copyToClipboard = () => {
    try {
      Clipboard.setString(syncCode);
      Alert.alert('Copied', 'Sync code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  };

  const inviteUser = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // In a real app, this would send an invitation to the user
    // For demo purposes, we'll just add them to the list
    const newUser = {
      id: sharedUsers.length + 1,
      name: inviteEmail.split('@')[0], // Use part of email as name
      email: inviteEmail,
      permission: 'view'
    };

    setSharedUsers([...sharedUsers, newUser]);
    setInviteEmail('');

    Alert.alert(
      'Invitation Sent',
      `An invitation has been sent to ${inviteEmail}`,
      [{ text: 'OK' }]
    );
  };

  const removeUser = (userId) => {
    Alert.alert(
      'Remove User',
      'Are you sure you want to remove this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSharedUsers(sharedUsers.filter(user => user.id !== userId));
          }
        }
      ]
    );
  };

  const changePermission = (userId, newPermission) => {
    setSharedUsers(sharedUsers.map(user =>
      user.id === userId ? { ...user, permission: newPermission } : user
    ));
  };

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.syncCodeCard}>
          <Text style={styles.cardTitle}>SmarTanom Sync Code</Text>
          <Text style={styles.cardDescription}>
            Share this code with others to allow them to monitor your SmarTanom device.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.syncCode}>{syncCode}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.codeActionButton} onPress={copyToClipboard}>
                <Ionicons name="copy-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.codeActionButton} onPress={shareCode}>
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateNewCode}
          >
            <Ionicons name="refresh" size={18} color={Colors.primary} style={styles.buttonIcon} />
            <Text style={styles.generateButtonText}>Generate New Code</Text>
          </TouchableOpacity>

          <View style={styles.qrCodeContainer}>
            <View style={styles.qrCode}>
              <View style={styles.qrCodeInner}>
                <View style={styles.qrCodePattern}>
                  <View style={styles.qrCodeCorner} />
                </View>
              </View>
            </View>
            <Text style={styles.qrCodeText}>Scan this QR code to sync</Text>
          </View>
        </View>

        <View style={styles.sharedUsersCard}>
          <Text style={styles.cardTitle}>Shared With</Text>

          {sharedUsers.map((user) => (
            <View key={user.id} style={styles.userItem}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    user.permission === 'admin' && styles.permissionButtonActive
                  ]}
                  onPress={() => changePermission(user.id, 'admin')}
                >
                  <Text style={[
                    styles.permissionText,
                    user.permission === 'admin' && styles.permissionTextActive
                  ]}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    user.permission === 'view' && styles.permissionButtonActive
                  ]}
                  onPress={() => changePermission(user.id, 'view')}
                >
                  <Text style={[
                    styles.permissionText,
                    user.permission === 'view' && styles.permissionTextActive
                  ]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeUser(user.id)}
                >
                  <Ionicons name="close" size={18} color="#CD5151" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.inviteContainer}>
            <TextInput
              style={styles.inviteInput}
              placeholder="Enter email to invite"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={inviteUser}
            >
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.syncInfoCard}>
          <Text style={styles.cardTitle}>Sync Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Synced:</Text>
            <Text style={styles.infoValue}>Today, 2:45 PM</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sync Frequency:</Text>
            <Text style={styles.infoValue}>Every 15 minutes</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data Usage:</Text>
            <Text style={styles.infoValue}>Low (5MB/day)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6fef8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  syncCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 8,
  },
  cardDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 148, 50, 0.05)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncCode: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    letterSpacing: 1,
  },
  codeActions: {
    flexDirection: 'row',
  },
  codeActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  qrCode: {
    width: 150,
    height: 150,
    marginBottom: 8,
    backgroundColor: 'white',
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodePattern: {
    width: '85%',
    height: '85%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  qrCodeCorner: {
    width: '70%',
    height: '70%',
    borderWidth: 8,
    borderColor: Colors.secondary,
    borderRadius: 8,
  },
  qrCodeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  sharedUsersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#666666',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
    backgroundColor: '#F0F0F0',
  },
  permissionButtonActive: {
    backgroundColor: 'rgba(51, 148, 50, 0.1)',
  },
  permissionText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#666666',
  },
  permissionTextActive: {
    color: Colors.primary,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(205, 81, 81, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inviteContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  inviteInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    marginRight: 8,
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  syncInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
  },
});
