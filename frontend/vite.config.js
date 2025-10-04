import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Forward API calls to Django dev server
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // No rewrite: backend already serves under /api
      },
      // Optional: health endpoints if referenced directly
      '/healthz': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
