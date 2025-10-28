import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../src/theme';
import api, { getProfile, updateProfile, listDevices } from '../src/services/api';

export default function ProfilePage({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    fetchProfileAndDevices();
  }, []);

  async function fetchProfileAndDevices() {
    setLoading(true);
    try {
      const token = global.authToken || await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');
      const prof = await getProfile(token);
      setUser(mapProfile(prof));
      setFirstName(prof.first_name || '');
      setLastName(prof.last_name || '');
      // devices
      try {
        const devs = await listDevices(token);
        const list = Array.isArray(devs) ? devs : (devs.results || []);
        setDevices(list);
      } catch (e) {
        setDevices([]);
      }
    } catch (e) {
      console.warn('[Profile] fetch failed', e.message || e);
    } finally {
      setLoading(false);
    }
  }

  function mapProfile(p) {
    if (!p) return null;
    return {
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      fullName: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      role: p.role || (p.is_admin ? 'admin' : 'user'),
      photoUrl: p.user_photo_url || null,
      joinedDate: p.date_joined || p.created_at || p.created || null,
    };
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Allow photo access to change your profile picture');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (result.cancelled) return;
      setPhotoUri(result.uri);
      // fetch blob for upload
      try {
        const res = await fetch(result.uri);
        const blob = await res.blob();
        setPhotoBlob({ uri: result.uri, blob, name: `photo.${Platform.OS === 'android' ? 'jpg' : 'jpg'}`, type: blob.type || 'image/jpeg' });
      } catch (err) {
        console.warn('Failed to prepare image blob', err);
        setPhotoBlob(null);
      }
    } catch (err) {
      console.warn('Image pick failed', err);
    }
  }

  function beginEdit() {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhotoUri(user.photoUrl || null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setPhotoBlob(null);
    setPhotoUri(user?.photoUrl || null);
  }

  async function saveProfile() {
    const token = global.authToken || await AsyncStorage.getItem('authToken');
    if (!token) return Alert.alert('Not authenticated');
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Validation', 'First and last name are required');
    setSaving(true);
    try {
      let resp;
      if (photoBlob && photoBlob.blob) {
        const fd = new FormData();
        fd.append('first_name', firstName.trim());
        fd.append('last_name', lastName.trim());
        // append blob
        fd.append('user_photo', photoBlob.blob, photoBlob.name);
        resp = await updateProfile(token, fd);
      } else {
        resp = await updateProfile(token, { first_name: firstName.trim(), last_name: lastName.trim() });
      }
      setUser(mapProfile(resp));
      setIsEditing(false);
      setPhotoBlob(null);
      Alert.alert('Saved', 'Profile updated');
    } catch (e) {
      console.warn('Save failed', e.message || e);
      Alert.alert('Save failed', e.message || 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      const token = global.authToken || await AsyncStorage.getItem('authToken');
      if (token) await api.auth.logout(token);
    } catch (_) {}
    try { await AsyncStorage.removeItem('authToken'); } catch (_) {}
    global.authToken = null;
    navigation?.navigate?.('Landing') || null;
  }

  if (loading) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowAvatarModal(true)} style={styles.avatarWrapper}>
          {photoUri || user?.photoUrl ? (
            <Image source={{ uri: photoUri || user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{(user?.firstName || 'U').charAt(0).toUpperCase()}</Text></View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{user?.fullName || user?.email}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={beginEdit}><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity>
          ) : null}
        </View>

        {!isEditing ? (
          <View style={styles.card}>
            <View style={styles.row}><Text style={styles.label}>Full name</Text><Text style={styles.value}>{user?.fullName || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Role</Text><Text style={styles.value}>{(user?.role || 'user').replace(/^./, s => s.toUpperCase())}</Text></View>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity style={styles.photoPicker} onPress={pickImage}><Text style={styles.photoPickerText}>Change Photo</Text></TouchableOpacity>
            <View style={styles.formRow}>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving ? { opacity: 0.7 } : null]} onPress={saveProfile} disabled={saving}><Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save Changes'}</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Array.isArray(devices) ? devices.filter(d=>d?.is_owner).length : 0}</Text>
            <Text style={styles.statLabel}>Devices Owned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Array.isArray(devices) ? devices.filter(d=>d?.is_collaborator && !d?.is_owner).length : 0}</Text>
            <Text style={styles.statLabel}>Shared With Me</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{0}</Text>
            <Text style={styles.statLabel}>Shared With Others</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.cardColumn}>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate?.('Notifications') }>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate?.('PrivacySecurity') }>
            <Text style={styles.settingLabel}>Privacy & Security</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Sign out', 'Are you sure?', [{text:'Cancel'},{text:'Sign out', onPress: handleLogout}])}>
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar modal */}
      <Modal visible={showAvatarModal} animationType="slide" transparent={true} onRequestClose={() => setShowAvatarModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profile Photo</Text>
            {photoUri || user?.photoUrl ? (
              <Image source={{ uri: photoUri || user.photoUrl }} style={styles.modalAvatar} />
            ) : (
              <View style={[styles.modalAvatar, styles.avatarPlaceholder]}><Text style={styles.avatarInitial}>{(user?.firstName || 'U').charAt(0).toUpperCase()}</Text></View>
            )}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowAvatarModal(false); pickImage(); }}><Text style={styles.modalBtnTxt}>Choose Photo</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setShowAvatarModal(false)}><Text style={[styles.modalBtnTxt, { color: theme.colors.text }]}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF6' },
  content: { padding: theme.spacing.l, paddingBottom: 120 },
  header: { alignItems: 'center', backgroundColor: theme.colors.primary, paddingVertical: 28, borderRadius: 12, marginBottom: 16 },
  avatarWrapper: { marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, color: 'white', fontWeight: '700' },
  name: { color: 'white', fontSize: 20, fontWeight: '700' },
  email: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  section: { marginTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  editButton: { backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  editButtonText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: 'white', marginTop: 8, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { color: theme.colors.muted, fontSize: 14 },
  value: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  photoPicker: { backgroundColor: theme.colors.primary, padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  photoPickerText: { color: 'white', fontWeight: '700' },
  formRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#eee', padding: 10, borderRadius: 8, marginRight: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f3f3f3' },
  cancelTxt: { color: theme.colors.text },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: theme.colors.primary },
  saveTxt: { color: 'white', fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#163522' },
  statLabel: { color: theme.colors.muted, marginTop: 4 },
  cardColumn: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  settingItem: { backgroundColor: 'white', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  settingLabel: { color: theme.colors.text, fontSize: 16 },
  chev: { color: theme.colors.muted },
  logoutBtn: { marginTop: 8, backgroundColor: 'rgba(225,85,74,0.1)', padding: 14, borderRadius: 12, alignItems: 'center' },
  logoutTxt: { color: theme.colors.danger, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '90%', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalAvatar: { width: 140, height: 140, borderRadius: 70, marginTop: 12 },
  modalBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 6 },
  modalBtnTxt: { color: 'white', fontWeight: '700' }
});
