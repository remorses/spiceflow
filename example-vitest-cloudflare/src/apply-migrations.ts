// Setup file that applies D1 migrations before tests run.
// Runs outside per-test-file storage isolation, and may run multiple times.
// applyD1Migrations() only applies migrations that haven't already been
// applied, so it is safe to call repeatedly.
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
