import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '../../services/api/notifications';
import './NotificationPermission.css';

const NotificationPermission = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkSupport();
    checkSubscriptionStatus();
  }, []);

  const checkSupport = () => {
    const isSupported = isPushNotificationSupported();
    setSupported(isSupported);
    if (isSupported) {
      setPermission(getNotificationPermission());
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await isSubscribed();
      setSubscribed(status);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await subscribeToPush();
      setSubscribed(true);
      setPermission('granted');
      setMessage({
        type: 'success',
        text: 'Successfully subscribed to push notifications!',
      });
    } catch (error) {
      console.error('Subscription failed:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to subscribe to notifications',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      setMessage({
        type: 'success',
        text: 'Successfully unsubscribed from push notifications',
      });
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to unsubscribe',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="notification-permission">
        <div className="notification-card">
          <AlertCircle className="icon-warning" size={48} />
          <h3>Push Notifications Not Supported</h3>
          <p>
            Your browser does not support push notifications. Please use a modern browser
            like Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-permission">
      <div className="notification-card">
        <div className="notification-header">
          {subscribed ? (
            <Bell className="icon-success" size={48} />
          ) : (
            <BellOff className="icon-muted" size={48} />
          )}
          <h3>Push Notifications</h3>
          <p className="status-text">
            {subscribed
              ? 'You will receive real-time alerts for your devices'
              : 'Enable notifications to receive real-time alerts'}
          </p>
        </div>

        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="notification-info">
          <div className="info-item">
            <strong>Permission Status:</strong>
            <span className={`permission-badge permission-${permission}`}>
              {permission === 'granted'
                ? 'Granted'
                : permission === 'denied'
                ? 'Denied'
                : 'Not Requested'}
            </span>
          </div>
          <div className="info-item">
            <strong>Subscription Status:</strong>
            <span className={`subscription-badge ${subscribed ? 'active' : 'inactive'}`}>
              {subscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="notification-actions">
          {!subscribed ? (
            <button
              className="btn btn-primary"
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  Subscribing...
                </>
              ) : (
                <>
                  <Bell size={20} />
                  Enable Notifications
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleUnsubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  Unsubscribing...
                </>
              ) : (
                <>
                  <BellOff size={20} />
                  Disable Notifications
                </>
              )}
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="help-text">
            <AlertCircle size={16} />
            <p>
              You have blocked notifications. To enable them, please update your browser
              settings and reload the page.
            </p>
          </div>
        )}

        <div className="notification-features">
          <h4>What you'll receive:</h4>
          <ul>
            <li>Critical device alerts (pH levels, water levels)</li>
            <li>System status updates</li>
            <li>Maintenance reminders</li>
            <li>Real-time notifications even when app is closed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermission;
