// Separate vitest config that excludes the Cloudflare vite plugin,
// which is incompatible with vitest's environment setup.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
