import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Matches api.js default when VITE_API_URL is unset (local standalone on port 5001).
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => '/bikesakes/us-central1/api' + path.replace(/^\/api/, ''),
      },
    },
  },
})
