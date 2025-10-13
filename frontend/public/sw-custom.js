/**
 * Custom Service Worker for SmarTanom PWA
 * Handles push notifications and custom PWA logic
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching for API calls
registerRoute(
  /^\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Runtime caching for media files
registerRoute(
  /^\/media\//,
  new CacheFirst({
    cacheName: 'media-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Handle push notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'SmarTanom Alert',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: 'smartanom-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: {
        url: notificationData.url || '/dashboard',
        ...notificationData.data
      }
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/dashboard';

  // Handle specific actions
  if (action === 'view') {
    targetUrl = notificationData.url || '/dashboard';
  } else if (action === 'dismiss') {
    return; // Just close the notification
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate
            client.focus();
            if (client.navigate) {
              client.navigate(targetUrl);
            }
            return;
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);

  // Optional: Track notification dismissals
  // You can send analytics data here
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  try {
    // You can implement offline data sync here
    // For example, sync cached API requests when back online
    console.log('Handling background sync...');

    // Example: Send queued offline requests
    const cache = await caches.open('offline-requests');
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', function(event) {
  console.log('Periodic sync:', event.tag);

  if (event.tag === 'content-sync') {
    event.waitUntil(
      // Periodic tasks like checking for new alerts
      handlePeriodicSync()
    );
  }
});

async function handlePeriodicSync() {
  try {
    console.log('Handling periodic sync...');

    // Example: Check for new alerts and show notifications
    // This would typically involve fetching from your API

    // For now, just log that it's working
    console.log('Periodic sync completed');
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Message handling for communication with main app
self.addEventListener('message', function(event) {
  console.log('Service worker message:', event.data);

  const { type, payload } = event.data;

  switch (type) {
    case 'SHOW_NOTIFICATION':
      self.registration.showNotification(payload.title, payload.options);
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '1.0.0' });
      break;

    default:
      console.log('Unknown message type:', type);
  }
});
