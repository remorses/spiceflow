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

Use `app.handle()` with `router.href()` for type-safe URL building. Page routes return a `SpiceflowTestResponse` with the rendered JSX.

```ts
import { test, expect } from 'vitest'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { router } from 'spiceflow/react'
import { app } from './main.js'

test('GET /dashboard renders page with layout', async () => {
  const res = await app.handle(
    new Request(`http://localhost${router.href('/dashboard')}`),
  )
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(res.status).toBe(200)

  // Full HTML with layouts
  expect(await res.text()).toContain('Dashboard')

  // Page-only HTML (no layout wrapper)
  expect(await res.text(res.page)).toContain('<h1>Dashboard</h1>')

  // Loader data
  expect(res.loaderData).toEqual({ projects: [] })
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

test('unauthenticated request to protected route returns 401', async () => {
  const res = await app.handle(new Request('http://localhost/admin'))
  expect(res.status).toBe(401)
})

test('authenticated request renders admin page', async () => {
  const res = await app.handle(
    new Request('http://localhost/admin', {
      headers: { authorization: 'Bearer test-token' },
    }),
  )
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
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { router } from 'spiceflow/react'
import { app, projectStore } from './main.js'
import { createProject } from './actions.js'

test('dashboard shows projects after creation', async () => {
  projectStore.length = 0

  // Empty state
  const empty = await app.handle(
    new Request(`http://localhost${router.href('/dashboard')}`),
  )
  if (!(empty instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(await empty.text()).toContain('No projects yet')

  // Create a project via action
  await createProject('My New App')

  // Page now shows the project
  const filled = await app.handle(
    new Request(`http://localhost${router.href('/dashboard')}`),
  )
  if (!(filled instanceof SpiceflowTestResponse)) throw new Error('expected page')
  const html = await filled.text()
  expect(html).toContain('My New App')
  expect(html).not.toContain('No projects yet')
})
```

Client components using `useLoaderData` get correct data in `res.text()` because the loader runs on each `app.handle()` call and the result is provided to the rendering context.

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

When your app uses [better-auth](https://better-auth.com) for authentication, you can test protected routes with **real database sessions** instead of hardcoded tokens. The `testUtils` plugin creates users and sessions directly in the database, giving you a real bearer token to pass via `createSpiceflowFetch`.

### Auth config for tests

Create a test-only auth instance that includes the `testUtils()` and `bearer()` plugins. Keep `testUtils()` out of your production config since it exposes privileged helpers for creating sessions and deleting users.

```ts
// lib/auth.test.ts
import { betterAuth } from 'better-auth'
import { testUtils, bearer } from 'better-auth/plugins'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { db } from 'db'

export const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: 'test-secret-at-least-32-chars-long!!',
  baseURL: 'http://localhost:3000',
  emailAndPassword: { enabled: true },
  plugins: [testUtils(), bearer()],
})
```

Your production auth config must also include `bearer()` so that `Authorization: Bearer <token>` headers are recognized by `auth.api.getSession()`.

### Test helper

Write a small helper that creates a user, saves it to the database, and logs in to get a session token. Use `afterAll` to delete the user and avoid leaking test data.

Design your database schema with **cascade deletes** on foreign keys (e.g. `onDelete: 'cascade'` in Drizzle). This way, deleting the user row automatically cleans up sessions, accounts, and any app-specific rows that reference it.

```ts
// test-utils.ts
import { testAuth } from './lib/auth.test'
import type { TestHelpers } from 'better-auth/plugins'

let helpers: TestHelpers

async function getHelpers() {
  if (!helpers) {
    const ctx = await testAuth.$context
    helpers = ctx.test
  }
  return helpers
}

export async function createAuthedUser(overrides?: {
  email?: string
  name?: string
}) {
  const t = await getHelpers()
  const user = t.createUser({
    email: overrides?.email ?? `test-${Date.now()}@example.com`,
    name: overrides?.name ?? 'Test User',
  })
  await t.saveUser(user)
  const { token, session } = await t.login({ userId: user.id })
  return { user, token, session, deleteUser: () => t.deleteUser(user.id) }
}
```

### Usage in tests

Create the fetch client at the **top level** of your test file. Set the `.headers` field in `beforeAll` after creating the user and getting a token. Delete the user in `afterAll` to avoid leaking test data.

```ts
import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'
import { createAuthedUser } from './test-utils'

const f = createSpiceflowFetch(app)

describe('authenticated routes', () => {
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const { token, deleteUser } = await createAuthedUser({ name: 'Alice' })
    cleanup = deleteUser
    f.headers = { authorization: `Bearer ${token}` }
  })

  afterAll(async () => {
    f.headers = undefined
    // Cascade deletes clean up sessions, accounts, and related rows
    await cleanup()
  })

  test('GET /api/me returns current user', async () => {
    const result = await f('/api/me')
    expect(result).toMatchInlineSnapshot(`
      {
        "name": "Alice",
      }
    `)
  })

  test('protected page renders for authed user', async () => {
    const res = await f('/dashboard')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
    expect(await res.text()).toContain('Dashboard')
  })
})
```

### Database cleanup

`test.deleteUser(id)` deletes the user row from the database. If your schema has **cascade deletes** on foreign keys, this automatically removes all related rows (sessions, accounts, posts, etc.).

```ts
// Drizzle schema example with cascade deletes
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // ...
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  // ...
})

export const post = pgTable('post', {
  id: text('id').primaryKey(),
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  // ...
})
```

With this schema, `deleteUser(user.id)` is the only cleanup call you need. No orphaned sessions or dangling references.

Use unique emails per test (e.g. `test-${Date.now()}@example.com`) so tests can run in parallel without colliding. Set `fileParallelism: false` in your vitest config if tests share mutable state beyond the database.

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
