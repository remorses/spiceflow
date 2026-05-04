/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import spiceflow from 'spiceflow/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
    spiceflow({
      entry: './src/main.tsx',
    }),
    react(),
  ],
})
