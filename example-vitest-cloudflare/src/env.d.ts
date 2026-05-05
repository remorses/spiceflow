// Type augmentation for the test-only TEST_MIGRATIONS binding injected via
// miniflare config in vite.config.ts.

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: D1Migration[]
  }
}

interface D1Migration {
  name: string
  queries: string[]
}
