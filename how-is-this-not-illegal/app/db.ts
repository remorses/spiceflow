// Shared Postgres client for the demo app, works with any standard POSTGRES_URL.
import postgres from 'postgres'

const connectionString = process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error('POSTGRES_URL is required')
}

const globalForPostgres = globalThis

export const sql =
  globalForPostgres.__howIsThisNotIllegalSql ??
  (globalForPostgres.__howIsThisNotIllegalSql = postgres(connectionString, {
    ssl: 'require',
  }))
