import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import spiceflow from 'spiceflow/vite'

// REMOTE_ORIGIN must be set to the remote's public URL so all built asset
// paths (JS chunks, CSS) are absolute. Without this, the host browser would
// fetch them relative to the host origin and get 404s.
const remoteOrigin = process.env.REMOTE_ORIGIN || 'http://localhost:3051'

export default defineConfig({
  base: remoteOrigin,
  clearScreen: false,
  server: {
    cors: true,
  },
  plugins: [
    spiceflow({
      entry: './app/main.tsx',
      federation: 'remote',
    }),
    react(),
  ],
})
