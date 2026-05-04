/// <reference types="vitest/config" />
import { cloudflare } from '@cloudflare/vite-plugin'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import react from '@vitejs/plugin-react'
import spiceflow from 'spiceflow/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  clearScreen: false,
  plugins: [
    // cloudflareTest() runs tests inside workerd via @cloudflare/vitest-pool-workers.
    // cloudflare() handles dev/build/preview/deploy but conflicts with the vitest
    // pool (both manage workerd + resolve.external validation clashes), so only
    // one is active at a time.
    process.env.VITEST
      ? cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })
      : cloudflare({
          viteEnvironment: {
            name: 'rsc',
            childEnvironments: ['ssr'],
          },
        }),
    react(),
    spiceflow({
      entry: './src/main.tsx',
    }),
  ],
})
