---
$schema: https://holocron.so/frontmatter.json
title: Routing, validation, middleware, and streaming
sidebarTitle: API
description: Define Spiceflow routes with Zod validation, typed errors, middleware, static files, CORS, SSE streaming, and Node or Cloudflare adapters.
icon: "lucide:route"
prompt: |
  Write the API guide from @/spiceflow/src/spiceflow.tsx, @/spiceflow/src/cors.ts,
  @/spiceflow/src/static.ts, @/spiceflow/src/_node-server.ts, @/spiceflow/src/wait-until.ts,
  and @/example-nodejs/. Cover routing, Zod validation, json(), middleware, static files,
  CORS, streaming/SSE, error handling, listen(), waitUntil, Node adapters, Next.js mounting,
  base path, and class instances.
---

# Routing, validation, middleware, and streaming

Spiceflow routes are defined by **chaining** `.get()`, `.post()`, and `.route()` calls on a single app expression. `.route()` accepts Zod schemas for `request`, `response`, `query`, and `params`, giving you runtime validation and full type inference in one place.

## Route Chaining

To preserve full type safety on the fetch client, routes must be chained in a single expression. Declaring the app separately and adding routes later loses the inferred types.

<details>
<summary>Why chaining matters</summary>

When you declare routes separately, TypeScript can't infer the combined route types across multiple statements. The fetch client needs the full chain to infer path params, query params, body types, and response types.

```ts
// This is an example of what NOT to do when using Spiceflow

import { Spiceflow } from 'spiceflow'

// DO NOT declare the app separately and add routes later
export const app = new Spiceflow()

// Do NOT do this! Defining routes separately will lose type safety
app.get('/hello', () => {
  return 'Hello, World!'
})
// Do NOT do this! Adding routes separately like this will lose type safety
app.post('/echo', async ({ request }) => {
  const body = await request.json()
  return body
})
```

</details>

## Returning JSON

Spiceflow automatically serializes objects returned from handlers to JSON. Return plain objects directly — this is the preferred approach because the typed fetch client can infer the response type automatically:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .get('/user', () => {
    // Preferred — return type is inferred by the typed fetch client
    return { id: 1, name: 'John', email: 'john@example.com' }
  })
  .post('/data', async ({ request }) => {
    const body = await request.json()
    return {
      received: body,
      timestamp: new Date().toISOString(),
      processed: true,
    }
  })
```

When you need to return a non-200 status code, use the `json()` helper instead of `Response.json()`. It works the same way at runtime but preserves the data type and status code in the type system — so the fetch client gets full type safety for each status code:

```ts
import { Spiceflow, json } from 'spiceflow'

// Preferred — type-safe, fetch client knows this is a 404 with { message: string }
throw json({ message: 'Not found' }, { status: 404 })

// Avoid — Response.json() erases the type, fetch client sees unknown
throw Response.json({ message: 'Not found' }, { status: 404 })
```

## Routes & Validation

Define routes with Zod schemas for automatic request and response validation. Use `.route()` with `request`, `response`, `query`, and `params` schemas for full type safety.

### Request Validation

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().route({
  method: 'POST',
  path: '/users',
  request: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  async handler({ request }) {
    const body = await request.json() // here body has type { name: string, email: string }
    return `Created user: ${body.name}`
  },
})
```

<details>
<summary>How body parsing works</summary>

To get the body of the request, call `request.json()` to parse the body as JSON. Spiceflow does not parse the body automatically — there is no `body` field in the route argument. Instead you call either `request.json()` or `request.formData()` to get the body and validate it at the same time. The returned data will have the correct schema type instead of `any`.

The `request` object in every handler and middleware is a `SpiceflowRequest`, which extends the standard Web `Request`. On top of the standard API, it adds:

- **`request.parsedUrl`** — a lazily cached `URL` object, so you don't need to write `new URL(request.url)` yourself. Accessing `.pathname`, `.searchParams`, etc. is one property access away
- **`request.json()` / `request.formData()`** — parse and validate the body against the route schema in one step, returning typed data instead of `any`
- **`request.originalUrl`** — the raw transport URL before Spiceflow normalizes `.rsc` pathnames

