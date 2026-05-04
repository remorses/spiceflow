---
title: Testing with Vitest
description: Unit test spiceflow routes, pages, actions, and middleware with vitest.
---

# Testing with Vitest

Test your spiceflow app directly with vitest. Call `app.handle()` on page and API routes, call server actions as plain functions, and assert on responses. No browser, no build, sub-second feedback.

## Setup

Add the spiceflow vite plugin to your vitest config. The plugin auto-detects vitest and configures everything.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [spiceflow({ entry: './src/main.tsx' })],
})
```

No extra `resolve.conditions` or environment config needed.

## Testing API Routes

Use `createSpiceflowFetch(app)` for type-safe API testing. It calls `app.handle()` internally and parses responses.

```ts
import { test, expect } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

test('GET /api/projects returns json', async () => {
  const result = await f('/api/projects')
  expect(result).toMatchInlineSnapshot(`
    {
      "projects": [],
    }
  `)
})

test('GET /api/projects/:id with params', async () => {
  const result = await f('/api/projects/:id', { params: { id: '42' } })
  expect(result).toMatchInlineSnapshot(`
    {
      "id": "42",
      "name": "My Project",
    }
  `)
})
```

Paths and params are fully typed. Invalid paths or missing required params are compile errors.

## Testing Page Routes

Page routes also work with `createSpiceflowFetch`. They return a `SpiceflowTestResponse` with the rendered JSX.

```ts
import { test, expect } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

test('GET /dashboard renders page with layout', async () => {
  const res = await f('/dashboard')
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(res.status).toBe(200)

  // Full HTML with layouts
  expect(await res.text()).toContain('Dashboard')

  // Page-only HTML (no layout wrapper)
  expect(await res.text(res.page)).toContain('<h1>Dashboard</h1>')

  // Loader data
  expect(res.loaderData).toEqual({ projects: [] })
})

test('page with params', async () => {
  const res = await f('/users/:id', { params: { id: '42' } })
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(await res.text()).toContain('User 42')
})
```

**`res.text()`** renders the full composed page (layouts wrapping the page) to HTML. Client components that use `useLoaderData` get the correct data.

**`res.text(node)`** renders a specific node. Pass `res.page` for the page only, or `res.layouts[0].element` for a single layout.

**`res.page`** gives raw JSX for vitest inline snapshots without rendering.

## Testing with Authentication

Declare two fetch clients at the top of your test file. One unauthenticated, one with a Bearer token.

```ts
import { test, expect } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'

const f = createSpiceflowFetch(app)
const authed = createSpiceflowFetch(app, {
  headers: { authorization: 'Bearer test-token' },
})

test('unauthenticated request returns error', async () => {
  const result = await f('/admin')
  expect(result).toBeInstanceOf(Error)
})

test('authenticated request renders admin page', async () => {
  const res = await authed('/admin')
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(await res.text()).toContain('Admin Panel')
})

test('authenticated API call returns user data', async () => {
  const result = await authed('/api/me')
  expect(result).toMatchInlineSnapshot(`
    {
      "user": "tommy",
      "token": "test-token",
    }
  `)
})

test('unauthenticated API call returns error', async () => {
  const result = await f('/api/me')
  expect(result).toBeInstanceOf(Error)
})
```

Middleware runs before page handlers, just like in production.

## Server Actions

Server actions in `"use server"` files become plain functions in vitest (the directive is stripped automatically). Call them directly.

```ts
import { test, expect } from 'vitest'
import { runAction } from 'spiceflow/testing'
import { createProject, deleteProject } from './actions.js'

test('createProject returns the new project', async () => {
  const project = await createProject('My App')
  expect(project).toMatchInlineSnapshot(`
    {
      "id": "1",
      "name": "My App",
    }
  `)
})
```

Actions that call `getActionRequest()` need the `runAction` wrapper to provide request context.

```ts
test('action reads request headers', async () => {
  const result = await runAction(() => headerAwareAction(), {
    request: new Request('http://localhost', {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
    }),
  })
  expect(result.auth).toBe('Bearer admin-token')
})
```

Actions that call `redirect()` throw a Response. Use `.catch()` to capture it.

```ts
test('action redirects after mutation', async () => {
  const error = await runAction(() => submitForm()).catch((e) => e)
  if (!(error instanceof Response)) throw new Error('expected redirect')
  expect(error.status).toBe(307)
  expect(error.headers.get('location')).toBe('/dashboard')
})
```

## Stateful Workflows

Test full user workflows: render a page, call an action, render again, verify the state changed.

```ts
import { test, expect } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app, projectStore } from './main.js'
import { createProject } from './actions.js'

