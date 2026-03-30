import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    spiceflowPlugin({
      entry: './app/main.tsx',
    }),
    react(),
  ],
})
