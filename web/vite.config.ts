import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API runs on :5030 (Vibasic.Api, profile "http"); the dev server proxies /api so no CORS is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://localhost:5030' },
  },
})
