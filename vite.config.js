import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served at https://<user>.github.io/<repo>/
// Set BASE_PATH=/body-health-app/ (or your repo name) when building for GitHub Pages.
const base = process.env.BASE_PATH ?? './'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      // Avoid CORS when calling Open Food Facts from the browser (dev only).
      '/api/off': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/off/, ''),
      },
    },
  },
})
