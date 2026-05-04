// Type augmentation for the test-only TEST_MIGRATIONS binding injected via
// miniflare config in vite.config.ts.
import type { D1Migration } from 'cloudflare:test'

declare module 'cloudflare:workers' {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[]
  }
}
