import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Trash2, 
  Download,
  UserX,
  AlertTriangle,
  Key,
  Smartphone,
  Globe
} from 'lucide-react';
import '../assets/styles/PrivacySecurityPage.css';

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

const PrivacySecurityPage = () => {
  const navigate = useNavigate();
  
  // Privacy & Security state
  const [settings, setSettings] = useState({
    privacy: {
      profileVisibility: 'private',
      shareDataAnalytics: false,
      showOnlineStatus: true
    },
    security: {
      twoFactorAuth: false,
      biometricAuth: false,
      autoLogout: true,
      autoLogoutTime: '30'
    }
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleToggle = (category, key) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleSelectChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleExportData = () => {
    console.log('Exporting user data...');
    // Implement data export logic
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
    // Implement account deletion logic
    setShowDeleteModal(false);
  };

  const handleChangePassword = () => {
    console.log('Changing password...');
    // Implement password change logic
    setShowChangePasswordModal(false);
  };

  return (
    <div className="privacy-security-root">
      {/* Header */}
      <div className="privacy-security-header">
        <button 
          className="back-button"
          onClick={() => navigate('/profile')}
          aria-label="Go back"
        >
          <ChevronLeft size={24} color="var(--color-text)" />
        </button>
        <h1 className="privacy-security-header-title">Privacy & Security</h1>
        <div style={{ width: '24px' }}></div>
      </div>

      {/* Content */}
      <div className="privacy-security-content">
        
        {/* Privacy Section */}
        <section className="settings-section">
          <div className="section-header">
            <Shield size={24} color={PRIMARY_GREEN} />
            <h2 className="section-title">Privacy</h2>
          </div>
          <p className="section-description">Control your data and how it's shared</p>
          
          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-text">
                <span className="settings-label">Profile Visibility</span>
                <span className="settings-description">Who can see your profile information</span>
              </div>
            </div>
            <select 
              className="select-input"
              value={settings.privacy.profileVisibility}
              onChange={(e) => handleSelectChange('privacy', 'profileVisibility', e.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
            </select>
          </div>

          <div className="settings-item">
            <div className="settings-item-left">
              <Globe size={20} color={PRIMARY_GREEN} />
              <div className="settings-item-text">
                <span className="settings-label">Share Data for Analytics</span>
                <span className="settings-description">Help improve SmarTanom with anonymous usage data</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.privacy.shareDataAnalytics}
                onChange={() => handleToggle('privacy', 'shareDataAnalytics')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-left">
              <Eye size={20} color={PRIMARY_GREEN} />
              <div className="settings-item-text">
                <span className="settings-label">Show Online Status</span>
                <span className="settings-description">Let others see when you're active</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.privacy.showOnlineStatus}
                onChange={() => handleToggle('privacy', 'showOnlineStatus')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Security Section */}
        <section className="settings-section">
          <div className="section-header">
            <Lock size={24} color={PRIMARY_GREEN} />
            <h2 className="section-title">Security</h2>
          </div>
          <p className="section-description">Keep your account secure</p>
          
          <div className="settings-item">
            <div className="settings-item-left">
              <Key size={20} color={PRIMARY_GREEN} />
              <div className="settings-item-text">
                <span className="settings-label">Two-Factor Authentication</span>
                <span className="settings-description">Add extra security with 2FA codes</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.security.twoFactorAuth}
                onChange={() => handleToggle('security', 'twoFactorAuth')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-left">
              <Smartphone size={20} color={PRIMARY_GREEN} />
              <div className="settings-item-text">
                <span className="settings-label">Biometric Authentication</span>
                <span className="settings-description">Use fingerprint or face ID to unlock</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.security.biometricAuth}
                onChange={() => handleToggle('security', 'biometricAuth')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-left">
              <div className="settings-item-text">
                <span className="settings-label">Auto Logout</span>
                <span className="settings-description">Automatically log out after inactivity</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.security.autoLogout}
                onChange={() => handleToggle('security', 'autoLogout')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings.security.autoLogout && (
            <div className="auto-logout-time">
              <label className="time-label">Logout after</label>
              <select 
                className="select-input"
                value={settings.security.autoLogoutTime}
                onChange={(e) => handleSelectChange('security', 'autoLogoutTime', e.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          )}

          <button className="action-button secondary" onClick={() => setShowChangePasswordModal(true)}>
            <Lock size={18} />
            <span>Change Password</span>
          </button>
        </section>

        {/* Data Management Section */}
        <section className="settings-section">
          <div className="section-header">
            <Download size={24} color={PRIMARY_GREEN} />
            <h2 className="section-title">Data Management</h2>
          </div>
          <p className="section-description">Manage your personal data</p>
          
          <button className="action-button secondary" onClick={handleExportData}>
            <Download size={18} />
            <span>Export My Data</span>
          </button>

          <div className="info-box">
            <AlertTriangle size={18} color="#F59E0B" />
            <div className="info-text">
              <span className="info-title">Data Export</span>
              <span className="info-description">Download a copy of all your data including device logs, settings, and account information</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="settings-section danger-zone">
          <div className="section-header">
            <AlertTriangle size={24} color="#DC2626" />
            <h2 className="section-title danger">Danger Zone</h2>
          </div>
          <p className="section-description">Irreversible actions</p>
          
          <button className="action-button danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={18} />
            <span>Delete Account</span>
          </button>

          <div className="info-box danger">
            <UserX size={18} color="#DC2626" />
            <div className="info-text">
              <span className="info-title">Account Deletion</span>
              <span className="info-description">This will permanently delete your account, all devices, and data. This action cannot be undone.</span>
            </div>
          </div>
        </section>

      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={32} color="#DC2626" />
              <h2 className="modal-title">Delete Account?</h2>
            </div>
            <p className="modal-description">
              Are you sure you want to delete your account? This will permanently remove all your data, devices, and settings. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-button secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="modal-button danger" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Lock size={32} color={PRIMARY_GREEN} />
              <h2 className="modal-title">Change Password</h2>
            </div>
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" placeholder="Enter current password" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" placeholder="Enter new password" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" placeholder="Confirm new password" />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-button secondary" onClick={() => setShowChangePasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-button primary">
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacySecurityPage;
