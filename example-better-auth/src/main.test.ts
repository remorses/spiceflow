// Tests for the better-auth spiceflow app. Auth uses an in-memory SQLite
// database (AUTH_DB=:memory: set in vite.config.ts). Migrations are applied
// by the setup file before tests run. Uses the real auth.api.signUpEmail
// to create users and get bearer tokens.
import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse, runAction } from 'spiceflow/testing'
import { app } from './main.js'
import { auth } from './auth.js'
import { updateProfile, getCurrentUser, requireAuthOrRedirect } from './actions.js'

async function createAuthedUser(overrides?: {
  email?: string
  name?: string
}) {
  const email = overrides?.email ?? `test-${Date.now()}@example.com`
  const name = overrides?.name ?? 'Test User'
  const res = await auth.api.signUpEmail({
    body: { email, name, password: 'test-password-123' },
  })
  return { user: res.user, token: res.token! }
}

const f = createSpiceflowFetch(app)

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
    const unauthed = createSpiceflowFetch(app)
    const result = await unauthed('/api/me')
    expect(result).toBeInstanceOf(Error)
  })

  test('dashboard redirects to login', async () => {
    const unauthed = createSpiceflowFetch(app)
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
      headers: { authorization: `Bearer ${user1.token}` },
    })
    const f2 = createSpiceflowFetch(app, {
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

describe('server actions with auth', () => {
  let token: string

  beforeAll(async () => {
    const user = await createAuthedUser({ name: 'Dave', email: 'dave@test.com' })
    token = user.token
  })

  function authedRequest() {
    return new Request('http://localhost', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
  }

  test('getCurrentUser returns user data', async () => {
    const result = await runAction(() => getCurrentUser(), {
      request: authedRequest(),
    })
    expect(result).toHaveProperty('name', 'Dave')
    expect(result).toHaveProperty('email', 'dave@test.com')
    expect(result).toHaveProperty('id')
  })

  test('updateProfile changes the user name', async () => {
    const result = await runAction(() => updateProfile('Dave Updated'), {
      request: authedRequest(),
    })
    expect(result).toEqual({ updated: true, name: 'Dave Updated' })

    const user = await runAction(() => getCurrentUser(), {
      request: authedRequest(),
    })
    expect(user).toHaveProperty('name', 'Dave Updated')
  })

  test('unauthenticated action throws error', async () => {
    const error = await runAction(() => getCurrentUser()).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('unauthorized')
  })

  test('requireAuthOrRedirect throws redirect when unauthenticated', async () => {
    const error = await runAction(() => requireAuthOrRedirect()).catch((e) => e)
    if (!(error instanceof Response)) throw new Error('expected Response')
    expect(error.status).toBe(307)
    expect(error.headers.get('location')).toBe('/login')
  })

  test('requireAuthOrRedirect returns userId when authenticated', async () => {
    const result = await runAction(() => requireAuthOrRedirect(), {
      request: authedRequest(),
    })
    expect(result).toHaveProperty('userId')
  })
})
