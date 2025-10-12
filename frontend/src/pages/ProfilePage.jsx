import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, LogOut, Bell, Share2, Shield,
  ChevronRight, Leaf, AlertCircle, Settings,
  Users, Plus, X, Check
} from 'lucide-react';
import '../assets/styles/ProfilePage.css';
import { authApi } from '../services/apiClient';
import { getUserDevices } from '../services/api/devices.js';
import { useAuth } from '../contexts/AuthContext.jsx';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedAccess, setSharedAccess] = useState([]);
  // Inline edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState('');


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

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate('/');
      } else {
        // Even if logout fails, clear local state and navigate
        console.error('Logout error:', result.error);
        navigate('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even on error
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

  const handleShareDevice = () => {
    if (!selectedDevice || !shareEmail.trim()) {
      alert('Please select a device and enter an email address');
      return;
    }

    // In production, call API to share device
    const newShare = {
      id: sharedAccess.length + 1,
      deviceId: selectedDevice.id,
      deviceName: selectedDevice.name,
      sharedWith: shareEmail,
      sharedDate: new Date().toISOString().split('T')[0]
    };

    setSharedAccess([...sharedAccess, newShare]);
    setShowShareModal(false);
    setShareEmail('');
    setSelectedDevice(null);
  };

  const handleRevokeAccess = (shareId) => {
    if (confirm('Are you sure you want to revoke access?')) {
      setSharedAccess(sharedAccess.filter(s => s.id !== shareId));
    }
  };

  const openShareModal = (deviceId, deviceName) => {
    setSelectedDevice({ id: deviceId, name: deviceName });
    setShowShareModal(true);
  };

  if (!user) return <div className="loading">Loading...</div>;

  return (
    <div className="profile-root">
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

        {/* Device Statistics */}
        <section className="profile-section">
          <h2 className="section-title">Device Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Leaf size={24} color={PRIMARY_GREEN} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{user.devicesOwned}</span>
                <span className="stat-label">Devices Owned</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Share2 size={24} color={PRIMARY_GREEN} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{user.sharedWith}</span>
                <span className="stat-label">Shared With Others</span>
              </div>
            </div>
          </div>
        </section>

        {/* Shared Monitoring */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Shared Monitoring</h2>
            <button
              className="btn-share-new"
              onClick={() => openShareModal('RACK-01', 'Outdoor Garden')}
            >
              <Plus size={16} />
              Share Device
            </button>
          </div>

          <div className="share-info-banner">
            <Share2 size={20} />
            <p>Share device monitoring data with other users. All users can view real-time data and alerts to guide data-driven decisions.</p>
          </div>

          {sharedAccess.length === 0 ? (
            <div className="empty-state">
              <Users size={48} color="#C5D4CB" />
              <p>No shared access yet</p>
              <span>Share your devices with other users to collaborate</span>
            </div>
          ) : (
            <div className="shared-list">
              {sharedAccess.map(share => (
                <div key={share.id} className="shared-item">
                  <div className="shared-item-header">
                    <div className="shared-device-info">
                      <h4 className="shared-device-name">{share.deviceName}</h4>
                      <span className="shared-device-id">{share.deviceId}</span>
                    </div>
                  </div>
                  <div className="shared-item-body">
                    <div className="shared-user-info">
                      <Mail size={16} />
                      <span className="shared-email">{share.sharedWith}</span>
                    </div>
                    <span className="shared-date">Shared on {new Date(share.sharedDate).toLocaleDateString()}</span>
                  </div>
                  <button
                    className="btn-revoke"
                    onClick={() => handleRevokeAccess(share.id)}
                  >
                    <X size={16} />
                    Revoke Access
                  </button>
                </div>
              ))}
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
          <button className="btn-logout" onClick={handleLogout}>
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
                <select
                  className="form-select"
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const device = [
                      { id: 'RACK-01', name: 'Outdoor Garden' },
                      { id: 'RACK-02', name: 'Indoor Rack' },
                      { id: 'RACK-03', name: 'Greenhouse Unit' }
                    ].find(d => d.id === e.target.value);
                    setSelectedDevice(device);
                  }}
                >
                  <option value="">Choose a device...</option>
                  <option value="RACK-01">Outdoor Garden (RACK-01)</option>
                  <option value="RACK-02">Indoor Rack (RACK-02)</option>
                  <option value="RACK-03">Greenhouse Unit (RACK-03)</option>
                </select>
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
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowShareModal(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleShareDevice}>
                <Check size={16} />
                Share Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
