	import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, LogOut, Bell, Share2, Shield,
  ChevronRight, Leaf, AlertCircle, Settings,
  Users, Plus, X, Check
} from 'lucide-react';
import '../assets/styles/ProfilePage.css';
import { authApi, apiClient } from '../services/apiClient';
import { getUserDevices } from '../services/api/devices.js';
import { shareDevice, getDeviceCollaborators, revokeDeviceAccess, getPendingInvitations, acceptDeviceInvitation, declineDeviceInvitation, getSentInvitations, cancelSentInvitation } from '../services/api/sharing.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import PWAInstallButton from '../components/pwa/PWAInstallButton.jsx';
import OtpInput from '../components/auth/OtpInput.jsx';

import { Toast } from '../components/ui/Toast.jsx';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Format a date string as "Month D, YYYY" without timezone shifts
function formatMemberSince(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // ensure stable date regardless of client TZ
    });
  } catch (_) {
    return '—';
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedAccess, setSharedAccess] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState('');
  const [loadingSharedAccess, setLoadingSharedAccess] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loadingSentInvites, setLoadingSentInvites] = useState(false);
  const [cancelInviteId, setCancelInviteId] = useState(null);
  // Revoke access states
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRevokeOtpModal, setShowRevokeOtpModal] = useState(false);
  const [revokeShare, setRevokeShare] = useState(null);
  const [revokeOtp, setRevokeOtp] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [toast, setToast] = useState(null);
  // Inline edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState('');
  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);


  // Load current user profile from backend
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const profile = await authApi.getProfile(token);
        if (!mounted) return;
        // Map backend fields -> UI state
        const uiUser = {
          username: profile.username || (profile.email ? profile.email.split('@')[0] : 'User'),
          email: profile.email,
          full_name: profile.full_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role || (profile.is_admin ? 'admin' : 'user'),
          // Prefer exact account creation; fall back to common alternatives if backend changes naming
          joinedDate: profile.date_joined || profile.created_at || profile.created || null,
          photoUrl: profile.user_photo_url || null,
          devicesOwned: 0,
          sharedWith: 0,
        };
        setUser(uiUser);
        // Prime edit fields
        setEditFirst(uiUser.firstName || '');
        setEditLast(uiUser.lastName || '');


        // Fetch user's bound devices count
        try {
          const devices = await getUserDevices();
          if (!mounted) return;
          setUser(prev => prev ? { ...prev, devicesOwned: Array.isArray(devices) ? devices.length : (devices?.results?.length || 0) } : prev);
        } catch (_) {
          // ignore device fetch errors; keep count at 0
        }
      } catch (e) {
        // On auth error, send to landing
        navigate('/');
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Load shared access and invitations when user is loaded
  useEffect(() => {
    if (user) {
      // Also load devices so we can compute owned devices for Share button and stats
      loadDevicesForSharing();
      loadSharedAccess();
      loadPendingInvitations();
      loadSentInvitations();
    }
  }, [user]);

  const openLogoutModal = () => setShowLogoutModal(true);
  const closeLogoutModal = () => setShowLogoutModal(false);
  const confirmLogout = async () => {
    try {
      const result = await logout();
      setShowLogoutModal(false);
      if (result?.success !== false) {
        navigate('/');
      } else {
        console.error('Logout error:', result.error);
        navigate('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/');
    }
  };

  // Username removed from editing per request; only first and last name are editable.

  function beginEdit() {
    if (!user) return;
    setEditFirst(user.firstName || '');
    setEditLast(user.lastName || '');
    setSaveError('');
    setNewPhotoFile(null);
    setNewPhotoPreview('');
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setSaveError('');
    if (newPhotoPreview) {
      URL.revokeObjectURL(newPhotoPreview);
      setNewPhotoPreview('');
    }
    setNewPhotoFile(null);
  }

  async function saveProfile() {
    setSaveError('');
    const token = localStorage.getItem('authToken');
    if (!token) {
      setSaveError('Not authenticated');
      return;
    }
    // Validate names
    if (!editFirst.trim() || !editLast.trim()) {
      setSaveError('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      let updated;
      if (newPhotoFile) {
        const form = new FormData();
        form.append('first_name', editFirst.trim());
        form.append('last_name', editLast.trim());
        form.append('user_photo', newPhotoFile);
        updated = await authApi.updateProfile(token, form);
      } else {
        const body = { first_name: editFirst.trim(), last_name: editLast.trim() };
        updated = await authApi.updateProfile(token, body);
      }
      // Update UI state
      const uiUser = {
        username: updated.username || (updated.email ? updated.email.split('@')[0] : 'User'),
        email: updated.email,
        full_name: updated.full_name,
        firstName: updated.first_name,
        lastName: updated.last_name,
        role: updated.role || (updated.is_admin ? 'admin' : 'user'),
        joinedDate: updated.date_joined || updated.created_at || updated.created || user?.joinedDate || null,
        photoUrl: updated.user_photo_url || user?.photoUrl || null,
        devicesOwned: user?.devicesOwned || 0,
        sharedWith: user?.sharedWith || 0,
      };
      setUser(uiUser);
      setIsEditing(false);
      if (newPhotoPreview) {
        URL.revokeObjectURL(newPhotoPreview);
      }
      setNewPhotoFile(null);
      setNewPhotoPreview('');
    } catch (e) {
      setSaveError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  function onSelectPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    const preview = URL.createObjectURL(file);
    setNewPhotoFile(file);
    setNewPhotoPreview(preview);
  }

  // Load user devices for sharing
  const loadDevicesForSharing = async () => {
    setDevicesLoading(true);
    try {
  const devicesResponse = await getUserDevices();
  const userDevices = (devicesResponse && (devicesResponse.results || devicesResponse)) || [];
      if (Array.isArray(userDevices)) {
        setDevices(userDevices);
        console.log(`📱 Loaded ${userDevices.length} devices for sharing`);
      } else {
        setDevices([]);
        console.warn('No devices found or invalid response format');
      }
    } catch (error) {
      console.error('Failed to load devices for sharing:', error);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  // Load existing shared access for all user devices
  const loadSharedAccess = async () => {
    setLoadingSharedAccess(true);
    try {
      const devicesResponse = await getUserDevices();
      const userDevices = devicesResponse.results || devicesResponse;
      if (!Array.isArray(userDevices)) {
        setSharedAccess([]);
        return;
      }

      // Load collaborators for each device
      const allSharedAccess = [];
      await Promise.all(
        userDevices.map(async (device) => {
          try {
            const collaborators = (await getDeviceCollaborators(device.id)) || { results: [] };
            const collaboratorList = collaborators.results || collaborators || [];
            if (Array.isArray(collaboratorList)) {
              collaboratorList.forEach(collaborator => {
                const isOwnerFlag = !!(device?.is_owner || (device?.bound_email && user && device.bound_email === user.email));
                allSharedAccess.push({
                  id: `${device.id}_${collaborator.id}`,
                  deviceId: device.id,
                  deviceName: device.device_name || device.plant_name || 'Shared Device',
                  collaboratorId: collaborator.id,
                  sharedWith: collaborator.email,
                  sharedDate: collaborator.shared_date || collaborator.created_at,
                  permissions: collaborator.permissions || { view_only: true },
                  status: collaborator.status || 'active',
                  isOwner: isOwnerFlag,
                  isCollaborator: !!(device?.is_collaborator && !isOwnerFlag),
                });
              });
            }
          } catch (error) {
            // Handle 404 gracefully - sharing endpoints not implemented yet
            if (error.message.includes('404')) {
              console.log(`Sharing not available for device ${device.id} (backend endpoints not implemented yet)`);
            } else {
              console.warn(`Failed to load collaborators for device ${device.id}:`, error);
            }
          }
        })
      );

      setSharedAccess(allSharedAccess);
      console.log(`👥 Loaded ${allSharedAccess.length} shared access entries`);
    } catch (error) {
      console.error('Failed to load shared access:', error);
      setSharedAccess([]);
    } finally {
      setLoadingSharedAccess(false);
    }
  };

  // Load pending invitations for current user
  const loadPendingInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const invitations = (await getPendingInvitations()) || { results: [] };
      const invitationList = invitations.results || invitations || [];
      setPendingInvitations(Array.isArray(invitationList) ? invitationList : []);
      console.log(`📩 Loaded ${invitationList.length} pending invitations`);
    } catch (error) {
      // Handle 404 gracefully - sharing endpoints not implemented yet
      if (error.message.includes('404')) {
        console.log('Pending invitations not available (backend endpoints not implemented yet)');
      } else {
        console.error('Failed to load pending invitations:', error);
      }
      setPendingInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  // Load invitations sent by current user
  const loadSentInvitations = async () => {
    setLoadingSentInvites(true);
    try {
      const sent = (await getSentInvitations()) || { results: [] };
      const list = sent.results || sent || [];
      setSentInvitations(Array.isArray(list) ? list : []);
      console.log(`📤 Loaded ${Array.isArray(list) ? list.length : 0} sent invitations`);
    } catch (error) {
      if (error.message?.includes('404')) {
        console.log('Sent invitations endpoint not available');
      } else {
        console.error('Failed to load sent invitations:', error);
      }
      setSentInvitations([]);
    } finally {
      setLoadingSentInvites(false);
    }
  };

  const handleCancelInvitation = async (invitation) => {
    setCancelInviteId(invitation.id);
  };

  const confirmCancelInvitation = async () => {
    if (!cancelInviteId) return;
    try {
      await cancelSentInvitation(cancelInviteId);
      setSentInvitations(prev => prev.filter(inv => inv.id !== cancelInviteId));
      setToast({ type: 'success', message: 'Invitation canceled' });
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      const msg = error?.response?.data?.error || error?.message || 'Failed to cancel invitation';
      setToast({ type: 'error', message: msg });
    } finally {
      setCancelInviteId(null);
      // Refresh shared access list and invitations after a short delay
      setTimeout(() => {
        loadSharedAccess();
        loadSentInvitations();
      }, 500);
    }
  };

  // Accept device invitation
  const handleAcceptInvitation = async (invitation) => {
    try {
      await acceptDeviceInvitation(invitation.token);
      console.log('✅ Invitation accepted');

      // Remove from pending invitations
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

      // Reload shared access to show the new device
      loadSharedAccess();

    } catch (error) {
      console.error('❌ Failed to accept invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  // Decline device invitation
  const handleDeclineInvitation = async (invitation) => {
    try {
      await declineDeviceInvitation(invitation.token);
      console.log('❌ Invitation declined');

      // Remove from pending invitations
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

    } catch (error) {
      console.error('❌ Failed to decline invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    }
  };

  const handleShareDevice = async () => {
    if (!selectedDevice || !shareEmail.trim()) {
      setSharingError('Please select a device and enter an email address');
      return;
    }

    // Prevent sharing to own email (client-side guard)
    if (user?.email && shareEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setSharingError('You cannot share a device with your own email.');
      return;
    }

    setSharingLoading(true);
    setSharingError('');

    try {
      // Call API to share device
  const result = await shareDevice(selectedDevice.id, shareEmail.trim(), 'view_only');

      console.log('✅ Device shared successfully:', result);

      // Add to local state immediately for UI feedback
      const newShare = {
        id: `${selectedDevice.id}_invite_${Date.now()}`,
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.device_name || selectedDevice.plant_name || 'Shared Device',
        collaboratorId: result.collaboration_id || result.invitation_id || result.id || undefined,
        sharedWith: shareEmail.trim(),
        sharedDate: new Date().toISOString().split('T')[0],
        permissions: { view_only: true },
        status: 'pending'
      };

      setSharedAccess(prev => [...prev, newShare]);

      // Close modal and reset form
      setShowShareModal(false);
      setShareEmail('');
      setSelectedDevice(null);

      // Reload shared access to get the latest data
      setTimeout(() => loadSharedAccess(), 1000);

    } catch (error) {
      console.error('❌ Failed to share device:', error);

      // Handle specific error cases
      const status = error?.status || error?.response?.status;
      const data = error?.data || error?.response?.data;
      const detail = data?.detail;

      // Attempt to extract first field error if present
      let fieldMsg = '';
      if (!detail && data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val) && val.length > 0) {
            fieldMsg = String(val[0]);
            break;
          }
          if (typeof val === 'string') {
            fieldMsg = val;
            break;
          }
        }
      }

      if (status === 404 || error.message?.includes('404')) {
        setSharingError('Unable to share this device right now. Please verify the device exists and you have permission.');
      } else if (status === 400) {
        setSharingError(detail || fieldMsg || 'Invalid request. Please check the email address.');
      } else if (status === 409) {
        setSharingError('This user already has access to this device.');
      } else {
        setSharingError('Failed to share device. Please try again.');
      }
    } finally {
      setSharingLoading(false);
    }
  };

  const handleRevokeAccess = async (shareId) => {
    const share = sharedAccess.find(s => s.id === shareId);
    if (!share) return;

    setRevokeShare(share);
    setShowRevokeConfirm(true);
  };

  const confirmRevokeRequest = async () => {
    setShowRevokeConfirm(false);
    // Reset OTP state
    setRevokeOtp('');
    setOtpSent(false);
    // Show OTP modal
    setShowRevokeOtpModal(true);
  };

  const confirmRevokeAccess = async () => {
    if (!revokeShare || !revokeOtp.trim()) {
      setToast({ type: 'error', message: 'Please enter the OTP code' });
      return;
    }

    console.log('🔄 Confirming revoke access with OTP:', revokeOtp);
    setRevokeLoading(true);
    try {
      // Call API to revoke access with OTP
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.post(
        `/api/devices/devices/${revokeShare.deviceId}/collaborators/${revokeShare.collaboratorId}/revoke/`,
        { otp_code: revokeOtp },
        { authToken: token }
      );

      console.log('✅ Access revoked successfully');

      // Remove from local state
      setSharedAccess(prev => prev.filter(s => s.id !== revokeShare.id));

      // Reset modal state
      setShowRevokeOtpModal(false);
      setRevokeShare(null);
      setRevokeOtp('');
      setOtpSent(false);

      setToast({ type: 'success', message: `Access revoked for ${revokeShare.sharedWith}` });

    } catch (error) {
      console.error('❌ Failed to revoke access:', error);
      setToast({ type: 'error', message: error.message || 'Failed to revoke access. Please try again.' });
    } finally {
      setRevokeLoading(false);
    }
  };

  const cancelRevokeConfirm = () => {
    setShowRevokeConfirm(false);
    setRevokeShare(null);
  };

  const cancelRevokeOtp = () => {
    setShowRevokeOtpModal(false);
    setRevokeShare(null);
    setRevokeOtp('');
    setOtpSent(false);
  };

  const sendRevokeOtp = async () => {
    if (!revokeShare) return;

    console.log('🔑 Sending OTP for device revocation to:', user.email);
    setSendingOtp(true);
    try {
      // Call API to send OTP for revoke confirmation
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Send OTP via the auth endpoint for device revocation
      const deviceName = revokeShare.device_name || revokeShare.device?.name || 'Unknown Device';
      const response = await apiClient.post(
        `/api/auth/request-otp/`,
        {
          email: user.email,
          purpose: 'revoke',
          device_name: deviceName
        },
        { authToken: token }
      );

      console.log('✅ OTP sent successfully, switching to input mode');
      setOtpSent(true);
      setToast({ type: 'success', message: 'OTP sent to your email. Check your inbox and enter the 6-digit code below.' });

    } catch (error) {
      console.error('❌ Failed to send OTP:', error);
      setToast({ type: 'error', message: error.message || 'Failed to send OTP. Please try again.' });
    } finally {
      setSendingOtp(false);
    }
  };

  const openShareModal = async () => {
    console.log('🔄 Opening share device modal...');
    setShowShareModal(true);
    setSharingError(''); // Clear any previous errors
    await loadDevicesForSharing();
    // Reset selection when opening modal
    setSelectedDevice(null);
    setShareEmail('');
  };

  // Reusable renderer for the "Pending invitations you sent" list
  const renderPendingSentInvites = () => {
    if (loadingSentInvites) return null;
    const pending = (sentInvitations || []).filter(inv => inv.status === 'pending');
    if (pending.length === 0) return null;
    return (
      <div style={{ marginTop: 16, width: '100%', maxWidth: 640 }}>
        <div style={{ fontWeight: 600, color: '#2F3E46', marginBottom: 8 }}>Pending invitations you sent</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {pending.map(inv => (
            <li key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F5F9F6', border: '1px solid #E0EBE5', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={16} />
                <span style={{ color: '#2F3E46' }}>{inv.invite_email}</span>
                <span style={{ color: '#6B7D75' }}>→</span>
                <span style={{ color: '#2F3E46', fontWeight: 500 }}>{inv.device_name || 'Shared Device'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8a8d90' }}>Pending</span>
                <button
                  className="btn-cancel"
                  onClick={() => handleCancelInvitation(inv)}
                  style={{ padding: '6px 10px' }}
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div className="profile-root">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="profile-header">
        <div className="profile-avatar" style={{ overflow: 'hidden', position: 'relative' }}>
          {newPhotoPreview ? (
            <img src={newPhotoPreview} alt="New profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : user.photoUrl ? (
            <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <User size={48} strokeWidth={2} />
          )}
        </div>
        <h1 className="profile-username">{user.full_name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}</h1>
        <p className="profile-email">{user.email}</p>
      </header>

      <main className="profile-main">
        {/* Account Information */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Account Information</h2>
            {!isEditing && (
              <button className="btn-share-new" onClick={beginEdit} title="Edit profile">
                Edit
              </button>
            )}
          </div>
          <div className="info-card">
            {!isEditing ? (
              <>
                <div className="info-row">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{user.full_name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Role</span>
                  <span className="info-value">{(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">{formatMemberSince(user.joinedDate)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input id="photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={onSelectPhoto} />
                    <button className="btn-share-new" type="button" onClick={() => document.getElementById('photo-input').click()}>
                      Change Photo
                    </button>
                    {newPhotoFile && <span style={{ fontSize: 14, color: '#6B7D75' }}>{newPhotoFile.name}</span>}
                  </div>
                </div>
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={editLast} onChange={(e) => setEditLast(e.target.value)} />
                  </div>
                </div>
                {saveError && <p className="form-error" role="alert">{saveError}</p>}
                <div className="edit-actions">
                  <button className="btn-cancel" onClick={cancelEdit} disabled={saving}>Cancel</button>
                  <button className="btn-confirm" onClick={saveProfile} disabled={saving}>
                    {saving ? (<>
                      <Check size={16} style={{ visibility: 'hidden' }} /> Saving…
                    </>) : (<>
                      <Check size={16} /> Save Changes
                    </>)}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Mobile App */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Mobile App</h2>
          </div>
          <div className="info-card">
            <div style={{ marginBottom: '20px' }}>
              <PWAInstallButton />
            </div>
          </div>
        </section>

        {(() => {
          const devicesOwnedCount = Array.isArray(devices)
            ? devices.filter(d => d?.is_owner).length
            : 0;
          // Count distinct devices that the owner has shared (>=1 collaborator)
          const sharedDeviceIds = new Set(
            (Array.isArray(sharedAccess) ? sharedAccess : [])
              .filter(s => s?.isOwner && (s?.status === 'active' || !s?.status))
              .map(s => s.deviceId)
          );
          const sharedWithOthersCount = sharedDeviceIds.size;
          // Count devices that are shared with the current user (collaborator view)
          const sharedWithMeCount = Array.isArray(devices)
            ? devices.filter(d => d?.is_collaborator && !d?.is_owner).length
            : 0;
          const showSharedWithMe = devicesOwnedCount === 0 && sharedWithMeCount > 0;

          return (
            <section className="profile-section">
              <h2 className="section-title">Device Overview</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <Leaf size={24} color={PRIMARY_GREEN} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{devicesOwnedCount}</span>
                    <span className="stat-label">Devices Owned</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Share2 size={24} color={PRIMARY_GREEN} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{showSharedWithMe ? sharedWithMeCount : sharedWithOthersCount}</span>
                    <span className="stat-label">{showSharedWithMe ? 'Shared With Me' : 'Shared With Others'}</span>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <section className="profile-section">
            <h2 className="section-title">Device Invitations</h2>
            <div className="invitations-list">
              {pendingInvitations.map(invitation => (
                <div key={invitation.id} className="invitation-notification">
                  <div className="notification-icon">
                    <Share2 size={20} color={PRIMARY_GREEN} />
                  </div>
                  <div className="notification-content">
                    <h4 className="notification-title">
                      Device Invitation from {invitation.owner_name || invitation.owner_email}
                    </h4>
                    <p className="notification-message">
                      You've been invited to monitor "{invitation.device_name}" with view-only access
                    </p>
                  </div>
                  <div className="notification-actions">
                    <button
                      className="btn-accept"
                      onClick={() => handleAcceptInvitation(invitation)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-decline"
                      onClick={() => handleDeclineInvitation(invitation)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shared Monitoring */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Shared Monitoring</h2>
            {Array.isArray(devices) && devices.some(d => d?.is_owner || (d?.bound_email && user && d.bound_email === user.email)) && (
              <button
                className="btn-share-new"
                onClick={openShareModal}
              >
                <Plus size={16} />
                Share Device
              </button>
            )}
          </div>

          <div className="share-info-banner">
            <Share2 size={20} />
            <p>Share device monitoring data with other users. All users can view real-time data and alerts to guide data-driven decisions.</p>
          </div>

          {/* Development Notice removed: backend sharing implemented */}

          {loadingSharedAccess ? (
            <div className="empty-state">
              <Users size={48} color="#C5D4CB" />
              <p>Loading shared access...</p>
            </div>
          ) : sharedAccess.length === 0 ? (
            <div className="empty-state">
              <Users size={48} color="#C5D4CB" />
              <p>No shared access yet</p>
              <span>Share your devices with other users to collaborate</span>
              {loadingSentInvites ? (
                <p style={{ marginTop: 8, color: '#6B7D75' }}>Loading invitations you sent…</p>
              ) : renderPendingSentInvites()}
            </div>
          ) : (
            <div className="shared-list">
              {sharedAccess.map(share => (
                <div key={share.id} className="shared-item">
                  <div className="shared-item-header">
                    <div className="shared-device-info">
                      <h4 className="shared-device-name">{share.deviceName}</h4>
                      <span className="shared-device-id" style={{ display: 'none' }}>{share.deviceId}</span>
                    </div>
                  </div>
                  <div className="shared-item-body">
                    <div className="shared-user-info">
                      <Mail size={16} />
                      <span className="shared-email">{share.sharedWith}</span>
                      <span className={`shared-status ${share.status || 'active'}`}>
                        {share.status === 'pending' ? '⏳ Pending' :
                         share.status === 'active' ? '✅ Active' :
                         '❌ Inactive'}
                      </span>
                    </div>
                    <div className="shared-meta">
                      <span className="shared-date">
                        Shared on {new Date(share.sharedDate).toLocaleDateString()}
                      </span>
                      <span className="shared-permissions">
                        📖 View-only access
                      </span>
                    </div>
                  </div>
                  {share.isOwner && (
                    <button
                      className="btn-revoke"
                      onClick={() => handleRevokeAccess(share.id)}
                      title={`Revoke ${share.sharedWith}'s access to ${share.deviceName}`}
                    >
                      <X size={16} />
                      Revoke Access
                    </button>
                  )}
                </div>
              ))}
              {loadingSentInvites ? null : renderPendingSentInvites()}
            </div>
          )}
        </section>

        {/* Settings Menu */}
        <section className="profile-section">
          <h2 className="section-title">Settings</h2>
          <div className="settings-list">
            <button className="setting-item" onClick={() => navigate('/notifications')}>
              <div className="setting-icon">
                <Bell size={22} color="rgba(51, 148, 50, 0.9)" />
              </div>
              <span className="setting-label">Notifications</span>
              <ChevronRight size={20} color="rgba(51, 148, 50, 0.9)" />
            </button>

            <button className="setting-item" onClick={() => navigate('/privacy-security')}>
              <div className="setting-icon">
                <Shield size={22} color="rgba(51, 148, 50, 0.9)" />
              </div>
              <span className="setting-label">Privacy & Security</span>
              <ChevronRight size={20} color="rgba(51, 148, 50, 0.9)" />
            </button>

            <button className="setting-item">
              <div className="setting-icon">
                <Settings size={22} color="rgba(51, 148, 50, 0.9)" />
              </div>
              <span className="setting-label">Preferences</span>
              <ChevronRight size={20} color="rgba(51, 148, 50, 0.9)" />
            </button>
          </div>
        </section>

        {/* Logout Button */}
        <section className="profile-section">
          <button className="btn-logout" onClick={openLogoutModal}>
            <LogOut size={20} />
            Sign Out
          </button>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/alerts')}>
          <AlertCircle size={20} />
          <span>Alerts</span>
        </button>
        <button className="nav-item active" aria-current="page">
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Share Device Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Device Monitoring</h3>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* Device Selection */}
              <div className="form-group">
                <label className="form-label">Select Device</label>
                {(() => {
                  const ownedDevices = Array.isArray(devices) ? devices.filter(d => d?.is_owner) : [];
                  return (
                <select
                  className="form-select"
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const device = ownedDevices.find(d => d.id.toString() === e.target.value);
                    setSelectedDevice(device);
                  }}
                  disabled={devicesLoading}
                >
                  <option value="">
                    {devicesLoading ? 'Loading devices...' : 'Choose a device...'}
                  </option>
                  {ownedDevices.map(device => {
                    const deviceName = device.device_name || device.plant_name || `Device ${device.device_serial}`;
                    const deviceLabel = device.device_serial
                      ? `${deviceName} (${device.device_serial})`
                      : deviceName;
                    return (
                      <option key={device.id} value={device.id}>
                        {deviceLabel}
                      </option>
                    );
                  })}
                  {!devicesLoading && ownedDevices.length === 0 && (
                    <option value="" disabled>No devices found</option>
                  )}
                </select>
                  );})()}
                {!devicesLoading && (Array.isArray(devices) ? devices.filter(d => d?.is_owner).length === 0 : true) && (
                  <p className="form-help-text" style={{ color: '#e74c3c' }}>
                    You don't have any devices to share. Bind a device first.
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="form-group">
                <label className="form-label">User Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <p className="form-help-text">
                  <Shield size={14} style={{ verticalAlign: 'middle' }} />
                  <span style={{ marginLeft: '6px' }}>View-only access - can see real-time monitoring data and alerts</span>
                </p>
                {sharingError && (
                  <p className="form-help-text" style={{ color: '#e74c3c', marginTop: '8px' }}>
                    ⚠️ {sharingError}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowShareModal(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleShareDevice}
                disabled={devicesLoading || devices.length === 0 || !selectedDevice || !shareEmail.trim() || sharingLoading}
                style={{
                  opacity: (devicesLoading || devices.length === 0 || !selectedDevice || !shareEmail.trim() || sharingLoading) ? 0.5 : 1,
                  cursor: (devicesLoading || devices.length === 0 || !selectedDevice || !shareEmail.trim() || sharingLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                <Check size={16} />
                {sharingLoading ? 'Sharing...' : devicesLoading ? 'Loading...' : 'Share Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Access Initial Confirmation Modal */}
      <ConfirmModal
        isOpen={showRevokeConfirm}
        title="Revoke Device Access"
        description={
          revokeShare && (
            <div>
              <p style={{ margin: 0, color: '#2F3E46' }}>
                Are you sure you want to revoke access for <strong>{revokeShare.sharedWith}</strong>?
              </p>
              <p style={{ margin: '8px 0 0', color: '#6B7D75', fontSize: 14 }}>
                They will no longer be able to view monitoring data or alerts for <strong>{revokeShare.deviceName}</strong>.
              </p>
            </div>
          )
        }
        confirmText="Continue"
        cancelText="Cancel"
        onConfirm={confirmRevokeRequest}
        onCancel={cancelRevokeConfirm}
        confirmVariant="danger"
      />

      {/* Revoke Access OTP Modal */}
      {showRevokeOtpModal && revokeShare && (
        <div className="modal-overlay" onClick={cancelRevokeOtp}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Security Verification Required</h3>
              <button className="modal-close" onClick={cancelRevokeOtp}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                {!otpSent ? (
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
                    <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '500', color: '#2F3E46' }}>
                      Confirm revocation for:
                    </p>
                    <p style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#339432' }}>
                      {revokeShare.deviceName}
                    </p>
                    <button
                      onClick={sendRevokeOtp}
                      disabled={sendingOtp}
                      style={{
                        padding: '12px 24px',
                        background: '#339432',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: sendingOtp ? 'not-allowed' : 'pointer',
                        opacity: sendingOtp ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {sendingOtp ? 'Sending...' : 'Send Verification Code'}
                    </button>
                    <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#666' }}>
                      We'll send a verification code to <strong>{user.email}</strong>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="revoke-otp-container">
                      <div className="otp-header">
                        <div className="otp-icon">🔐</div>
                        <h4 className="otp-title">Enter Verification Code</h4>
                        <p className="otp-subtitle">
                          Code sent to <strong>{user.email}</strong>
                        </p>
                      </div>

                      <div className="otp-input-section">
                        <div className="otp-input-wrapper">
                          <input
                            type="text"
                            value={revokeOtp}
                            onChange={(e) => setRevokeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="otp-revoke-input"
                            autoComplete="off"
                            autoFocus={true}
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                          <div className="otp-input-dots" aria-hidden="true">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <span
                                key={i}
                                className={`otp-dot ${i < revokeOtp.length ? 'filled' : ''}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="otp-status">
                          <div className={`otp-length-indicator ${revokeOtp.length === 6 ? 'complete' : ''}`}>
                            {revokeOtp.length}/6 digits
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        onClick={sendRevokeOtp}
                        disabled={sendingOtp}
                        style={{
                          padding: '8px 16px',
                          background: 'transparent',
                          color: '#339432',
                          border: '1px solid #339432',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: sendingOtp ? 'not-allowed' : 'pointer',
                          opacity: sendingOtp ? 0.7 : 1,
                          transition: 'all 0.2s ease',
                          minWidth: '120px'
                        }}
                      >
                        {sendingOtp ? 'Sending...' : 'Resend Code'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={cancelRevokeOtp}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={confirmRevokeAccess}
                disabled={revokeLoading || !otpSent || !revokeOtp.trim() || revokeOtp.length !== 6}
                style={{
                  background: '#dc2626',
                  opacity: (revokeLoading || !otpSent || !revokeOtp.trim() || revokeOtp.length !== 6) ? 0.7 : 1,
                  cursor: (revokeLoading || !otpSent || !revokeOtp.trim() || revokeOtp.length !== 6) ? 'not-allowed' : 'pointer'
                }}
              >
                {revokeLoading ? 'Revoking...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Sign out"
        description={
          <div>
            <p style={{ margin: 0, color: '#2F3E46' }}>Are you sure you want to sign out?</p>
            <p style={{ margin: '6px 0 0', color: '#6B7D75', fontSize: 14 }}>You can sign back in anytime using your email.</p>
          </div>
        }
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={closeLogoutModal}
        confirmVariant="danger"
      />

      {/* Cancel Invitation Modal */}
      <ConfirmModal
        isOpen={!!cancelInviteId}
        title="Cancel invitation"
        description="Are you sure you want to cancel this pending invitation? The invited user will no longer be able to accept it."
        confirmText="Cancel Invitation"
        cancelText="Keep"
        onConfirm={confirmCancelInvitation}
        onCancel={() => setCancelInviteId(null)}
        confirmVariant="danger"
      />
    </div>
  );
}
