// Tests for the better-auth spiceflow app. Creates a test auth instance with
// an in-memory SQLite database, applies drizzle migrations, then uses the
// native auth.api.signUpEmail to create real users and get bearer tokens.
// No testUtils plugin needed.
import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from './main.js'
import { createAuth } from './auth.js'

// In-memory SQLite with drizzle migrations applied
const testDb = new DatabaseSync(':memory:')
const db = drizzle({ client: testDb })
migrate(db, {
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
})

// Same createAuth as production, just with in-memory DB
const testAuth = createAuth(testDb)

// Create a user via the real signUp API, returns bearer token
async function createAuthedUser(overrides?: {
  email?: string
  name?: string
}) {
  const email = overrides?.email ?? `test-${Date.now()}@example.com`
  const name = overrides?.name ?? 'Test User'
  const res = await testAuth.api.signUpEmail({
    body: { email, name, password: 'test-password-123' },
  })
  return { user: res.user, token: res.token! }
}

// Fetch client with test auth injected via state
const f = createSpiceflowFetch(app, {
  state: { auth: testAuth },
})

describe('public routes', () => {
  test('home page renders without auth', async () => {
    const res = await f('/')
    if (!(res instanceof SpiceflowTestResponse))
      throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Public page')
  })

  test('login page renders for unauthenticated users', async () => {
    const res = await f('/login')
    if (!(res instanceof SpiceflowTestResponse))
      throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toContain('Please sign in')
  })
})

describe('protected routes', () => {
  beforeAll(async () => {
    const { token } = await createAuthedUser({ name: 'Alice' })
    f.headers = { authorization: `Bearer ${token}` }
  })

  afterAll(() => {
    f.headers = undefined
  })

  test('GET /api/me returns current user', async () => {
    const result = await f('/api/me')
    if (result instanceof Error) throw result
    expect(result).toHaveProperty('name', 'Alice')
    expect(result).toHaveProperty('email')
    expect(result).toHaveProperty('id')
  })

  test('dashboard page renders user info', async () => {
    const res = await f('/dashboard')
    if (!(res instanceof SpiceflowTestResponse))
      throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Dashboard')
    expect(html).toContain('Alice')
  })
})

describe('unauthenticated access', () => {
  test('GET /api/me returns 401', async () => {
    const unauthed = createSpiceflowFetch(app, {
      state: { auth: testAuth },
    })
    const result = await unauthed('/api/me')
    expect(result).toBeInstanceOf(Error)
  })

  test('dashboard redirects to login', async () => {
    const unauthed = createSpiceflowFetch(app, {
      state: { auth: testAuth },
    })
    const result = await unauthed('/dashboard')
    expect(result).toBeInstanceOf(Error)
  })
})

describe('multiple users', () => {
  test('different users get different data', async () => {
    const user1 = await createAuthedUser({ name: 'Bob', email: 'bob@test.com' })
    const user2 = await createAuthedUser({
      name: 'Carol',
      email: 'carol@test.com',
    })

    const f1 = createSpiceflowFetch(app, {
      state: { auth: testAuth },
      headers: { authorization: `Bearer ${user1.token}` },
    })
    const f2 = createSpiceflowFetch(app, {
      state: { auth: testAuth },
      headers: { authorization: `Bearer ${user2.token}` },
    })

    const me1 = await f1('/api/me')
    const me2 = await f2('/api/me')

    if (me1 instanceof Error) throw me1
    if (me2 instanceof Error) throw me2

    expect(me1).toHaveProperty('name', 'Bob')
    expect(me2).toHaveProperty('name', 'Carol')
    expect(me1.id).not.toBe(me2.id)
  })
})
