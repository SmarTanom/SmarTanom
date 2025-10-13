/**
 * Custom Hook for Push Notification Management
 * Handles push notification subscription, unsubscription, and status checks
 * Works across normal browsers, PWAs, and mobile devices
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed as checkSubscriptionStatus,
  getCurrentSubscription,
} from '../services/api/notifications';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  /**
   * Initialize - Check support and current status
   */
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        // Check if push notifications are supported
        const supported = isPushNotificationSupported();
        setIsSupported(supported);

        if (!supported) {
          console.warn('Push notifications are not supported in this browser');
          setIsInitializing(false);
          return;
        }

        // Get current permission status
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);

        // Check if already subscribed (with simpler error handling)
        try {
          const subscribed = await checkSubscriptionStatus();
          setIsSubscribed(subscribed);

          // Get current subscription if exists
          if (subscribed) {
            try {
              const currentSub = await getCurrentSubscription();
              setSubscription(currentSub);
            } catch (subError) {
              console.warn('Could not get subscription details:', subError);
            }
          }

          console.log('Push notifications initialized:', {
            supported,
            permission: currentPermission,
            subscribed,
          });
        } catch (checkError) {
          console.warn('Could not check subscription status:', checkError);
          // If we can't check, assume not subscribed
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
        // Don't show error to user, just log it
        setIsSubscribed(false);
      } finally {
        // Always complete initialization
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  /**
   * Enable push notifications
   * Requests permission, subscribes to push, and sends to backend
   */
  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Push notifications are not supported in this browser');
      setError(err.message);
      throw err;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Enabling push notifications...');

      // Subscribe to push notifications
      const result = await subscribeToPush();

      console.log('Push subscription successful:', result);

      // Update state
      setIsSubscribed(true);
      setPermission('granted');
      setSubscription(result.subscription);

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('SmarTanom Notifications Enabled', {
            body: 'You will now receive real-time alerts from your hydroponic systems.',
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            tag: 'notification-enabled',
          });
        } catch (notifError) {
          console.warn('Failed to show test notification:', notifError);
        }
      }

      return result;
    } catch (err) {
      console.error('Failed to enable notifications:', err);

      // Set user-friendly error messages
      let errorMessage = 'Failed to enable notifications';

      if (err.message.includes('permission denied') || err.message.includes('denied')) {
        errorMessage = 'Notification permission was denied. Please enable notifications in your browser settings.';
      } else if (err.message.includes('not supported')) {
        errorMessage = 'Push notifications are not supported in this browser.';
      } else if (err.message.includes('service worker')) {
        errorMessage = 'Service worker is not available. Please refresh the page and try again.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
      setIsSubscribed(false);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Disable push notifications
   * Unsubscribes from push and removes from backend
   */
  const disableNotifications = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Push notifications are not supported');
      setError(err.message);
      throw err;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Disabling push notifications...');

      // Unsubscribe from push notifications
      await unsubscribeFromPush();

      console.log('Push unsubscription successful');

      // Update state
      setIsSubscribed(false);
      setSubscription(null);

      return true;
    } catch (err) {
      console.error('Failed to disable notifications:', err);

      let errorMessage = 'Failed to disable notifications';

      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Toggle push notifications on/off
   */
  const toggleNotifications = useCallback(async () => {
    if (isSubscribed) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  }, [isSubscribed, enableNotifications, disableNotifications]);

  /**
   * Refresh subscription status
   * Useful for checking status after page reload
   */
  const refreshStatus = useCallback(async () => {
    try {
      const subscribed = await checkSubscriptionStatus();
      setIsSubscribed(subscribed);

      if (subscribed) {
        const currentSub = await getCurrentSubscription();
        setSubscription(currentSub);
      } else {
        setSubscription(null);
      }

      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      return { subscribed, permission: currentPermission };
    } catch (err) {
      console.error('Failed to refresh subscription status:', err);
      setError(err.message);
      return { subscribed: false, permission: 'default' };
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isInitializing,
    error,
    subscription,

    // Actions
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    refreshStatus,
    clearError,

    // Helper computed values
    canEnable: isSupported && !isSubscribed && permission !== 'denied',
    canDisable: isSupported && isSubscribed,
    isDenied: permission === 'denied',
  };
};

export default usePushNotifications;
