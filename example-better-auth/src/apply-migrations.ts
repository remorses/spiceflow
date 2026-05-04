// Vitest setup file that applies drizzle migrations to the in-memory SQLite
// database before tests run. AUTH_DB=:memory: is set in vite.config.ts.
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { database } from './auth.js'

const db = drizzle({ client: database })
migrate(db, {
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
})
