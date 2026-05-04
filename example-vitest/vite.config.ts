/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    spiceflow({
      entry: './src/main.tsx',
    }),
    react(),
  ],
  test: {},
})
