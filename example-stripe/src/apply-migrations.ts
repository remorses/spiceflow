// Vitest setup file: applies drizzle migrations to the in-memory SQLite
// database before tests run. DB_PATH is not set in test env so we use
// the default in-memory database created by db.ts.
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { database } from './db.js'

const migrationsDb = drizzle({ client: database })
migrate(migrationsDb, {
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
})
