import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Dev-only: proxy API calls through Vite's own origin so the browser
    // never has to make a cross-port request to the backend directly.
    // Purely a local dev convenience -- production still talks to whatever
    // VITE_API_BASE_URL points at, this only kicks in when that base URL
    // is a relative path (see .env).
    proxy: {
      "/api/v1": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Uploaded submission photos/PDFs are served by the backend at /uploads;
      // proxying keeps them on the same origin as everything else in dev.
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})