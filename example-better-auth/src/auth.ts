// Auth config. Uses Node.js built-in SQLite with a configurable database path.
// Set AUTH_DB env variable to override the default file path. Use ':memory:'
// for in-memory testing. better-auth auto-creates tables with raw SQLite.
// The bearer plugin enables Authorization: Bearer <token> auth for API
// clients and testing. emailAndPassword is enabled so tests can create users
// via auth.api.signUpEmail without needing the testUtils plugin.
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins'
import { DatabaseSync } from 'node:sqlite'

const dbPath = process.env.AUTH_DB || 'auth.sqlite'
export const database = new DatabaseSync(dbPath)

export const auth = betterAuth({
  database,
  secret: 'spiceflow-example-secret-at-least-32-chars!!',
  baseURL: 'http://localhost:5173',
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
})

export type Auth = typeof auth
