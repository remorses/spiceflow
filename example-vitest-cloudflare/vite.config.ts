/// <reference types="vitest/config" />
import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import react from '@vitejs/plugin-react'
import spiceflow from 'spiceflow/vite'
import { defineConfig } from 'vite'

export default defineConfig(async () => {
  // Read D1 migration SQL files so they can be applied in the workerd setup file
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations')).catch(() => [])

  return {
    clearScreen: false,
    plugins: [
      // cloudflareTest() runs tests inside workerd via @cloudflare/vitest-pool-workers.
      // cloudflare() handles dev/build/preview/deploy but conflicts with the vitest
      // pool (both manage workerd + resolve.external validation clashes), so only
      // one is active at a time.
      process.env.VITEST
        ? cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
              bindings: { TEST_MIGRATIONS: migrations },
            },
          })
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
    test: {
      setupFiles: ['./src/apply-migrations.ts'],
    },
  }
})
