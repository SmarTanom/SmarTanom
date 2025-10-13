import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const plugins = [react()];

  // Add PWA plugin with different settings for dev/prod
  if (isDev) {
    // Development mode - minimal PWA setup to provide the virtual module
    plugins.push(VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false, // Don't actually register SW in dev
        type: 'module'
      },
      workbox: {
        // Minimal workbox config for dev
        skipWaiting: false,
        clientsClaim: false,
      },
      includeAssets: [],
      manifest: false // Don't generate manifest in dev
    }));
  } else {
    // Production mode - full PWA setup
    plugins.push(VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
          type: 'module'
        },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/, /^\/static\//, /^\/media\//],
        // Disable API caching in development to prevent conflicts between different backends
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly', // Changed from NetworkFirst to NetworkOnly to disable caching
            options: {
              cacheName: 'api-cache-dev',
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^\/media\//,
            handler: 'NetworkFirst', // Keep media caching but with shorter duration
            options: {
              cacheName: 'media-cache-dev',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour only in dev
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SmarTanom - Smart Agriculture Monitoring',
        short_name: 'SmarTanom',
        description: 'Monitor your hydroponic systems with real-time sensor data and alerts',
        theme_color: '#339432',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities', 'lifestyle'],
        lang: 'en-US',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View device monitoring dashboard',
            url: '/dashboard',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Alerts',
            short_name: 'Alerts',
            description: 'Check system alerts',
            url: '/alerts',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      }
    }));
  }

  return {
    plugins,
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Forward API calls to Django dev server (backend runs on 8000)
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        // Health (if directly referenced outside /api)
        '/healthz': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        // Optionally expose static/media if you later reference them directly from frontend dev
        '/static': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
