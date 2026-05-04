// Better-auth core tables for SQLite. Uses camelCase column names to match
// better-auth's internal Kysely adapter (which uses camelCase by default when
// you pass a raw SQLite instance without a drizzle adapter).
// All child tables cascade on user delete so test cleanup only needs one call.
import * as sqliteCore from 'drizzle-orm/sqlite-core'

export const user = sqliteCore.sqliteTable('user', {
  id: sqliteCore.text('id').primaryKey(),
  name: sqliteCore.text('name').notNull(),
  email: sqliteCore.text('email').notNull().unique(),
  emailVerified: sqliteCore.integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: sqliteCore.text('image'),
  createdAt: sqliteCore.integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: sqliteCore.integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteCore.sqliteTable('session', {
  id: sqliteCore.text('id').primaryKey(),
  expiresAt: sqliteCore.integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: sqliteCore.text('token').notNull().unique(),
  createdAt: sqliteCore.integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: sqliteCore.integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: sqliteCore.text('ipAddress'),
  userAgent: sqliteCore.text('userAgent'),
  userId: sqliteCore.text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteCore.sqliteTable('account', {
  id: sqliteCore.text('id').primaryKey(),
  accountId: sqliteCore.text('accountId').notNull(),
  providerId: sqliteCore.text('providerId').notNull(),
  userId: sqliteCore.text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: sqliteCore.text('accessToken'),
  refreshToken: sqliteCore.text('refreshToken'),
  idToken: sqliteCore.text('idToken'),
  accessTokenExpiresAt: sqliteCore.integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: sqliteCore.integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: sqliteCore.text('scope'),
  password: sqliteCore.text('password'),
  createdAt: sqliteCore.integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: sqliteCore.integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteCore.sqliteTable('verification', {
  id: sqliteCore.text('id').primaryKey(),
  identifier: sqliteCore.text('identifier').notNull(),
  value: sqliteCore.text('value').notNull(),
  expiresAt: sqliteCore.integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: sqliteCore.integer('createdAt', { mode: 'timestamp' }),
  updatedAt: sqliteCore.integer('updatedAt', { mode: 'timestamp' }),
})