</details>

### Response Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().route({
  method: 'GET',
  path: '/users/:id',
  request: z.object({
    name: z.string(),
  }),
  response: z.object({
    id: z.number(),
    name: z.string(),
  }),
  async handler({ request, params }) {
    const typedJson = await request.json() // this body will have the correct type
    return { id: Number(params.id), name: typedJson.name }
  },
})
```

### Typed Error Responses

When a route declares a status-code response map, use the `json()` helper from `spiceflow` to return or throw non-200 responses with full type safety. Unlike `Response.json()`, `json()` carries the data type and status code through the type system — so TypeScript validates that the status code exists in the response schema and the body matches the declared shape.

```ts
import { Spiceflow, json } from 'spiceflow'
import { z } from 'zod'

new Spiceflow().route({
  method: 'GET',
  path: '/users/:id',
  response: {
    200: z.object({ id: z.string(), name: z.string() }),
    404: z.object({ message: z.string() }),
  },
  handler({ params }) {
    const user = findUser(params.id)
    if (!user) {
      // TypeScript validates: 404 is in the response map, and { message: string } matches the 404 schema
      throw json({ message: 'not found' }, { status: 404 })
    }
    return { id: user.id, name: user.name }
  },
})
```

Name the human-readable field **`message`**, never `error`. `SpiceflowFetchError` builds its `.message` from that key, so callers read `err.message` like on any other `Error`. With any other key (`error`, `detail`, `title`) the client falls back to `JSON.stringify(body)` and `err.message` becomes a raw blob like `{"error":"Not found"}`. Machine-readable data goes in **sibling fields** such as `code` or `retryAfter`.

User-facing error messages should include **how to fix** the problem, not only what went wrong. Agents and CLIs that hit the error can then self-correct. If the user is logged out, include the login URL or CLI command:

```ts
if (!session) {
  throw json(
    {
      message:
        'Not logged in. Sign in at https://app.example.com/login or run: mycli login',
    },
    { status: 401 },
  )
}
```

This applies to HTTP responses, thrown server-action errors, and any message a user or agent will read. Internal errors can stay technical.

If you pass a status code that's not in the response map, or a body that doesn't match the schema for that status, `tsc` reports an error:

```ts
// @ts-expect-error — 500 is not in the response schema
throw json({ message: 'server error' }, { status: 500 })

