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
  const [user, setUser] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedAccess, setSharedAccess] = useState([]);

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
          devicesOwned: 0,
          sharedWith: 0,
        };
        setUser(uiUser);

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
    const token = localStorage.getItem('authToken');
    try {
      if (token) await authApi.logout(token);
    } catch (_) {
      // ignore and proceed with local cleanup
    } finally {
      localStorage.removeItem('authToken');
      navigate('/');
    }
  };

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
        <div className="profile-avatar">
          <User size={48} strokeWidth={2} />
        </div>
        <h1 className="profile-username">{user.full_name || user.username}</h1>
        <p className="profile-email">{user.email}</p>
      </header>

      <main className="profile-main">
        {/* Account Information */}
        <section className="profile-section">
          <h2 className="section-title">Account Information</h2>
          <div className="info-card">
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
