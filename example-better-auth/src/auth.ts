// Auth config. Uses Node.js built-in SQLite (node:sqlite) with a file database.
// The bearer plugin enables Authorization: Bearer <token> auth for API
// clients and testing. emailAndPassword is enabled so tests can create users
// via auth.api.signUpEmail without needing the testUtils plugin.
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins'
import { DatabaseSync } from 'node:sqlite'

export function createAuth(database = new DatabaseSync('auth.sqlite')) {
  return betterAuth({
    database,
    secret: 'spiceflow-example-secret-at-least-32-chars!!',
    baseURL: 'http://localhost:5173',
    emailAndPassword: { enabled: true },
    plugins: [bearer()],
  })
}

export const auth = createAuth()

export type Auth = ReturnType<typeof createAuth>
