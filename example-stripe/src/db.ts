// Drizzle client for SQLite. Reads DB_PATH env var, defaults to
// 'stripe-example.sqlite'. Tests set DB_PATH=':memory:' via vitest env.
import { drizzle } from 'drizzle-orm/node-sqlite'
import { DatabaseSync } from 'node:sqlite'
import * as schema from './schema.js'

const dbPath = process.env.DB_PATH || 'stripe-example.sqlite'
export const database = new DatabaseSync(dbPath)
export const db = drizzle({ client: database, schema, relations: schema.relations })
