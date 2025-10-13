import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertCircle } from 'lucide-react';
import notificationService from '../../services/notificationService.js';

/**
 * PWA Notification Settings Component
 * Manages push notification preferences
 */
export default function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // VAPID public key - you'll need to generate this for production
  // For now using a placeholder
  const VAPID_PUBLIC_KEY = 'BMxXGWGZ9QFmeQ8nPdzWUvbqTVO4hiMLrIwU8WBABr4jj9QNr1lF_KKgW0e-PWaKUPa5sZYqhBGR1S7qDqrKP4M';

  useEffect(() => {
    checkSupport();
    checkPermissionStatus();
    checkSubscriptionStatus();
  }, []);

  const checkSupport = () => {
    setIsSupported(notificationService.isSupported());
  };

  const checkPermissionStatus = () => {
    const status = notificationService.getPermissionStatus();
    setPermission(status);
  };

  const checkSubscriptionStatus = async () => {
    try {
      const subscription = await notificationService.getSubscription();
      setSubscribed(!!subscription);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Requesting notification permission...');

      // First check if notifications are supported
      if (!('Notification' in window)) {
        throw new Error('Notifications are not supported by this browser');
      }

      // Request permission using the standard API directly
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);

      if (permission !== 'granted') {
        throw new Error('Notification permission was denied');
      }

      setPermission('granted');
      setSubscribed(true);
      setSuccess('Notifications enabled successfully!');

      // Show a test notification using the standard API
      if (Notification.permission === 'granted') {
        new Notification('SmarTanom Notifications Enabled', {
          body: 'You will now receive alerts about your hydroponic systems.',
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png'
        });
      }

      console.log('Notifications enabled successfully');

    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setError(error.message || 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await notificationService.unsubscribe();
      setSubscribed(false);
      setSuccess('Notifications disabled successfully!');
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      setError(error.message || 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.showNotification('Test Notification', {
        body: 'This is a test notification from SmarTanom.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        tag: 'test-notification',
        actions: [
          { action: 'view', title: 'View Dashboard' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    } catch (error) {
      console.error('Failed to show test notification:', error);
      setError('Failed to show test notification');
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (!isSupported) {
    return (
      <div style={{
        padding: '16px',
        background: '#fef3cd',
        border: '1px solid #fecf4e',
        borderRadius: '8px',
        color: '#664d03'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          <span>Push notifications are not supported in this browser.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings" style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#2F3E46', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="#339432" />
          Push Notifications
        </h4>
        <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: 1.5 }}>
          Get instant alerts about your hydroponic systems directly to your device.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      {/* Notification Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {permission === 'denied' ? (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        ) : !subscribed ? (
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: '#339432',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                Enabling...
              </>
            ) : (
              <>
                <Bell size={16} />
                Enable Notifications
              </>
            )}
          </button>
        ) : (
          <div>
            {/* Enabled Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              marginBottom: '12px'
            }}>
              <Check size={16} />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Notifications Enabled</span>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleTestNotification}
                style={{
                  padding: '8px 16px',
                  background: '#e5f3ff',
                  color: '#0066cc',
                  border: '1px solid #b3d9ff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Test Notification
              </button>

              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#fff1f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation styles */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
