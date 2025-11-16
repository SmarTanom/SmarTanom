/**
 * PWA Push Notification Service
 * Handles push notification subscriptions and management
 */

class PWANotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers not supported');
    }

    if (!('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    try {
      // In this app, SW registration is handled by pwaInit (vite-plugin-pwa)
      const isDev = typeof window !== 'undefined' && window.location && /localhost|127\.0\.0\.1/.test(window.location.host);
      // Wait for service worker to be ready in production; dev returns null to no-op
      this.registration = isDev ? null : await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(vapidPublicKey) {
    if (!this.registration) {
      await this.initialize();
      if (!this.registration) return null; // dev mode: no-op
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.registration) {
      return true; // dev mode: no-op
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();

      if (subscription) {
        const result = await subscription.unsubscribe();
        this.subscription = null;
        return result;
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscription() {
    if (!this.registration) {
      await this.initialize();
      if (!this.registration) return null; // dev mode: no-op
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Show local notification
   */
  async showNotification(title, options = {}) {
    if (!this.registration) {
      await this.initialize();
      if (!this.registration) return; // dev mode: no-op
    }

    const defaultOptions = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: 'smartanom-notification',
      requireInteraction: false,
      ...options
    };

    try {
      await this.registration.showNotification(title, defaultOptions);
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription, endpoint = '/api/notifications/subscribe/') {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Token ${token}` : ''
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          user_agent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  /**
   * Convert VAPID public key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check notification permission status
   */
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Check if notifications are supported
   */
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
}

// Create singleton instance
const notificationService = new PWANotificationService();

export default notificationService;
