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

When your app uses [better-auth](https://better-auth.com) for authentication, set the database path via an **environment variable** so tests run against an in-memory SQLite database (`AUTH_DB=:memory:` in vitest config). The `bearer()` plugin enables `Authorization: Bearer <token>` headers, and `emailAndPassword` lets tests create real users via `auth.api.signUpEmail`. Drizzle migrations run in a setup file before tests start.

The [example-better-auth test file](https://github.com/remorses/spiceflow/blob/main/example-better-auth/src/main.test.ts) is a complete working example. It covers:

- `describe('public routes')` — pages that render without auth
- `describe('protected routes')` — sign up a user in `beforeAll`, set `.headers` on the fetch client, verify pages and APIs
- `describe('unauthenticated access')` — verify middleware blocks access and redirects to login
- `describe('multiple users')` — create two users with separate fetch clients, verify data isolation
- `describe('server actions with auth')` — call actions with `runAction` + authed request, verify mutations and redirects
- `describe('Org workflow')` — full multi-step journey: create user → create org → redirect to dashboard → verify empty state → create project → verify dashboard shows it → delete project → verify empty again. Also tests cross-user access denial.

Key techniques:

- **`createSpiceflowFetch(app, { headers })`** with a Bearer token to simulate an authenticated user
- **Mutable `.headers` field** set in `beforeAll` after user creation for describe-scoped auth
- **`runAction` with a custom request** to pass auth tokens to server actions that call `getActionRequest()`
- **Catching redirect responses** with `.catch((e) => e)` then asserting on `status` and `location` header
- **`res.loaderData`** to verify the loader returned correct data from the real database
- **`res.page`** for inline JSX snapshots; **`res.text()`** for full HTML assertions

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

Use `createTestTracer()` to capture spans during `app.handle()` and snapshot the trace tree. The tracer records every span created by spiceflow's instrumentation and renders them as an ASCII tree via `.text()`.

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

`tracer.text()` renders the span tree as ASCII with status codes on the root span. `tracer.spans` gives raw access to span objects. `tracer.clear()` resets between tests.


## Formatting HTML for Snapshots

Raw HTML from `res.text()` is a single long string with all attributes. For readable inline snapshots, use **posthtml** to strip noisy attributes and **posthtml-beautify** to indent the output.

```bash
pnpm add -D posthtml posthtml-beautify
```

### Strip attributes and format

```ts
import { test, expect } from 'vitest'
import posthtml from 'posthtml'
import beautify from 'posthtml-beautify'
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

/** posthtml plugin that removes specified attributes from all nodes */
function removeAttrs(attrs: string[]) {
  return (tree: any) => {
    tree.walk((node: any) => {
      if (node.attrs) {
        for (const attr of attrs) delete node.attrs[attr]
      }
      return node
    })
    return tree
  }
}

test('page structure without styling noise', async () => {
  const res = await f('/dashboard')
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')

  const html = await res.text()
  const { html: clean } = await posthtml([
    removeAttrs(['class', 'style']),
    beautify({ rules: { blankLines: '' } }),
  ]).process(html)

  expect(clean).toMatchInlineSnapshot(`
    "<html lang="en">
      <head></head>
      <body>
        <div>
          <h1>Dashboard</h1>
          <p>No projects yet</p>
        </div>
      </body>
    </html>
    "
  `)
})
```

The `blankLines: ''` option removes empty lines between sibling elements that `posthtml-beautify` adds by default.

### Find elements with tree.match

Use `tree.match()` to locate specific elements by tag or attributes, then assert on their properties.

```ts
test('button has correct attributes and text', async () => {
  const res = await f('/settings')
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')

  const html = await res.text()
  const buttons: { tag: string; attrs: any; text: string; childCount: number }[] = []

  await posthtml()
    .use((tree) => {
      tree.match({ tag: 'button' }, (node) => {
        const text = (node.content || [])
          .filter((c): c is string => typeof c === 'string')
          .join('')
        buttons.push({
          tag: node.tag!,
          attrs: node.attrs || {},
          text,
          childCount: (node.content || []).length,
        })
        return node
      })
      return tree
    })
    .process(html)

  expect(buttons).toMatchInlineSnapshot(`
    [
      {
        "attrs": {
          "class": "btn-primary",
          "type": "submit",
        },
        "childCount": 1,
        "tag": "button",
        "text": "Save",
      },
    ]
  `)
})
```

`tree.match()` accepts matcher objects: `{ tag: 'div' }`, `{ attrs: { id: 'main' } }`, or both combined. It walks the full tree recursively.

## Testing on Cloudflare Workers

Run tests **inside the real workerd runtime** with [`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/). This gives you access to `cloudflare:workers` APIs (`env`, `waitUntil`, D1, KV, etc.) in your test files — the same environment as production.

See the complete working example: [example-vitest-cloudflare](https://github.com/remorses/spiceflow/tree/main/example-vitest-cloudflare)

### Setup

Install the pool workers package alongside the Cloudflare Vite plugin:

```bash
pnpm add -D @cloudflare/vitest-pool-workers @cloudflare/vite-plugin wrangler
```

Configure `vite.config.ts` to swap between `cloudflareTest()` (vitest) and `cloudflare()` (dev/build) based on the `VITEST` env variable. Pass your `wrangler.jsonc` path and any extra miniflare bindings (like D1 migration data).

```ts
// vite.config.ts
import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import spiceflow from 'spiceflow/vite'
import { defineConfig } from 'vite'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations')).catch(() => [])

  return {
    plugins: [
      process.env.VITEST
        ? cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
          })
        : cloudflare({
            viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
          }),
      spiceflow({ entry: './src/main.tsx' }),
    ],
    test: {
      setupFiles: ['./src/apply-migrations.ts'],
    },
  }
})
```

### Applying D1 Migrations

Create a setup file that applies migrations before tests run. `applyD1Migrations()` is idempotent — safe to call multiple times.

```ts
// src/apply-migrations.ts
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

### Writing Tests

Import `env` and other Workers APIs directly from `cloudflare:workers`. Use the same `createSpiceflowFetch` pattern for pages and API routes.

```ts
import { describe, test, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:workers'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

test('GET / renders home page', async () => {
  const res = await f('/')
  if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
  expect(await res.text()).toContain('Home')
})

test('D1: insert and query a user', async () => {
  await env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Alice').run()
  const row = await env.DB.prepare('SELECT * FROM users WHERE name = ?').bind('Alice').first()
  expect(row).toMatchObject({ name: 'Alice' })
})
```

The `env` binding from `cloudflare:workers` is the same object declared in your `wrangler.jsonc`. D1, KV, R2, and other bindings are all available. Per-test file storage isolation resets D1 data between test files automatically.

## What's Not Supported

Vitest mode bypasses RSC Flight serialization. Some features require the full RSC environment and should be tested with e2e tests (Playwright).

- **Error boundaries**: errors in page handlers return a 500 JSON response. The error boundary fallback UI is not rendered. Use e2e tests for error boundary behavior.
- **Server actions via form POST**: the RSC action protocol (decoding form data into server function calls) is not available. Test action logic by calling functions directly instead.
- **Client-side navigation**: there's no browser, so `router.push()`, hydration, and client-side transitions can't be tested. Use e2e tests for navigation flows.
