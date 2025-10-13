import { apiClient } from '../apiClient';

/**
 * Notification API Service
 * Handles push notification subscriptions and management
 */

/**
 * Convert VAPID public key from base64url to Uint8Array
 * @param {string} base64String - Base64url encoded public key
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get VAPID public key from backend
 * @returns {Promise<string>} Base64url encoded public key
 */
export const getVapidPublicKey = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/notifications/subscriptions/vapid_public_key/', {
      authToken: token
    });
    return response.public_key;
  } catch (error) {
    console.error('Failed to fetch VAPID public key:', error);
    throw error;
  }
};

/**
 * Check if push notifications are supported
 * @returns {boolean}
 */
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Request notification permission
 * @returns {Promise<NotificationPermission>}
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  return await Notification.requestPermission();
};

/**
 * Get current notification permission status
 * @returns {NotificationPermission}
 */
export const getNotificationPermission = () => {
  return Notification.permission;
};

/**
 * Subscribe to push notifications
 * @returns {Promise<Object>} Subscription details
 */
export const subscribeToPush = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Register service worker if not already registered
    let registration;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registration = registrations[0];

      if (!registration) {
        console.log('Registering service worker...');
        registration = await navigator.serviceWorker.register('/sw.js');
        await registration.update();
        console.log('Service worker registered successfully');
      }
    } catch (swError) {
      console.error('Service worker registration failed:', swError);
      throw new Error('Service worker is not available. Please refresh the page.');
    }

    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // Send subscription to backend
    const token = localStorage.getItem('authToken');
    const subscriptionData = subscription.toJSON();
    const response = await apiClient.post('/api/notifications/subscriptions/subscribe/', {
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth: subscriptionData.keys.auth,
      user_agent: navigator.userAgent,
    }, {
      authToken: token
    });

    return {
      subscription,
      backendSubscription: response,
    };
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 * @returns {Promise<void>}
 */
export const unsubscribeFromPush = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  try {
    // Get registration
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations[0];

    if (!registration) {
      console.warn('No service worker registration found');
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subscriptionData = subscription.toJSON();

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from backend
      const token = localStorage.getItem('authToken');
      await apiClient.post('/api/notifications/subscriptions/unsubscribe/', {
        endpoint: subscriptionData.endpoint,
      }, {
        authToken: token
      });
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
};

/**
 * Check if user is currently subscribed
 * @returns {Promise<boolean>}
 */
export const isSubscribed = async () => {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    // Check if service worker is available
    if (!navigator.serviceWorker.controller && !navigator.serviceWorker.ready) {
      console.warn('Service worker not available');
      return false;
    }

    // Try to get registration without waiting indefinitely
    let registration;
    try {
      // First try to get existing registration
      const registrations = await navigator.serviceWorker.getRegistrations();
      registration = registrations[0];

      if (!registration) {
        // No registration exists, try to register
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service worker registered successfully');
        } catch (regError) {
          console.warn('Could not register service worker:', regError);
          return false;
        }
      }
    } catch (getError) {
      console.warn('Could not get service worker registration:', getError);
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.warn('Failed to check subscription status:', error);
    return false;
  }
};/**
 * Get current subscription
 * @returns {Promise<PushSubscription|null>}
 */
export const getCurrentSubscription = async () => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    // Check if service worker is available
    if (!navigator.serviceWorker.controller && !navigator.serviceWorker.ready) {
      return null;
    }

    // Get registration
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations[0];

    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.warn('Failed to get current subscription:', error);
    return null;
  }
};

/**
 * Send test notification
 * @returns {Promise<Object>}
 */
export const sendTestNotification = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.post('/api/notifications/subscriptions/test_notification/', {
      title: 'SmarTanom Test Notification',
      message: 'This is a test notification from SmarTanom. Your push notifications are working correctly!',
      notification_type: 'info',
      url: '/dashboard'
    }, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    throw error;
  }
};

/**
 * Get notification logs
 * @param {Object} params - Query parameters (page, page_size, etc.)
 * @returns {Promise<Object>}
 */
export const getNotificationLogs = async (params = {}) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/notifications/logs/', {
      params,
      authToken: token
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch notification logs:', error);
    throw error;
  }
};

export default {
  getVapidPublicKey,
  isPushNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getCurrentSubscription,
  sendTestNotification,
  getNotificationLogs,
};