const f = createSpiceflowFetch(app)

test('dashboard shows projects after creation', async () => {
  projectStore.length = 0

  // Empty state
  const empty = await f('/dashboard')
  if (!(empty instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(await empty.text()).toContain('No projects yet')

  // Create a project via action
  await createProject('My New App')

  // Page now shows the project
  const filled = await f('/dashboard')
  if (!(filled instanceof SpiceflowTestResponse)) throw new Error('expected page')
  const html = await filled.text()
  expect(html).toContain('My New App')
  expect(html).not.toContain('No projects yet')
})
```

Client components using `useLoaderData` get correct data because the loader runs on each request and the result is provided to the rendering context.

## Dependency Injection with State

Use `.state()` to register dependencies your handlers need (database clients, KV stores, auth services). In tests, pass overrides via `createSpiceflowFetch(app, { state })` to swap real services for test doubles.

```ts
// main.tsx
import { Spiceflow } from 'spiceflow'

// Define the app with typed state for a KV store and auth
export const app = new Spiceflow()
  .state('kv', productionKV as KVStore)
  .state('user', null as User | null)
  .get('/api/projects', async ({ state }) => {
    if (!state.user) return new Response('Unauthorized', { status: 401 })
    const projects = await state.kv.get(`projects:${state.user.id}`)
    return { projects: projects ?? [] }
  })
  .get('/api/projects/:id', async ({ state, params }) => {
    if (!state.user) return new Response('Unauthorized', { status: 401 })
    const project = await state.kv.get(`project:${params.id}`)
    if (!project) return new Response('Not Found', { status: 404 })
    return project
  })
  .post('/api/projects', async ({ state, request }) => {
    if (!state.user) return new Response('Unauthorized', { status: 401 })
    const body = await request.json()
    await state.kv.put(`project:${body.id}`, body)
    return body
  })

interface KVStore {
  get(key: string): Promise<any>
  put(key: string, value: any): Promise<void>
}

interface User {
  id: string
  name: string
}
```

In tests, create a fake KV store and pass it as state. No mocking modules, no patching globals. The typed state ensures your test doubles match the expected interface.

```ts
// main.test.ts
import { test, expect } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'

// In-memory KV for tests
const store = new Map<string, any>()
const fakeKV = {
  async get(key: string) { return store.get(key) },
  async put(key: string, value: any) { store.set(key, value) },
}

const testUser = { id: 'u1', name: 'Tommy' }

// Typed fetch with test state injected
const f = createSpiceflowFetch(app, {
  state: { kv: fakeKV, user: testUser },
})

// Unauthenticated client (user: null)
const anon = createSpiceflowFetch(app, {
  state: { kv: fakeKV, user: null },
})

test('authenticated user can create and list projects', async () => {
  store.clear()

  // Create a project
  await f('/api/projects', {
    method: 'POST',
    body: { id: 'p1', name: 'My App' },
  })

  // Verify KV was written
  expect(store.get('project:p1')).toEqual({ id: 'p1', name: 'My App' })
})

test('unauthenticated user gets 401', async () => {
  const result = await anon('/api/projects')
  expect(result).toBeInstanceOf(Error)
})
```

**When to use state for DI:**

- **External services** (KV, database, email, storage) you want to replace with in-memory fakes in tests
- **Auth context** (current user, session) so you don't need to set up real auth flows
- **Feature flags** or config that varies between tests

State is deep-cloned per request by default, so each `app.handle()` call gets its own copy. Overrides via `createSpiceflowFetch` or `app.handle(req, { state })` replace the defaults for that call only.

## Testing with better-auth

When your app uses [better-auth](https://better-auth.com) for authentication, make the database path configurable via an **environment variable** so tests run against an in-memory SQLite database. No test-only auth instances, no state injection.

### Auth config

Read the database path from an env variable, defaulting to a file for production. The `bearer()` plugin enables `Authorization: Bearer <token>` headers for API clients and testing. `emailAndPassword` lets tests create real users via `auth.api.signUpEmail`.

```ts
// auth.ts
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
```

### Vitest config

Set `AUTH_DB=:memory:` in the test environment and add a setup file that applies drizzle migrations to the in-memory database before tests run.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [spiceflow({ entry: './src/main.tsx' }), react()],
  test: {
    env: {
      AUTH_DB: ':memory:',
    },
    setupFiles: ['./src/apply-migrations.ts'],
  },
})
```

```ts
// src/apply-migrations.ts
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { database } from './auth.js'

const db = drizzle({ client: database })
migrate(db, {
  migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
})
```

### Test helper

Write a small helper that creates a user via the real `signUpEmail` API and returns a bearer token. Use unique emails per test to avoid collisions.

```ts
import { auth } from './auth.js'

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
```

### Usage in tests

Create the fetch client at the **top level**. Set the mutable `.headers` field in `beforeAll` after creating a user and getting a token.

```ts
import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

describe('authenticated routes', () => {
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
  })

  test('protected page renders for authed user', async () => {
    const res = await f('/dashboard')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(await res.text()).toContain('Dashboard')
  })
})
```

### Server actions with auth

Server actions that call `getActionRequest()` to read auth headers need the `runAction` wrapper. Pass a request with the bearer token to authenticate.

```ts
// actions.ts
"use server"
import { getActionRequest, redirect } from 'spiceflow'
import { auth } from './auth.js'

export async function getCurrentUser() {
  const request = getActionRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('unauthorized')
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }
}

export async function updateProfile(name: string) {
  const request = getActionRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('unauthorized')
  await auth.api.updateUser({ body: { name }, headers: request.headers })
  return { updated: true, name }
}

export async function requireAuthOrRedirect() {
  const request = getActionRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect('/login')
  return { userId: session.user.id }
}
```

Test these actions with `runAction`, passing a request with the bearer token.

```ts
import { test, expect, beforeAll } from 'vitest'
import { runAction } from 'spiceflow/testing'
import { getCurrentUser, updateProfile, requireAuthOrRedirect } from './actions.js'

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
})

test('updateProfile changes the user name', async () => {
  const result = await runAction(() => updateProfile('Dave Updated'), {
    request: authedRequest(),
  })
  expect(result).toEqual({ updated: true, name: 'Dave Updated' })
})

test('unauthenticated action throws error', async () => {
  const error = await runAction(() => getCurrentUser()).catch((e) => e)
  expect(error).toBeInstanceOf(Error)
  expect(error.message).toBe('unauthorized')
})

test('redirect action throws Response when unauthenticated', async () => {
  const error = await runAction(() => requireAuthOrRedirect()).catch((e) => e)
  if (!(error instanceof Response)) throw new Error('expected Response')
  expect(error.status).toBe(307)
  expect(error.headers.get('location')).toBe('/login')
})
```

## Type Safety

Register your app type once so `router.href()` and `createSpiceflowFetch()` paths are fully typed.

```ts
// main.tsx
export const app = new Spiceflow()
  .get('/api/projects', () => ({ projects: [] }))
  .page('/dashboard', async () => <div>Dashboard</div>)

declare module 'spiceflow/react' {
  interface SpiceflowRegister {
    app: typeof app
  }
}
```

Invalid paths and missing params are caught at compile time.

```ts
// @ts-expect-error - path does not exist
router.href('/nonexistent')

// @ts-expect-error - missing required params
f('/api/projects/:id')
```

## Tracing

Use `createTestTracer()` to capture spans during `app.handle()` and snapshot the trace tree.

```ts
import { test, expect } from 'vitest'
import { Spiceflow } from 'spiceflow'
import { createTestTracer } from 'spiceflow/testing'

const tracer = createTestTracer()
const app = new Spiceflow({ tracer })
  .use(async (ctx, next) => { await next() }) // auth middleware
  .get('/api/projects', () => ({ projects: [] }))

test('request spans', async () => {
  tracer.clear()
  await app.handle(new Request('http://localhost/api/projects'))
  expect(tracer.text()).toMatchInlineSnapshot(`
    "GET /api/projects (200)
    ├── middleware - anonymous
    └── handler - /api/projects"
  `)
})
```

`tracer.text()` renders the span tree as ASCII. `tracer.spans` gives raw access to span objects. `tracer.clear()` resets between tests.

## What's Not Supported

Vitest mode bypasses RSC Flight serialization. Some features require the full RSC environment and should be tested with e2e tests (Playwright).

- **Error boundaries**: errors in page handlers return a 500 JSON response. The error boundary fallback UI is not rendered. Use e2e tests for error boundary behavior.
- **Server actions via form POST**: the RSC action protocol (decoding form data into server function calls) is not available. Test action logic by calling functions directly instead.
- **Client-side navigation**: there's no browser, so `router.push()`, hydration, and client-side transitions can't be tested. Use e2e tests for navigation flows.
