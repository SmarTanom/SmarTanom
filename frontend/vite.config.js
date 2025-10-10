import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
