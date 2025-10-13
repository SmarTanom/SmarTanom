import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, AlertCircle, Activity, Droplets, Zap, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';
import '../assets/styles/NotificationsPage.css';

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

const NotificationsPage = () => {
  const navigate = useNavigate();

  // Push notification hook
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isInitializing,
    error: pushError,
    enableNotifications,
    disableNotifications,
    clearError,
    isDenied,
    refreshStatus,
  } = usePushNotifications();

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    pushEnabled: false, // Will be updated once initialization completes
    emailEnabled: true,
    alerts: {
      critical: true,
      warnings: true,
      info: true
    },
    categories: {
      systemAlerts: true,
      nutrientLevels: true,
      waterQuality: true,
      connectivity: true,
      harvest: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    }
  });

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Sync push notification state with hook - always keep in sync
  // Note: Push notification state is persisted in the backend via PushSubscription model
  // and in the browser via PushManager. The hook checks both on initialization.
  // This ensures the toggle state persists across page refreshes and sessions.
  useEffect(() => {
    // Always sync the pushEnabled state with the actual subscription status
    setNotifications(prev => ({
      ...prev,
      pushEnabled: isSubscribed
    }));
  }, [isSubscribed]);

  // Refresh subscription status on mount to ensure we have the latest state
  useEffect(() => {
    if (!isInitializing && isSupported) {
      refreshStatus();
    }
  }, [isInitializing, isSupported, refreshStatus]);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 4000);
  };

  // Clear error notification
  useEffect(() => {
    if (pushError) {
      showToast(pushError, 'error');
      clearError();
    }
  }, [pushError, clearError]);

  // Handle push notification toggle
  const handlePushNotificationToggle = async () => {
    if (isLoading) return;

    try {
      if (isSubscribed) {
        // Disable notifications
        await disableNotifications();
        showToast('Push notifications disabled', 'success');
      } else {
        // Enable notifications
        await enableNotifications();
        showToast('Push notifications enabled successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      // Error toast will be shown by useEffect watching pushError
    }
  };

  const handleToggle = (category, key) => {
    if (category === 'main') {
      setNotifications(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    } else if (category === 'alerts' || category === 'categories') {
      setNotifications(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: !prev[category][key]
        }
      }));
    } else if (category === 'quietHours') {
      setNotifications(prev => ({
        ...prev,
        quietHours: {
          ...prev.quietHours,
          [key]: key === 'enabled' ? !prev.quietHours[key] : prev.quietHours[key]
        }
      }));
    }
  };

  const handleTimeChange = (type, value) => {
    setNotifications(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [type]: value
      }
    }));
  };

  return (
    <div className="notifications-root">
      {/* Header */}
      <div className="notifications-header">
        <button
          className="back-button"
          onClick={() => navigate('/profile')}
          aria-label="Go back"
        >
          <ChevronLeft size={24} color="var(--color-text)" />
        </button>
        <h1 className="notifications-header-title">Notifications</h1>
        <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <AlertTriangle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Content */}
      <div className="notifications-content">

        {/* Browser Support Warning */}
        {!isSupported && (
          <div className="notification-warning">
            <AlertTriangle size={20} color="#F59E0B" />
            <div>
              <strong>Push notifications not supported</strong>
              <p>Your browser doesn't support push notifications. Please use Chrome, Firefox, Edge, or Safari.</p>
            </div>
          </div>
        )}

        {/* Permission Denied Warning */}
        {isSupported && isDenied && (
          <div className="notification-warning">
            <AlertCircle size={20} color="#DC2626" />
            <div>
              <strong>Notification permission denied</strong>
              <p>Please enable notifications in your browser settings to receive alerts.</p>
            </div>
          </div>
        )}

        {/* Main Toggle Section */}
        <section className="notification-section">
          <div className="notification-item">
            <div className="notification-item-left">
              <Bell size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Push Notifications</span>
                <span className="notification-description">
                  Receive push notifications on this device
                </span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={handlePushNotificationToggle}
                disabled={!isSupported || isLoading || isDenied}
              />
              <span className="toggle-slider">
                {isLoading && <Loader size={12} className="spinner" />}
              </span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <Bell size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Email Notifications</span>
                <span className="notification-description">Receive alerts via email</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.emailEnabled}
                onChange={() => handleToggle('main', 'emailEnabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Alert Severity Section */}
        <section className="notification-section">
          <h2 className="section-title">Alert Severity</h2>
          <p className="section-description">Choose which alert types you want to receive</p>

          <div className="notification-item">
            <div className="notification-item-left">
              <AlertCircle size={20} color="#DC2626" />
              <div className="notification-item-text">
                <span className="notification-label">Critical Alerts</span>
                <span className="notification-description">Urgent issues requiring immediate attention</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.alerts.critical}
                onChange={() => handleToggle('alerts', 'critical')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <AlertCircle size={20} color="#F59E0B" />
              <div className="notification-item-text">
                <span className="notification-label">Warnings</span>
                <span className="notification-description">Important notifications that need attention</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.alerts.warnings}
                onChange={() => handleToggle('alerts', 'warnings')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <AlertCircle size={20} color="#3B82F6" />
              <div className="notification-item-text">
                <span className="notification-label">Info</span>
                <span className="notification-description">General updates and information</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.alerts.info}
                onChange={() => handleToggle('alerts', 'info')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Categories Section */}
        <section className="notification-section">
          <h2 className="section-title">Notification Categories</h2>
          <p className="section-description">Select which types of updates you want to receive</p>

          <div className="notification-item">
            <div className="notification-item-left">
              <AlertCircle size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">System Alerts</span>
                <span className="notification-description">Device connectivity and system issues</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.categories.systemAlerts}
                onChange={() => handleToggle('categories', 'systemAlerts')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <Activity size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Nutrient Levels</span>
                <span className="notification-description">EC, TDS, and nutrient monitoring updates</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.categories.nutrientLevels}
                onChange={() => handleToggle('categories', 'nutrientLevels')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <Droplets size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Water Quality</span>
                <span className="notification-description">pH and water parameter changes</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.categories.waterQuality}
                onChange={() => handleToggle('categories', 'waterQuality')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <Zap size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Connectivity</span>
                <span className="notification-description">Device online/offline status changes</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.categories.connectivity}
                onChange={() => handleToggle('categories', 'connectivity')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-item-left">
              <Bell size={20} color={PRIMARY_GREEN} />
              <div className="notification-item-text">
                <span className="notification-label">Harvest Reminders</span>
                <span className="notification-description">Plant harvest readiness notifications</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.categories.harvest}
                onChange={() => handleToggle('categories', 'harvest')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* Quiet Hours Section */}
        <section className="notification-section">
          <h2 className="section-title">Quiet Hours</h2>
          <p className="section-description">Silence notifications during specific hours</p>

          <div className="notification-item">
            <div className="notification-item-left">
              <div className="notification-item-text">
                <span className="notification-label">Enable Quiet Hours</span>
                <span className="notification-description">Mute non-critical alerts during set hours</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.quietHours.enabled}
                onChange={() => handleToggle('quietHours', 'enabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {notifications.quietHours.enabled && (
            <div className="time-picker-container">
              <div className="time-picker-group">
                <label className="time-label">Start Time</label>
                <input
                  type="time"
                  className="time-input"
                  value={notifications.quietHours.start}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                />
              </div>
              <div className="time-picker-group">
                <label className="time-label">End Time</label>
                <input
                  type="time"
                  className="time-input"
                  value={notifications.quietHours.end}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default NotificationsPage;