// @ts-expect-error — number doesn't match { message: string } for 404
throw json(42, { status: 404 })
```

The fetch client picks up these types automatically — each non-200 status becomes a typed `SpiceflowFetchError` with the exact body shape. See [Preserving Client Type Safety](./openapi.md#preserving-client-type-safety) for the full client-side pattern.

## Not Found Handler

For API routes (`.route()`, `.get()`, etc.), use `/*` as a catch-all to handle unmatched requests. For React pages, use `children === null` in a layout instead (see [Redirects and Not Found](./react.md#redirects-and-not-found)). More specific routes always take precedence regardless of registration order:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users',
    handler() {
      return { users: [] }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  // Catch-all for unmatched GET requests
  .route({
    method: 'GET',
    path: '/*',
    handler() {
      return new Response('Page not found', { status: 404 })
    },
  })
  // Or use .all() to catch any method
  .route({
    method: '*',
    path: '/*',
    handler({ request }) {
      return new Response(`Cannot ${request.method} ${request.parsedUrl.pathname}`, {
        status: 404,
      })
    },
  })

// Specific routes work as expected
// GET /users returns { users: [] }
// GET /users/123 returns { id: '123' }
// GET /unknown returns 'Page not found' with 404 status
```

> [!IMPORTANT]
> Do **not** use named wildcards like `*filePath`. Only bare `*` is supported. Named wildcards silently fail to match any request. Access the wildcard value via `params['*']` instead.

## Mounting Sub-Apps

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const mainApp = new Spiceflow()
  .route({
    method: 'POST',
    path: '/users',
    async handler({ request }) {
      return `Created user: ${(await request.json()).name}`
    },
    request: z.object({
      name: z.string(),
    }),
  })
  .use(
    new Spiceflow().route({
      method: 'GET',
      path: '/',
      handler() {
        return 'Users list'
      },
    }),
  )
```

## Base Path

For standalone API servers (without Vite), set the base path in the constructor:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow({ basePath: '/api/v1' })
app.route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello'
  },
}) // Accessible at /api/v1/hello
```

### Vite Base Path

When using Spiceflow as a full-stack RSC framework with Vite, configure the base path via Vite's `base` option instead of the constructor:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  base: '/my-app',
  plugins: [react(), spiceflow({ entry: 'src/main.tsx' })],
})
```

<details>
<summary>Base path rules</summary>

The base path must be an absolute path starting with `/`. CDN URLs and relative paths are not supported.

Do not set `basePath` in the Spiceflow constructor when using Vite — Spiceflow will throw an error if both are set. The Vite `base` option is the single source of truth.

</details>

<details>
<summary>What gets auto-prepended and what doesn't</summary>

**What gets the base path auto-prepended:**

- `Link` component `href` — `<Link href="/dashboard" />` automatically renders as `<a href="/my-app/dashboard">`. If the href already includes the base prefix, it is not added again (`<Link href="/my-app/dashboard" />` stays as-is). To disable auto-prepending entirely, use the `rawHref` prop: `<Link rawHref href="/docs/docs" />` — useful when your path legitimately starts with the same string as the base
- `redirect()` Location header — `redirect("/login")` sends `Location: /my-app/login`
- `router.push()` and `router.replace()` — `router.push("/settings")` navigates to `/my-app/settings`
- `router.pathname` — returns the path **without** the base prefix (e.g. `/dashboard`, not `/my-app/dashboard`)
- Static asset URLs (`<script>`, `<link>` CSS tags) — handled automatically by Vite
- `serveStatic` file resolution — strips the base prefix before looking up files on disk

**What does NOT get auto-prepended:**

- Raw `<a href="/path">` tags (not using the `Link` component) — use `Link` instead
- External URLs and protocol-relative URLs (`//cdn.com/...`) — left as-is
- `fetch()` calls inside your app code — you need to construct the URL yourself
- `request.url` and `request.parsedUrl` in middleware — contain the full URL including the base prefix

</details>

## Route Discovery

Use `app.getRoutes()` to inspect routes registered on the app and its mounted sub-apps. Each item contains only `path`, `method`, and `kind`. Pages appear once with the `GET` method. Dynamic parameters stay in the path pattern, so you can filter them or replace them with values from your database:

```ts
const staticPagePaths = app
  .getRoutes()
  .filter((route) => route.kind === 'page')
  .filter((route) => !route.path.includes(':') && !route.path.includes('*'))
  .map((route) => route.path)
```

This makes build-time routes such as `sitemap.xml` and `llms.txt` small. Define the pages first so their route metadata is available to the static route handler:

```tsx
import { Spiceflow } from 'spiceflow'
import llmsText from './llms.md?raw'

const origin = 'https://example.com'

const site = new Spiceflow()
  .page('/', async () => <h1>Home</h1>)
  .page('/about', async () => <h1>About</h1>)
  .page('/posts/:slug', async ({ params }) => <h1>{params.slug}</h1>)

export const app = site
  .staticGet('/sitemap.xml', () => {
    const paths = site
      .getRoutes()
      .filter((route) => route.kind === 'page')
      .filter((route) => !route.path.includes(':') && !route.path.includes('*'))
      .map((route) => route.path)
    const urls = paths
      .map((path) => `  <url><loc>${new URL(path, origin).href}</loc></url>`)
      .join('\n')
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>',
    ].join('\n')

    return new Response(xml, {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    })
  })
  .staticGet('/llms.txt', () => {
    return new Response(llmsText, {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    })
  })
```

Resolve dynamic paths such as `/posts/:slug` yourself before adding them to the sitemap. `app.href('/posts/:slug', { slug })` can replace the parameters after you load the values.

## Middleware

Middleware functions run before route handlers. They can log, authenticate, modify responses, or short-circuit the request entirely.

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().use(({ request }) => {
  console.log(`Received ${request.method} request to ${request.parsedUrl.pathname}`)
})
```

### Mounted Apps

Middleware is scoped to the app where you register it. **Parent app middleware runs for child sub-app routes too**, but **sub-app middleware does not run for parent or sibling routes**.

```ts
import { Spiceflow } from 'spiceflow'

const admin = new Spiceflow({ basePath: '/admin' })
  .use(() => {
    console.log('admin only')
  })
  .get('/users', () => 'users')

new Spiceflow()
  .use(() => {
    console.log('root')
  })
  .use(admin)
  .get('/health', () => 'ok')

// GET /admin/users -> runs "root" and "admin only"
// GET /health      -> runs only "root"
```

If you want a mounted app's middleware to run for **every** request, create that mounted app with `scoped: false`:

```ts
const globalMiddleware = new Spiceflow({ scoped: false }).use(({ request }) => {
  console.log(request.parsedUrl.pathname)
})

new Spiceflow().use(globalMiddleware)
```

### Response Modification

Call `next()` to get the response from downstream handlers, then modify it before sending:

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .use(async ({ request }, next) => {
    const response = await next()
    if (response) {
      // Add a custom header to all responses
      response.headers.set('X-Powered-By', 'Spiceflow')
    }
    return response
  })
  .route({
    method: 'GET',
    path: '/example',
    handler() {
      return { message: 'Hello, World!' }
    },
  })
```

### Static Files

Use `serveStatic()` to serve files from a directory:

```ts
import { Spiceflow, serveStatic } from 'spiceflow'

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .route({
    method: 'GET',
    path: '/health',
    handler() {
      return { ok: true }
    },
  })
  .route({
    method: 'GET',
    path: '/*',
    handler() {
      return new Response('Not Found', { status: 404 })
    },
  })
```

Static middleware only serves `GET` and `HEAD` requests. It checks the exact file path first, and if the request points to a directory it tries `index.html` inside that directory.

<details>
<summary>Priority rules</summary>

- Concrete routes win over static files. A route like `/health` is handled by the route even if `public/health` exists.
- Static files win over root catch-all routes like `/*` and `*`.
- If static does not find a file, the request falls through to the next matching route.
- When multiple static middlewares are registered, they are checked in registration order. The first middleware that finds a file wins.

Example behavior:

```text
request /logo.png
  -> router matches `/*`
  -> static checks `public/logo.png`
  -> if file exists, static serves it
  -> otherwise the `/*` route runs
```

Directory requests without an `index.html` fall through instead of throwing filesystem errors like `EISDIR`.

</details>

You can stack multiple static roots:

```ts
export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .use(serveStatic({ root: './uploads' }))
```

In this example, `./public/logo.png` wins over `./uploads/logo.png` because `./public` is registered first.

> Vite client build assets (`dist/client`) are served automatically in production — no need to register a `serveStatic` middleware for them.

### Static Routes (Pre-rendered)

Use `.staticGet()` to define API routes that are **pre-rendered at build time** and served as static files. The handler runs once during `vite build`, and the response body is written to `dist/client/` so it can be served directly without hitting the server at runtime:

```ts
export const app = new Spiceflow()
  .staticGet('/api/manifest.json', () => ({
    name: 'my-app',
    version: '1.0.0',
    features: ['rsc', 'streaming'],
  }))
  .staticGet('/robots.txt', () =>
    new Response('User-agent: *\nAllow: /', {
      headers: { 'content-type': 'text/plain' },
    }),
  )
```

In development, `staticGet` routes behave like normal `.get()` handlers — the handler runs on every request. At build time, Spiceflow calls each handler and writes the output to disk. The route path should include a file extension (`.json`, `.xml`, `.txt`) so the static file server can detect the correct MIME type.

For authorization, proxy, non-blocking auth, cookies, and graceful shutdown patterns, see [Middleware Patterns](./middleware-patterns.md).

## Adding CORS Headers

```ts
import { cors } from 'spiceflow/cors'
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().use(cors()).route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello, World!'
  },
})
```

## Error Handling

When a route handler or middleware throws an error, Spiceflow catches it and returns a JSON response with the error message and stack trace. **By default, unhandled errors are also logged to the console** with `Spiceflow unhandled error:` so you can see what went wrong during development.

Use `.onError()` to customize error handling. Registering an `.onError` callback **replaces the default logging**, so errors are only handled by your callback:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .get('/users/:id', async ({ params }) => {
    const user = await findUser(params.id)
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 })
    return user
  })
  .onError(({ error, path }) => {
    // Custom error handling replaces default console.error logging
    console.error(`Error on ${path}:`, error.message)
    return new Response('Something went wrong', { status: 500 })
  })
```

If you return a `Response` from `.onError`, it becomes the response for that request. If you don't return anything, Spiceflow falls back to its default JSON error response (but skips the default logging since you have a handler registered).

To silence error logs entirely (useful in tests), register a no-op handler:

```ts
const app = new Spiceflow()
  .get('/test', () => { throw new Error('expected') })
  .onError(() => {})
```

Errors with a `status` property (or `statusCode`) are used as the HTTP status code. Invalid or out-of-range status codes are normalized to 500:

```ts
// Returns 400 Bad Request
throw Object.assign(new Error('Invalid input'), { status: 400 })
```

## Async Generators (Streaming)

Route handlers that are **async generators** automatically produce a Server-Sent Events response. Each `yield` sends a `data: ...\n\n` chunk to the client. Works with `.get()`, `.post()`, and `.route()`.

```ts
// server.ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'GET',
  path: '/api/progress',
  async *handler() {
    yield { status: 'generating', progress: 0.5 }
    await someWork()
    yield { status: 'done', progress: 1.0 }
  },
})

export type App = typeof app
```

The typed fetch client detects async generator routes and returns an `AsyncGenerator` instead of a plain object. TypeScript infers the yield type automatically via `ReplaceGeneratorWithAsyncGenerator` in the type system.

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'

const safeFetch = createSpiceflowFetch('http://localhost:3000')

const stream = await safeFetch('/api/progress')
if (stream instanceof Error) throw stream

// stream is AsyncGenerator<{ status: string, progress: number }>
for await (const event of stream) {
  console.log(event.status, event.progress)
}
```

#### Aborting a Stream

Pass an `AbortController` signal to cancel the stream. The server stops the generator and cleans up.

```ts
const controller = new AbortController()

// abort after 5 seconds
setTimeout(() => controller.abort(), 5000)

const stream = await safeFetch('/api/progress', {
  signal: controller.signal,
})
if (stream instanceof Error) throw stream

for await (const event of stream) {
  console.log(event)
}
// loop exits cleanly on abort, no error thrown
```

With **curl**, use `-N` to disable buffering and stream events line by line:

```bash
curl -N http://localhost:3000/api/progress
```

## Server Lifecycle

`listen()` returns an object with `port`, `server`, and `stop()` for programmatic control:

```ts
const listener = await app.listen(3000)

console.log(`Listening on port ${listener.port}`)

await listener.stop()
```

> In Vite dev and during prerender, Spiceflow skips starting a real server. `listen()` still returns an object, but `port` and `server` are `undefined` and `stop()` is a noop, so cleanup code can stay unconditional.

## Graceful Shutdown

The `preventProcessExitIfBusy` middleware prevents platforms like Fly.io from killing your app while processing long requests. See [Middleware Patterns](./middleware-patterns.md#graceful-shutdown) for usage.

## Background Tasks (`waitUntil`)

All background promises (fire-and-forget work like analytics, logging, cache writes) **must** use `waitUntil` from the handler context. Never do `void somePromise()` or `somePromise().catch(...)` directly; the runtime may kill the process before the promise settles.

```ts
export const app = new Spiceflow().route({
  method: 'POST',
  path: '/process',
  async handler({ request, waitUntil }) {
    const data = await request.json()

    waitUntil(
      fetch('https://analytics.example.com/track', {
        method: 'POST',
        body: JSON.stringify({ event: 'processed', data }),
      }),
    )

    return { success: true }
  },
})
```

On Cloudflare Workers, `waitUntil` automatically delegates to the Workers `ExecutionContext.waitUntil`. On Node.js it is a no-op by default; pass a custom implementation via `new Spiceflow({ waitUntil: (p) => { ... } })` if you need background work to be tracked. See [Cloudflare docs](./cloudflare.md#background-tasks-waituntil) for full examples including Cloudflare integration and custom implementations.

## Node.js Handlers

In user-facing code, you should almost never convert a Node.js `req`/`res` pair into a standard `Request` yourself. Spiceflow already exposes the right adapter for each situation, so this conversion should stay inside Spiceflow rather than in app code.

<details>
<summary>Which adapter to use</summary>

- If you want to run your app on a port in Node.js or Bun, use `app.listen(3000)`. Spiceflow sets up the server adapter for you. Cloudflare Workers are the main exception because there is no port-based server to listen on there.
- If you need to plug a Spiceflow app into a classic Node.js handler API that gives you `req` and `res` (for example a Next.js pages API route), use `app.handleForNode(req, res)`.
- If you are already inside a modern WHATWG-style handler that gives you a standard `Request`, just delegate with `return app.handle(request)`.

If you find yourself writing manual request-conversion glue in app code, that is usually a sign that you should use one of these Spiceflow entrypoints instead.

</details>

```ts
import { Spiceflow } from 'spiceflow'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const app = new Spiceflow().get('/hello', () => {
  return { hello: 'world' }
})

// Run directly on Node.js or Bun
app.listen(3000)

// Use inside a classic Node.js req/res handler
export async function nodeHandler(req: IncomingMessage, res: ServerResponse) {
  await app.handleForNode(req, res)
}

// Use inside a standard Request handler
export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

## Next.js Integration

```ts
// pages/api/[...path].ts
import { getJwt } from '@app/utils/ssr' // exasmple session function
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // IMPORTANT! nothing should be run before calling handleForNode that could read the request body!
  await mcpAuthApp.handleForNode(req, res)
}

export const config = {
  api: {
    bodyParser: false,
  },
}
```

## Class Instances

If you need to store a Spiceflow router as a property in a class instance, use the `AnySpiceflow` type.

<details>
<summary>Avoid <code>this</code> in route handlers</summary>

Do not use `this` inside route handlers to reference the parent class. The `this` context inside handlers always refers to the Spiceflow instance, not your class instance. Instead, capture the parent class reference in a variable outside the handlers.

</details>

```ts
import { Spiceflow, AnySpiceflow } from 'spiceflow'

export class ChatDurableObject {
  private router: AnySpiceflow
  private state: DurableObjectState

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    const self = this // Capture parent class reference - IMPORTANT!

    this.router = new Spiceflow()
      .route({
        method: 'GET',
        path: '/messages',
        async handler() {
          // Use 'self' instead of 'this' to access parent class
          // this.state would NOT work here - 'this' refers to Spiceflow instance
          const messages = (await self.state.storage.get('messages')) || []
          return { messages }
        },
      })
      .route({
        method: 'POST',
        path: '/messages',
        async handler({ request }) {
          const { message } = await request.json()
          // Use 'self' to access parent class properties
          const messages = (await self.state.storage.get('messages')) || []
          messages.push({ id: Date.now(), text: message })
          await self.state.storage.put('messages', messages)
          return { success: true }
        },
      })
  }

  fetch(request: Request) {
    return this.router.handle(request)
  }
}
```
