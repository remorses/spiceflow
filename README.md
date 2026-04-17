<div align='center' className='w-full'>
    <br/>
    <br/>
    <br/>
    <h1>spiceflow</h1>
    <p>type safe API and React Server Components framework for Node, Bun, and Cloudflare</p>
    <br/>
    <br/>
</div>

Spiceflow is a type-safe API framework and full-stack React RSC framework focused on absolute simplicity. It works across all JavaScript runtimes: Node.js, Bun, and Cloudflare Workers. Read the source code on [GitHub](https://github.com/remorses/spiceflow).

## Features

- Full-stack React framework with React Server Components (RSC), server actions, layouts, and automatic client code splitting
- Works everywhere: Node.js, Bun, and Cloudflare Workers with the same code
- Type safe schema based validation via Zod
- Type safe fetch client with full inference on path params, query, body, and response
- Simple and intuitive API using web standard Request and Response
- Can easily generate OpenAPI spec based on your routes
- Support for [Model Context Protocol](https://modelcontextprotocol.io/) to easily wire your app with LLMs
- Supports async generators for streaming via server sent events
- Modular design with `.use()` for mounting sub-apps
- Built-in [OpenTelemetry](https://opentelemetry.io/) tracing with zero overhead when disabled

## Installation

```bash
npm install spiceflow@rsc
```

## AI Agents

To let your AI coding agent know how to use spiceflow, run:

```bash
npx -y skills add remorses/spiceflow
```

## Basic Usage

API routes return JSON automatically. React pages use `.page()` and `.layout()` for server-rendered UI with client interactivity:

```tsx
import { Spiceflow } from 'spiceflow'
import { Counter } from './counter'

export const app = new Spiceflow()
  .get('/api/hello', () => {
    return { message: 'Hello, World!' }
  })
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div>
        <h1>Home</h1>
        <Counter />
      </div>
    )
  })
  .page('/about', async () => {
    return <h1>About</h1>
  })

app.listen(3000)
```

<details>
<summary>When to use .route() vs .get()/.post()</summary>

Use `.route()` instead of `.get()`/`.post()` when you want to pass Zod schemas for validation — it accepts `request`, `response`, `query`, and `params` schemas.

</details>

## Two Ways to Use Spiceflow

Spiceflow works as a **standalone API framework** or as a **full-stack React framework** — same router, same type safety, same code.

**API only** — no Vite, no React. Just install `spiceflow` and build type-safe APIs with Zod validation, streaming, OpenAPI, and a type-safe fetch client:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .get('/hello', () => ({ message: 'Hello!' }))

app.listen(3000)
```

**Full-stack React (RSC)** — add the Vite plugin to get server components, client components, layouts, server actions, and automatic code splitting. All API features still work alongside React pages:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [react(), spiceflow({ entry: './src/main.tsx' })],
})
```

## `use client` trap in optimized `node_modules` dependencies

**This section is about published dependencies from `node_modules`, not your app's own `src/` files.**

Your own app code is usually treated as source by Vite, so its module boundaries are normally preserved. This problem shows up when a package from `node_modules` contains both server code and client code, and Vite prebundles that dependency into an optimized server chunk.

If a bug only reproduces when importing a library from `node_modules`, and not when writing similar code directly in your app, this is the failure mode to look for.

When that happens, the `use client` boundary only works if the client file stays a separate module boundary.

**Bad pattern**

- published dependency has a server-safe entry file that imports a client file with a relative import
- Vite dependency optimization flattens both files into one optimized server dependency
- the client module gets evaluated against `react-server`
- startup crashes before the app renders

**Typical symptoms**

- `Class extends value undefined is not a constructor or null`
- `Component` / `useState` / `useEffect` / `prefetchDNS` is `undefined`
- Cloudflare dev crashes during worker startup before any request hits your app

```text
published dependency entry
  └─ imports ./client-widget.tsx   ('use client')
       └─ optimizer flattens package into one server chunk in node_modules/.vite
             └─ client code now runs with react.react-server
                  └─ boom
```

**Safer pattern**

- keep the main package entry server-safe
- expose client code through a package subpath such as `my-lib/client`
- import the client boundary through that package subpath instead of a relative path from the server entry

```ts
// safer than importing ./client-widget directly from the main entry
import { ClientWidget } from 'my-lib/client'
```

This matters most in Vite RSC dev, Cloudflare runner startup, and any environment that eagerly imports the full worker/module graph to inspect exports.

If this only happens for a package from `node_modules` and not for your app's own `src/` files, this is the exact class of issue described here.

### How to debug this

1. **Look at the optimized dep output**
   - inspect `node_modules/.vite/deps_rsc/` and `deps_ssr/`
   - search for the crashing package and check whether client-only code got bundled into a server chunk

2. **Search for client-only React APIs in server chunks**
   - things like `extends ...Component`, `useState`, `useEffect`, `prefetchDNS`, `preconnect`, `Suspense`
   - if they are imported from a `react-server` build, your boundary was lost

3. **Check whether the crash happens at import time**
   - if dev dies before any request, the worker entry or export-inspection path is evaluating the bad module eagerly

4. **Inspect package boundaries**
   - main entry should not statically pull in a client file via `./relative-import`
   - move the client module behind an exported subpath like `pkg/client`

5. **Validate the fix**
   - rebuild the package
   - restart dev so Vite re-optimizes deps
   - confirm the server starts and the bad optimized chunk disappears or no longer contains the client code

Useful search pattern:

```bash
rg -n "extends .*Component|useState|useEffect|prefetchDNS|preconnect|react-server" node_modules/.vite
```

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

// Preferred — type-safe, fetch client knows this is a 404 with { error: string }
throw json({ error: 'Not found' }, { status: 404 })

// Avoid — Response.json() erases the type, fetch client sees unknown
throw Response.json({ error: 'Not found' }, { status: 404 })
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
    404: z.object({ error: z.string() }),
  },
  handler({ params }) {
    const user = findUser(params.id)
    if (!user) {
      // TypeScript validates: 404 is in the response map, and { error: string } matches the 404 schema
      throw json({ error: 'not found' }, { status: 404 })
    }
    return { id: user.id, name: user.name }
  },
})
```

If you pass a status code that's not in the response map, or a body that doesn't match the schema for that status, `tsc` reports an error:

```ts
// @ts-expect-error — 500 is not in the response schema
throw json({ error: 'server error' }, { status: 500 })

// @ts-expect-error — number doesn't match { error: string } for 404
throw json(42, { status: 404 })
```

The fetch client picks up these types automatically — each non-200 status becomes a typed `SpiceflowFetchError` with the exact body shape. See [Preserving Client Type Safety](docs/openapi.md#preserving-client-type-safety) for the full client-side pattern.

## Middleware

Middleware functions run before route handlers. They can log, authenticate, modify responses, or short-circuit the request entirely.

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().use(({ request }) => {
  console.log(`Received ${request.method} request to ${request.parsedUrl.pathname}`)
})
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

For authorization, proxy, non-blocking auth, cookies, and graceful shutdown patterns, see [Middleware Patterns](docs/middleware-patterns.md).

## Error Handling

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().onError(({ error }) => {
  console.error(error)
  return new Response('An error occurred', { status: 500 })
})
```

## Async Generators (Streaming)

Async generators will create a server sent event response.

```ts
// server.ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'GET',
  path: '/sseStream',
  async *handler() {
    yield { message: 'Start' }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield { message: 'Middle' }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield { message: 'End' }
  },
})

export type App = typeof app
```

Server-Sent Events (SSE) format — the server sends events as `data: {"message":"Start"}\n\n` chunks.

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

async function fetchStream() {
  const stream = await safeFetch('/sseStream')
  if (stream instanceof Error) {
    console.error('Error fetching stream:', stream.message)
    return
  }
  for await (const chunk of stream) {
    console.log('Stream chunk:', chunk)
  }
}

fetchStream()
```

## Not Found Handler

For API routes (`.route()`, `.get()`, etc.), use `/*` as a catch-all to handle unmatched requests. For React pages, use `children === null` in a layout instead (see [Redirects and Not Found](#redirects-and-not-found)). More specific routes always take precedence regardless of registration order:

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

## Fetch Client

`createSpiceflowFetch` provides a type-safe `fetch(path, options)` interface for calling your Spiceflow API. It gives you full type safety on **path params**, **query params**, **request body**, and **response data** — all inferred from your route definitions.

Export the app type from your server code:

```ts
// server.ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello, World!'
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    request: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    async handler({ request }) {
      const body = await request.json()
      return { id: '1', name: body.name, email: body.email }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  .route({
    method: 'GET',
    path: '/search',
    query: z.object({ q: z.string(), page: z.coerce.number().optional() }),
    handler({ query }) {
      return { results: [], query: query.q, page: query.page }
    },
  })
  .route({
    method: 'GET',
    path: '/stream',
    async *handler() {
      yield 'Start'
      yield 'Middle'
      yield 'End'
    },
  })

export type App = typeof app
```

Then use the `App` type on the client side without importing server code:

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

// GET request — returns Error | Data, check with instanceof Error
const greeting = await safeFetch('/hello')
if (greeting instanceof Error) return greeting
console.log(greeting) // 'Hello, World!' — TypeScript knows the type

// POST with typed body — TypeScript requires { name: string, email: string }
const user = await safeFetch('/users', {
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' },
})
if (user instanceof Error) return user
console.log(user.id, user.name, user.email) // fully typed

// Path params — type-safe, TypeScript requires { id: string }
const foundUser = await safeFetch('/users/:id', {
  params: { id: '123' },
})
if (foundUser instanceof Error) return foundUser
console.log(foundUser.id) // typed as string

// Query params — typed from the route's Zod schema
const searchResults = await safeFetch('/search', {
  query: { q: 'hello', page: 1 },
})
if (searchResults instanceof Error) return searchResults
console.log(searchResults.results, searchResults.query) // fully typed

// Streaming — async generator routes return an AsyncGenerator
const stream = await safeFetch('/stream')
if (stream instanceof Error) return stream
for await (const chunk of stream) {
  console.log(chunk) // 'Start', 'Middle', 'End'
}
```

The fetch client returns `Error | Data` directly following the [errore](https://errore.org) convention — use `instanceof Error` to check for errors with Go-style early returns, then the happy path continues with the narrowed data type. No `{ data, error }` destructuring, no null checks. On error, the returned `SpiceflowFetchError` has `status`, `value` (the parsed error body), and `response` (the raw Response object) properties.

The fetch client supports configuration options like headers, retries, onRequest/onResponse hooks, and custom fetch.

You can also pass a Spiceflow app instance directly for server-side usage without network requests:

```ts
const safeFetch = createSpiceflowFetch(app)
const greeting = await safeFetch('/hello')
if (greeting instanceof Error) throw greeting
```

For path matching patterns, error handling, server-side fetch, type-safe RPC, and path building (`href` / `createHref`), see [Fetch Client docs](docs/fetch-client.md).

## Cloudflare Bindings

On Cloudflare Workers, the simplest way to read bindings is to import `env` directly from `cloudflare:workers`. Run `wrangler types` after changing `wrangler.jsonc` so Wrangler regenerates `worker-configuration.d.ts` — that gives `env` a type-safe `Env` shape automatically.

```tsx
import { Spiceflow } from 'spiceflow'
import { env } from 'cloudflare:workers'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/kv/:key',
    async handler({ params }) {
      const value = await env.KV.get(params.key)
      return { key: params.key, value }
    },
  })
  .route({
    method: 'POST',
    path: '/queue',
    async handler({ request }) {
      const body = await request.json()
      await env.QUEUE.send(body)
      return { success: true, message: 'Added to queue' }
    },
  })

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

## Cookies

Spiceflow works with standard Request and Response objects, so you can use any cookie library like the `cookie` npm package. See [Middleware Patterns](docs/middleware-patterns.md) for full cookie examples including set/get/clear and cookie-based auth middleware.

## OpenAPI

Spiceflow can generate a full OpenAPI 3.1 document from your routes without any extra configuration. Mount the `openapi` plugin and every route you registered on the app is picked up automatically — the same Zod schemas that validate the request and type the handler context are also the source of `parameters`, `requestBody`, and `responses` in the emitted document.

```ts
import { openapi } from 'spiceflow/openapi'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  .use(openapi({ path: '/openapi.json' }))
  .route({
    method: 'GET',
    path: '/hello',
    query: z.object({
      name: z.string(),
      age: z.number(),
    }),
    response: z.string(),
    handler({ query }) {
      return `Hello, ${query.name}!`
    },
  })
  .route({
    method: 'POST',
    path: '/user',
    request: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    response: z.object({ id: z.string() }),
    async handler({ request }) {
      const body = await request.json()
      return { id: 'usr_' + body.name }
    },
  })

const openapiSchema = await (
  await app.handle(new Request('http://localhost:3000/openapi.json'))
).json()
```

For status-code response maps, centralized error responses with `onError`, shared Zod schemas across routes, hiding internal routes from the document, writing markdown descriptions with `string-dedent`, generating a local `openapi.json` file from a script, and preserving fetch client type safety with thrown error responses, see [OpenAPI docs](docs/openapi.md).

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

## Background Tasks (`waitUntil`)

Spiceflow provides a `waitUntil` function in the handler context for scheduling background tasks in a cross-platform way. It uses Cloudflare Workers' `waitUntil` if present, and is a no-op in Node.js. See [Cloudflare docs](docs/cloudflare.md#background-tasks-waituntil) for full examples including Cloudflare integration and custom implementations.

## Server Lifecycle

`listen()` returns an object with `port`, `server`, and `stop()` for programmatic control:

```ts
const listener = await app.listen(3000)

console.log(`Listening on port ${listener.port}`)

await listener.stop()
```

> In Vite dev and during prerender, Spiceflow skips starting a real server. `listen()` still returns an object, but `port` and `server` are `undefined` and `stop()` is a noop, so cleanup code can stay unconditional.

## Graceful Shutdown

The `preventProcessExitIfBusy` middleware prevents platforms like Fly.io from killing your app while processing long requests. See [Middleware Patterns](docs/middleware-patterns.md#graceful-shutdown) for usage.

## Tracing (OpenTelemetry)

Spiceflow has built-in OpenTelemetry tracing. Pass a `tracer` to the constructor and every request gets automatic spans for middleware, handlers, loaders, layouts, pages, and RSC serialization — no monkey-patching, no plugins. Zero overhead when disabled. See [Tracing docs](docs/tracing.md) for setup, span trees, custom spans, and examples.

## React Framework (RSC)

Spiceflow includes a full-stack React framework built on React Server Components (RSC). It uses Vite with `@vitejs/plugin-rsc` under the hood. Server components run on the server by default, and you use `"use client"` to mark interactive components that need to run in the browser.

### Setup

Install the dependencies and create a Vite config:

```bash
npm install spiceflow@rsc react react-dom
```

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    react(),
    spiceflow({
      entry: './src/main.tsx',
    }),
  ],
})
```

### Cloudflare RSC Setup

For Cloudflare Workers deployment with RSC, see [Cloudflare docs](docs/cloudflare.md). See [`example-cloudflare/`](example-cloudflare) for a complete working example.

### Tailwind CSS

Install `@tailwindcss/vite` and `tailwindcss`, then add the Vite plugin:

```bash
npm install @tailwindcss/vite tailwindcss
```

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    spiceflow({ entry: './src/main.tsx' }),
    react(),
    tailwindcss(),
  ],
})
```

Create a `globals.css` file with Tailwind and any CSS variables you need:

```css
/* src/globals.css */
@import 'tailwindcss';

:root {
  --radius: 0.625rem;
  --background: var(--color-white);
  --foreground: var(--color-neutral-800);
}
```

Import it at the top of your app entry so styles apply globally:

```tsx
// src/main.tsx
import './globals.css'
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <body className="bg-white dark:bg-gray-900 text-black dark:text-white">
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <h1 className="text-4xl font-bold">Welcome</h1>
      </div>
    )
  })
```

### shadcn/ui

Spiceflow works with [shadcn/ui](https://ui.shadcn.com) out of the box. Instead of the usual `tsconfig.json` paths hack (`@/*`), use `package.json` `exports` for component imports — it's a standard Node.js feature that works across runtimes and lets other workspace packages import your components too. See [shadcn docs](docs/shadcn.md) for the full setup guide and [`example-shadcn/`](example-shadcn) for a working example.

### App Entry

The entry file defines your routes using `.page()` for pages and `.layout()` for layouts. This file runs in the RSC environment on the server. All routes registered with `.page()`, `.get()`, etc. are available via `getRouter<App>().href()` for type-safe URL building — including path params and query params.

```tsx
// src/main.tsx
import { Spiceflow, serveStatic } from 'spiceflow'
import { getRouter, Head, Link } from 'spiceflow/react'
import { z } from 'zod'
import { Counter } from './app/counter'
import { Nav } from './app/nav'

export const app = new Spiceflow()
  .use(serveStatic({ root: './public' }))
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <Head>
          <Head.Meta charSet="UTF-8" />
        </Head>
        <body>
          <Nav />
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    const router = getRouter<App>()
    const data = await fetchSomeData()
    return (
      <div>
        <h1>Welcome</h1>
        <p>Server-rendered data: {data.message}</p>
        <Counter />
        <Link href={router.href('/users/:id', { id: '42' })}>View User 42</Link>
        <Link href={router.href('/search', { q: 'spiceflow' })}>Search</Link>
      </div>
    )
  })
  .page('/about', async () => {
    const router = getRouter<App>()
    return (
      <div>
        <h1>About</h1>
        <Link href={router.href('/')}>Back to Home</Link>
      </div>
    )
  })
  .page('/users/:id', async ({ params }) => {
    return (
      <div>
        <h1>User {params.id}</h1>
      </div>
    )
  })
  // Object-style .page() with query schema — enables type-safe query params
  .page({
    path: '/search',
    query: z.object({ q: z.string(), page: z.number().optional() }),
    handler: async ({ query }) => {
      const results = await search(query.q, query.page)
      return (
        <div>
          <h1>Results for "{query.q}"</h1>
          {results.map((r) => (
            <p key={r.id}>{r.title}</p>
          ))}
        </div>
      )
    },
  })
  .listen(3000)

// Export the app type for use in client components
export type App = typeof app
```

`getRouter<App>().href()` gives you **type-safe links** — TypeScript validates that the path exists, params are correct, and query values match the schema. Invalid paths or missing params are caught at compile time. `getRouter<App>()` works in both server and client components.

<details>
<summary>Why not app.href() inside the chain?</summary>

Using `app.href()` inside page/layout handlers in the chain definition causes TypeScript error TS7022 — `app` references itself during construction, creating circular type inference. Use `getRouter<App>()` instead, which resolves the router at request time when `app` is fully constructed. `app.href()` still works in standalone functions defined after the chain, but `getRouter<App>()` is the recommended pattern everywhere.

</details>

### Layouts

Define a root `.layout('/*', ...)` with the document shell (`<html>`, `<head>`, `<body>`). More specific layouts should only return shared parent UI like sidebars, nav, or section chrome — not another `<html>` shell. Wildcard layouts also match their base path, so `/app/*` wraps both `/app` and `/app/settings`.

```tsx
export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <body>{children}</body>
      </html>
    )
  })
  .layout('/app/*', async ({ children }) => {
    return <section className="app-shell">{children}</section>
  })
  .layout('/docs/*', async ({ children }) => {
    return <section className="docs-shell">{children}</section>
  })
  .page('/app', async () => {
    return <h1>App home</h1>
  })
  .page('/app/settings', async () => {
    return <h1>App settings</h1>
  })
  .page('/docs', async () => {
    return <h1>Docs home</h1>
  })
  .page('/docs/getting-started', async () => {
    return <h1>Getting started</h1>
  })
```

<details>
<summary>Nesting rules</summary>

Only the root layout should render the full HTML document shell. If a nested layout also renders `<html>`, the shell repeats and you end up nesting full HTML documents inside each other. Only add scoped layouts when many pages share the same parent components.

</details>

### SEO

Use `<Head>`, `<Head.Title>`, and `<Head.Meta>` from `spiceflow/react` for type-safe, automatically deduplicated head tags that are correctly injected during SSR. Page tags override layout tags with the same key.

Every page should have a `<Head.Title>` and a `<Head.Meta name="description">`. These are the two most important tags for SEO — they control what appears in search engine results.

<details>
<summary>Title and description guidelines</summary>

**Title:** Keep titles under 60 characters so they don't get truncated in search results. Put the most important keywords first. Use a consistent format like `Page Name | Site Name`.

**Description:** Keep descriptions between 120–160 characters. Summarize the page content clearly — this is the snippet shown below the title in search results. Each page should have a unique description that accurately reflects its content.

Always use `<Head>`, `<Head.Title>`, and `<Head.Meta>` from `spiceflow/react` instead of raw `<head>`, `<title>`, and `<meta>` tags. The `Head` components are type-safe, automatically deduplicated (page tags override layout tags with the same key), and correctly injected into the document head during SSR.

</details>

```tsx
.page('/', async () => {
  return (
    <div>
      <Head>
        <Head.Title>Spiceflow – Build Type-Safe APIs</Head.Title>
        <Head.Meta name="description" content="A fast, type-safe API and RSC framework for TypeScript." />
      </Head>
      <h1>Welcome</h1>
    </div>
  )
})
```

If you want a consistent title prefix or suffix across all pages, create a wrapper component:

```tsx
function PageHead({ title, description }: { title: string; description: string }) {
  return (
    <Head>
      <Head.Title>{title} | My App</Head.Title>
      <Head.Meta name="description" content={description} />
    </Head>
  )
}

// Then use it in any page
.page('/about', async () => {
  return (
    <div>
      <PageHead title="About" description="Learn more about our team and mission." />
      <h1>About</h1>
    </div>
  )
})
```

### Query Params

Define a `query` schema on routes and pages that accept query parameters — even when all params are optional. Use the object notation for `.page()` and `.route()` so the query requirements are documented in the route definition and accessible with full type safety in the handler:

```tsx
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  // Object notation gives you typed query access
  .page({
    path: '/products',
    query: z.object({
      category: z.string().optional(),
      sort: z.enum(['price', 'name', 'date']).optional(),
      page: z.coerce.number().optional(),
    }),
    handler: async ({ query }) => {
      // query.category is string | undefined — fully typed
      // query.sort is 'price' | 'name' | 'date' | undefined
      // query.page is number | undefined
      const products = await getProducts(query)
      return (
        <div>
          <h1>Products</h1>
          {products.map((p) => <p key={p.id}>{p.name}</p>)}
        </div>
      )
    },
  })
```

<details>
<summary>Why always define a query schema</summary>

Without a query schema, `query` is `Record<string, string | undefined>` — you lose autocomplete, typos go unnoticed, and there's no documentation of what the page accepts.

Always define a `query` schema on routes and pages that accept query parameters. Use `href()` to build links to these pages — when a route has a query schema, `href` enforces the correct query keys at compile time. If you rename or remove a query param from the schema, every `href()` call that references it becomes a type error — no stale links.

</details>

**Use `href()` to build links to these pages.** When a route has a query schema, `href` enforces the correct query keys at compile time. If you rename or remove a query param from the schema, every `href()` call that references it becomes a type error — no stale links:

```tsx
'use client'
import { getRouter, Link } from 'spiceflow/react'
import type { App } from '../main'

export function ProductFilters() {
  const router = getRouter<App>()
  return (
    <nav>
      {/* TypeScript validates these query keys against the schema */}
      <Link href={router.href('/products', { category: 'shoes', sort: 'price' })}>
        Shoes by Price
      </Link>
      <Link href={router.href('/products', { sort: 'date', page: 2 })}>
        Page 2, newest first
      </Link>

      {/* @ts-expect-error — 'color' is not in the query schema */}
      <Link href={router.href('/products', { color: 'red' })}>Red</Link>
    </nav>
  )
}
```

The same pattern works for API routes with `.route()`. Query params are automatically coerced from strings to match the schema type — you don't need `z.coerce.number()`, just use `z.number()` directly:

```tsx
export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/api/search',
    query: z.object({
      q: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    handler({ query }) {
      // query.q is string, query.limit is number | undefined
      return searchDatabase(query.q, query.limit, query.offset)
    },
  })
```

**Array query params** use repeated keys in the URL: `?tag=a&tag=b` (not comma-separated). Single values are automatically wrapped into arrays when the schema expects `z.array()`:

```tsx
// URL: /api/posts?tag=react or /api/posts?tag=react&tag=typescript
export const app = new Spiceflow().route({
  method: 'GET',
  path: '/api/posts',
  query: z.object({
    tag: z.array(z.string()),
    limit: z.number().optional(),
  }),
  handler({ query }) {
    // query.tag is always string[], even with a single ?tag=react
    // query.limit is number | undefined, coerced from the string automatically
    return getPostsByTags(query.tag)
  },
})
```

### Client Components

Mark interactive components with `"use client"` at the top of the file. These are hydrated in the browser and can use hooks like `useState`.

```tsx
// src/app/counter.tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```

### Loaders

Loaders run on the server before page and layout handlers. They solve a common problem: when you need the same data in both server components and client components, or in both a layout and a page, without prop drilling or React context.

Loaders only run for requests that also match a `.page()` or `.layout()`. They are not standalone endpoints. If you want to serve content without rendering a page or layout, use `.get()`, `.route()`, or another API handler instead.

```tsx
export const app = new Spiceflow()
  // Auth loader for all routes — wildcard pattern matches everything
  .loader('/*', async ({ request }) => {
    const user = await getUser(request.headers.get('cookie'))
    if (!user) throw redirect('/login')
    return { user }
  })
  // Page-specific loader
  .loader('/dashboard', async () => {
    const stats = await getStats()
    return { stats }
  })
  .layout('/*', async ({ loaderData, children }) => {
    // loaderData.user is available here from the wildcard loader
    return (
      <html>
        <body>
          <nav>{loaderData.user.name}</nav>
          {children}
        </body>
      </html>
    )
  })
  .page('/dashboard', async ({ loaderData }) => {
    // Both loaders matched — data is merged by specificity
    // loaderData = { user: ..., stats: ... }
    return <Dashboard user={loaderData.user} stats={loaderData.stats} />
  })
```

When multiple loaders match a route (e.g. `/*` and `/dashboard` both match `/dashboard`), their return values are merged into a single flat object. More specific loaders override less specific ones on key conflicts.

**Serialization**: loader return values are serialized through the React RSC flight format, not JSON. You can return JSX (including server components and client component elements with their props), `Promise`, async iterators, `Map`, `Set`, `Date`, `BigInt`, typed arrays, and any client component reference — all deserialized faithfully on the client. This means a loader can return a fully rendered `<Sidebar user={user} />` element and another component can receive it as `loaderData.sidebar` and drop it into the tree.

**Reading loader data in client components** uses the `useLoaderData` hook from `spiceflow/react`:

```tsx
// src/app/sidebar.tsx
'use client'

import { useLoaderData } from 'spiceflow/react'
import type { App } from '../main'

export function Sidebar() {
  // Type-safe: path narrows the return type to the loaders matching '/dashboard'
  const { user, stats } = useLoaderData<App>('/dashboard')
  return (
    <aside>
      {user.name} — {stats.totalViews} views
    </aside>
  )
}
```

Loader data updates automatically on client-side navigation — when the user navigates to a new route, the server re-runs the matching loaders and the new data arrives atomically with the new page content via the RSC flight stream.

**Reading loader data imperatively** uses `getRouter<App>()`. This works in client code outside React components and during active server render. Call it inside component scope, event handlers, or helper functions tied to the current render flow instead of binding request-sensitive access at module scope:

```tsx
// src/app/editor-toolbar.tsx
'use client'

import { getRouter, useLoaderData } from 'spiceflow/react'
import type { App } from '../main'

async function readCurrentDocument() {
  return getRouter<App>().getLoaderData('/editor/:id')
}

export function EditorToolbar() {
  const router = getRouter<App>()
  const { document } = useLoaderData<App>('/editor/:id')

  async function refresh() {
    const next = await readCurrentDocument()
    console.log(next.document.title)
  }

  return <button onClick={refresh}>{document.title}</button>
}
```

**Error handling**: if a loader throws a `redirect()` or `notFound()`, the entire request short-circuits — the page handler never runs. If a loader throws any other error, it renders through the nearest error boundary instead of showing a blank page.

### Parallel Data Fetching

Spiceflow already parallelizes at the framework level — all matched loaders run concurrently, then layouts and the page render concurrently after loaders finish. Within a single handler, use `Promise.all` for independent fetches instead of sequential `await`s:

```tsx
.page('/dashboard', async () => {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getStats(),
  ])
  return <Dashboard user={user} posts={posts} analytics={analytics} />
})
```

### Forms & Server Actions

Forms use React 19's `<form action>` with server functions marked `"use server"`. They work before JavaScript loads (progressive enhancement).

**Every server action call automatically re-renders the current page with fresh server data.** This applies to all server actions — form submissions, client wrapper functions, onClick handlers, and even imported server functions called directly. The re-render happens via React reconciliation, so client component state is preserved. No manual `router.refresh()` needed.

Every submit button should show a loading state while its form action is in progress. Use `useFormStatus` from `react-dom` in your Button component to auto-detect pending forms — the button shows a spinner automatically when it's inside a `<form>` with a pending action:

Prefer file-level `"use server"` (a dedicated file like `src/actions.tsx`) over inline `"use server"` inside function bodies. Inline is fine for simple form actions defined directly in a server component page, but if you find yourself passing actions as props to client components, import them from a `"use server"` file instead — it keeps action logic centralized and reusable. The inline examples below are kept short for readability.

```tsx
// src/app/button.tsx
'use client'
import { useFormStatus } from 'react-dom'

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()
  const loading = props.type === 'submit' && pending
  return (
    <button disabled={loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  )
}
```

Then use it in forms — no manual loading state needed:

```tsx
import { redirect } from 'spiceflow'
import { Button } from './app/button'

.page('/subscribe', async () => {
  async function subscribe(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    await addSubscriber(email)
    throw redirect('/thank-you')
  }
  return (
    <form action={subscribe}>
      <input name="email" type="email" required />
      <Button type="submit">Subscribe</Button>
    </form>
  )
})
```

Use `useActionState` to display return values from the action. The action receives the previous state as its first argument and `FormData` as the second:

```tsx
// src/actions.tsx
'use server'

export async function subscribe(prev: string, formData: FormData) {
  const email = formData.get('email') as string
  await addSubscriber(email)
  return `Subscribed ${email}!`
}
```

```tsx
// src/app/newsletter.tsx
'use client'
import { useActionState } from 'react'
import { Button } from './button'

export function NewsletterForm({
  action,
}: {
  action: (prev: string, formData: FormData) => Promise<string>
}) {
  const [message, formAction] = useActionState(action, '')
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <Button type="submit">Subscribe</Button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

```tsx
// In your server component page
.page('/newsletter', async () => {
  async function subscribe(prev: string, formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    await addSubscriber(email)
    return `Subscribed ${email}!`
  }
  return <NewsletterForm action={subscribe} />
})
```

Server actions called directly (onClick handlers, not forms) also trigger an automatic re-render:

```tsx
// src/actions.ts
'use server'

export async function deletePost(id: string) {
  await db.posts.delete(id)
}
```

```tsx
// src/app/delete-button.tsx
'use client'

import { deletePost } from '../actions'

export function DeleteButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => {
        await deletePost(id)
        // page re-renders automatically — no router.refresh() needed
      }}
    >
      Delete
    </button>
  )
}
```

### Progress Bar

Render `<ProgressBar />` once in the root layout. For manual client-side async work, wrap the call in `ProgressBar.start()` / `ProgressBar.end()`:

```tsx
// src/main.tsx
import { Spiceflow } from 'spiceflow'
import { ProgressBar } from 'spiceflow/react'
import { SaveButton } from './app/save-button'

export const app = new Spiceflow().layout('/*', async ({ children }) => {
  return (
    <html>
      <body>
        <ProgressBar />
        {children}
        <SaveButton />
      </body>
    </html>
  )
})

// src/app/save-button.tsx
'use client'

import { ProgressBar } from 'spiceflow/react'

export function SaveButton() {
  return (
    <button
      onClick={async () => {
        ProgressBar.start()
        try {
          await fetch('/api/save', { method: 'POST' })
        } finally {
          ProgressBar.end()
        }
      }}
    >
      Save
    </button>
  )
}
```

Manual calls share the same state as router navigation, so if a navigation and a client fetch overlap, the bar stays visible until both have finished.

<details>
<summary>React export shape</summary>

Do not mix React component exports with non-React exports like `const`, `Context`, or plain helper functions in the same public module. That can break HMR / Fast Refresh because the module stops behaving like a pure component module.

If a component needs imperative helpers, attach them as static properties on the component instead of exporting separate helpers. For example, prefer `ProgressBar.start()` / `ProgressBar.end()` over standalone `startProgressBar()` or `endProgressBar()` exports.

</details>

If a server action throws, the error is caught by the nearest `ErrorBoundary`. The error message is preserved (sanitized to strip secrets) and displayed to the user in both development and production builds.

### Error Handling

Use `ErrorBoundary` from `spiceflow/react` to catch errors from form actions. It provides `ErrorBoundary.ErrorMessage` and `ErrorBoundary.ResetButton` sub-components that read the error and reset function from context — so they work as standalone elements anywhere in the `fallback` tree.

Actions should **throw errors** instead of returning error strings. Return **objects** for rich success data instead of scalars:

```tsx
// src/actions.ts
'use server'

export async function createPost({ title }: { title: string }) {
  if (!title) throw new Error('Title is required')
  const post = await db.posts.create({ title })
  return { id: post.id }
}
```

```tsx
// src/app/create-post.tsx
'use client'

import { ErrorBoundary } from 'spiceflow/react'
import { createPost } from '../actions'

export function CreatePostForm() {
  return (
    <ErrorBoundary
      fallback={
        <div>
          <ErrorBoundary.ErrorMessage className="text-red-500" />
          <ErrorBoundary.ResetButton>Try again</ErrorBoundary.ResetButton>
        </div>
      }
    >
      <form
        action={async (formData: FormData) => {
          const title = formData.get('title') as string
          await createPost({ title })
        }}
      >
        <input name="title" required />
        <Button type="submit">Create</Button>
      </form>
    </ErrorBoundary>
  )
}
```

`ErrorBoundary.ErrorMessage` renders a `<div>` and `ErrorBoundary.ResetButton` renders a `<button>` — both accept all their respective HTML element props via `...props` spread, so you can pass `className`, `style`, `data-testid`, etc.

When the form action throws, the `ErrorBoundary` catches the error, hides the form, and renders the `fallback` with the error message and a reset button. Clicking "Try again" restores the form. The error boundary also auto-resets when the user navigates to a different page.

For **direct action calls** (onClick handlers, not forms), use try/catch since the error doesn't propagate through React's rendering. Wrap in `startTransition` if you want pending state (`isPending`) and non-blocking behavior while the server data loads:

```tsx
import { useTransition } from 'react'

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await deletePost({ id })
          } catch (e) {
            alert(e.message)
          }
        })
      }}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```

### Redirecting After Actions

When a server action needs to navigate to a different page (e.g. after creating a resource), use `throw redirect()` inside the action instead of `router.push()` on the client. Since every server action triggers a page re-render, calling `router.push()` after the action would briefly flash the re-rendered current page before navigating away.

```tsx
// src/actions.ts
'use server'

import { redirect } from 'spiceflow'

export async function createProject({ name, orgId }: { name: string; orgId: string }) {
  const project = await db.projects.create({ name, orgId })
  throw redirect(`/orgs/${orgId}/projects/${project.id}`)
}
```

```tsx
// src/app/create-project.tsx
'use client'

import { ErrorBoundary } from 'spiceflow/react'
import { createProject } from '../actions'

export function CreateProjectForm({ orgId }: { orgId: string }) {
  return (
    <ErrorBoundary fallback={<ErrorBoundary.ErrorMessage />}>
      <form action={async (formData: FormData) => {
        const name = formData.get('name') as string
        await createProject({ name, orgId })
        // no router.push needed — the action redirects server-side
      }}>
        <input name="name" required />
        <button type="submit">Create</button>
      </form>
    </ErrorBoundary>
  )
}
```

`router.push()` is still the right choice for pure client-side navigation that doesn't involve a server action (e.g. tab switches, select dropdowns, back buttons).

### Router

Use `getRouter` with your app type for type-safe navigation, URL building, and imperative loader data access. It works in **both client and server components** — in server/RSC code it reads the current request's location from async context, and `router.href()` builds typed URLs the same way. `useLoaderData` and `useRouterState` are exported separately from `spiceflow/react`, and both accept the same optional app generic.

`getRouter()` returns a **stable singleton** — the same object reference every time. It's safe to call in component bodies, pass to hook dependency arrays, or store at module scope. The reference never changes between renders, so it won't trigger unnecessary re-renders or effect re-runs.

Use `href()` for links so route and query changes are caught by TypeScript.

```tsx
// src/app/nav.tsx
'use client'

import { getRouter, Link } from 'spiceflow/react'
import type { App } from '../main'

export function Nav() {
  const router = getRouter<App>()

  return (
    <nav>
      <Link href={router.href('/')}>Home</Link>
      <Link href={router.href('/about')}>About</Link>
      <Link href={router.href('/users/:id', { id: '1' })}>User 1</Link>
      <Link href={router.href('/search', { q: 'docs', page: 1 })}>Search Docs</Link>
    </nav>
  )
}
```

<details>
<summary>Using getRouter in mounted sub-apps</summary>

`getRouter<App>()` sees all routes registered on the root app, regardless of where you call it. Inside a sub-app mounted with `.use()`, it still sees the whole route table — not just the sub-app's own routes:

```tsx
// src/features/billing/page.tsx — a sub-app mounted into the main app
import { Spiceflow } from 'spiceflow'
import { getRouter, Link } from 'spiceflow/react'
import type { App } from '../../main'

export const billingApp = new Spiceflow().page('/billing', async () => {
  // router is typed against the WHOLE app, not just billingApp
  const router = getRouter<App>()
  return (
    <div>
      <h1>Billing</h1>
      {/* Link to a route defined in a different sub-app */}
      <Link href={router.href('/users/:id', { id: '42' })}>Back to profile</Link>
    </div>
  )
})
```

No need to thread `app` through props or imports — every call is still fully type-checked against the root app's route table.

</details>

Wildcard routes like `/orgs/:orgId/*` accept **template literals** with interpolated values. TypeScript template literal types ensure only strings matching a registered route pattern are accepted:

```tsx
// Pattern form — pass params as an object
router.href('/orgs/:orgId/*', { orgId: 'acme', '*': 'projects' })
// → "/orgs/acme/projects"

// Template literal form — params already in the string
const orgId = 'acme'
router.href(`/orgs/${orgId}/projects`)
// → "/orgs/acme/projects"

// Works with any depth under the wildcard
const projectId = 'p1'
router.href(`/orgs/${orgId}/projects/${projectId}/settings`)
// → "/orgs/acme/projects/p1/settings"
```

The pattern form gives the strongest type checking — param names, query keys, and route existence are all validated. The template literal form is checked against registered route prefixes, but once values are interpolated TypeScript no longer knows the original param names. Invalid prefixes like `/settings/foo` still error at compile time either way.

`getRouter()` works on the server too — use it in server components to build type-safe links without needing the `app` closure:

```tsx
// src/app/org-breadcrumb.tsx (server component — no "use client")
import { getRouter, Link } from 'spiceflow/react'
import type { App } from '../main'

export async function OrgBreadcrumb({ orgId }: { orgId: string }) {
  const router = getRouter<App>()
  return (
    <nav>
      <Link href={router.href('/')}>Home</Link>
      <span> / </span>
      <Link href={router.href(`/orgs/${orgId}/projects`)}>Projects</Link>
    </nav>
  )
}
```

<details>
<summary>Always use href() for links</summary>

Every `Link` href and every programmatic navigation path should go through `href()`. Raw string paths like `<Link href="/users/42">` bypass type checking — if the route is renamed from `/users/:id` to `/profiles/:id`, the raw string silently becomes a 404 while `href('/users/:id', { id: '42' })` immediately fails `tsc`. When a route path changes or gets removed, `tsc` catches every stale `href()` call at compile time.

This applies to both client and server code. `getRouter<App>()` returns the same typed router everywhere — `router.href()` works identically in server components, client components, and the app entry file.

</details>

### Navigation & State

The `router` object from `getRouter` handles type-safe client-side navigation. `router.push`, `router.replace`, and `router.href` accept typed paths with autocomplete — params and query values are validated at compile time:

```tsx
// src/app/search-filters.tsx
'use client'

import { useRouterState } from 'spiceflow/react'
import { getRouter } from 'spiceflow/react'
import type { App } from '../main'

export function SearchFilters() {
  const router = getRouter<App>()
  const { pathname, searchParams } = useRouterState<App>()

  const query = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')
  const sort = searchParams.get('sort') ?? 'relevance'

  function setPage(n: number) {
    router.push({
      search: '?' + new URLSearchParams({ q: query, page: String(n), sort }),
    })
  }

  function setSort(newSort: string) {
    router.push({
      search: '?' + new URLSearchParams({ q: query, page: '1', sort: newSort }),
    })
  }

  return (
    <div>
      <p>
        Showing results for "{query}" — page {page}, sorted by {sort}
      </p>
      <button onClick={() => setSort('date')}>Sort by Date</button>
      <button onClick={() => setPage(page + 1)}>Next Page</button>
    </div>
  )
}
```

`useRouterState<App>()` subscribes to navigation changes and re-renders the component when the URL changes. It returns the current `pathname`, `search`, `hash`, and a parsed `searchParams` (a read-only `URLSearchParams`). If you omit `App`, the hook still works at runtime but skips route-type inference.

You can also navigate to a different pathname with search params, or use `router.replace` to update without adding a history entry:

```tsx
function Example() {
  const router = getRouter<App>()

  // Navigate to a new path with search params
  router.push({
    pathname: '/search',
    search: '?' + new URLSearchParams({ q: 'spiceflow' }),
  })

  // Replace current history entry (back button skips this)
  router.replace({
    search: '?' + new URLSearchParams({ tab: 'settings' }),
  })

  // Or just use a plain string
  router.push('/search?q=spiceflow&page=1')
}
```

### Server Actions

Use `"use server"` to define functions that run on the server but can be called from client components (e.g. form actions).

```tsx
// src/app/actions.tsx
'use server'

import { getActionRequest } from 'spiceflow'

export async function submitForm(formData: FormData) {
  const { signal } = getActionRequest()
  const name = formData.get('name')
  // signal is aborted when the client disconnects or cancels —
  // pass it to any downstream work so it cancels automatically
  await saveToDatabase(name, { signal })
}
```

On the client, `getActionAbortController()` returns the `AbortController` for the most recent in-flight call to a server action, or `undefined` if nothing is in-flight. Call `.abort()` to cancel the fetch.

Server actions include CSRF protection — the `Origin` header of POST requests is checked against the app's origin. This check is **disabled in development** (when running via `vite dev`) so tunnels and proxies don't cause issues. In production, when using a reverse proxy, tunnel, or custom domain that changes the origin, server actions return `403 Forbidden: origin mismatch`. Use `allowedActionOrigins` to allow additional origins:

```tsx
const app = new Spiceflow({
  allowedActionOrigins: [
    'https://my-app.example.com',
    /\.my-tunnel\.dev$/,
  ],
})
```

Each entry can be an exact origin string or a `RegExp` tested against the request's `Origin` header.

### Streaming UI from Server Actions

Server actions can return JSX directly — including via async generators that stream React elements to the client incrementally. The RSC flight protocol serializes each yielded element as it arrives, and the client deserializes them into real React elements you can render.

This is useful for AI chat interfaces where the model generates structured output with tool calls. Instead of streaming raw text, you stream rendered UI:

```tsx
// src/app/actions.tsx
'use server'

import { getActionRequest } from 'spiceflow'
import { WeatherCard } from './weather-card'
import { StockChart } from './stock-chart'

export async function* chat(
  messages: { role: string; content: string }[],
): AsyncGenerator<React.ReactElement> {
  // Pass the request signal to downstream work so the LLM call
  // is cancelled when the client aborts (e.g. clicks "Stop")
  const { signal } = getActionRequest()
  const stream = await callLLM(messages, { signal })

  for await (const event of stream) {
    if (event.type === 'text') {
      yield <p>{event.content}</p>
    }
    if (event.type === 'tool_call' && event.name === 'get_weather') {
      const weather = await fetchWeather(event.args.city)
      yield <WeatherCard city={event.args.city} weather={weather} />
    }
    if (event.type === 'tool_call' && event.name === 'get_stock') {
      const data = await fetchStock(event.args.symbol)
      yield <StockChart symbol={event.args.symbol} data={data} />
    }
  }
}
```

```tsx
// src/app/chat.tsx
'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { getActionAbortController } from 'spiceflow/react'
import { chat } from './actions'

export function Chat() {
  const [parts, setParts] = useState<ReactNode[]>([])
  const [isPending, startTransition] = useTransition()

  function send(formData: FormData) {
    const message = formData.get('message') as string
    setParts([])
    startTransition(async () => {
      const stream = await chat([{ role: 'user', content: message }])
      for await (const jsx of stream) {
        setParts((prev) => [...prev, jsx])
      }
    })
  }

  return (
    <div>
      <div>{parts.map((part, i) => <div key={i}>{part}</div>)}</div>
      <form action={send}>
        <input name="message" placeholder="Ask something..." />
        <button type="submit" disabled={isPending}>Send</button>
        {isPending && (
          <button type="button" onClick={() => getActionAbortController(chat)?.abort()}>
            Stop
          </button>
        )}
      </form>
    </div>
  )
}
```

Each yielded element — whether a text paragraph, a weather card, or a stock chart — arrives as a fully rendered React component. The client doesn't need to know how to render tool calls; it just accumulates whatever JSX the server sends.

### Redirects and Not Found

Use `redirect()` and `response.status` inside `.page()`, `.layout()`, and server action handlers to control navigation and HTTP status codes:

```tsx
import { Spiceflow, redirect } from 'spiceflow'

export const app = new Spiceflow()
  .layout('/*', async ({ children, request }) => {
    // When no page matches, children is null — render a custom 404
    return (
      <AppLayout>
        {children ?? <NotFound />}
      </AppLayout>
    )
  })
  .page('/dashboard', async ({ request }) => {
    const user = await getUser(request)
    if (!user) {
      throw redirect('/login')
    }
    return <Dashboard user={user} />
  })
  .page('/posts/:id', async ({ params, response }) => {
    const post = await getPost(params.id)
    if (!post) {
      response.status = 404
      return <NotFound message={`Post ${params.id} not found`} />
    }
    return <Post post={post} />
  })
  // Layouts can throw redirect — useful for auth guards that protect
  // an entire section of your app
  .layout('/admin/*', async ({ children, request }) => {
    const user = await getUser(request)
    if (!user?.isAdmin) {
      throw redirect('/login')
    }
    return <AdminLayout>{children}</AdminLayout>
  })

export type App = typeof app
```

`redirect()` accepts an optional second argument for custom status codes and headers:

```tsx
// 301 permanent redirect
throw redirect('/new-url', { status: 301 })

// Redirect with custom headers
throw redirect('/login', {
  headers: { 'set-cookie': 'session=; Max-Age=0' },
})
```

<details>
<summary>Response status, headers, and HTTP behavior</summary>

**`response.status` and `response.headers`** — every page and layout handler receives a mutable `response` object on the context. Set `response.status` to control the HTTP status code (defaults to 200). Set `response.headers` to add custom headers like `cache-control` or `set-cookie`.

**Correct HTTP status codes.** Unlike Next.js, where redirects always return a 200 status with client-side handling, Spiceflow returns the actual HTTP status code in the response — `307` for redirects (with a `Location` header) and whatever you set via `response.status` for pages. This works even when the throw happens after an `await`, because the SSR layer intercepts the error from the RSC stream before flushing the HTML response. Search engines see correct status codes, and `fetch()` calls with `redirect: "manual"` get the real `307` response.

**Client-side navigation.** When a user clicks a `<Link>` that navigates to a page throwing `redirect()`, the router performs the redirect client-side without a full page reload.

</details>

### Code Splitting

Code splitting of client components is **automatic** — you don't need `React.lazy()` or dynamic `import()`. Each `"use client"` file becomes a separate chunk, and the browser only loads the chunks needed for the current page.

<details>
<summary>How it works</summary>

When the RSC flight stream is sent to the browser, it contains references to client component chunks rather than the actual code. The browser resolves and loads only the chunks referenced on the current page. If route `/about` uses `<Map />` and route `/dashboard` uses `<Chart />`, visiting `/about` will never download the Chart component's JavaScript.

</details>

<details>
<summary>Barrel file pitfall</summary>

Avoid barrel files with `"use client"`. If you have a single file with `"use client"` that re-exports many components, all of them end up in one chunk — defeating code splitting. Instead, put `"use client"` in each individual component file:

```tsx
// BAD — one big chunk for everything
// src/components/index.tsx
'use client'
export { Chart } from './chart'
export { Map } from './map'
export { Table } from './table'
```

```tsx
// GOOD — each component is its own chunk
// src/components/chart.tsx
'use client'
export function Chart() {
  /* ... */
}

// src/components/map.tsx
;('use client')
export function Map() {
  /* ... */
}

// Re-export barrel has no directive, just passes through
// src/components/index.tsx
export { Chart } from './chart'
export { Map } from './map'
```

</details>

### Directory Paths

> Only available when using the Vite plugin.

Server components sometimes need to read files from the filesystem at runtime — for example, reading images from `public/` to generate Open Graph images, or writing cached files to disk. Using `import.meta.dirname` breaks on platforms like Vercel where the function runs from a different directory than where you built.

`publicDir` and `distDir` resolve to the correct absolute paths in every environment:

```tsx
import { publicDir, distDir } from 'spiceflow'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function generateOgImage(slug: string) {
  const template = await readFile(path.join(publicDir, 'og-template.png'))
  // ... generate image
  await writeFile(path.join(distDir, 'cache', `${slug}.png`), result)
}
```

| | `publicDir` | `distDir` |
|---|---|---|
| **Dev** | `<cwd>/public` | `<cwd>` |
| **Production** | `<outDir>/client` (where Vite copies public/ contents) | `<outDir>` |

### Remote Components & Federation

Expose any Flight-serializable value from a route with `encodeFederationPayload(...)`, then either render the fetched `Response` with `RenderFederatedPayload` or decode it imperatively with `decodeFederationPayload(response)`. This works for SSR'd remote components, plain objects, or objects containing JSX. Async iterables are supported when they are fields on an object payload (for example `{ stream }`), so clients can `for await` the decoded field directly.

```tsx
// remote app
import { encodeFederationPayload } from 'spiceflow/federation'

.get('/api/chart', async () => {
  return await encodeFederationPayload(<Chart dataSource="revenue" />)
})

// host app
import { Suspense } from 'react'
import { RenderFederatedPayload } from 'spiceflow/react'

.page('/', async () => {
  const response = await fetch('https://remote.example.com/api/chart')
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <RenderFederatedPayload response={response} />
    </Suspense>
  )
})
```

See [Federation docs](docs/federation.md) for full setup, imperative decoding with `decodeFederationPayload`, import map deduplication, and external ESM components.

## Model Context Protocol (MCP)

Spiceflow includes an MCP plugin that exposes your API routes as tools and resources for AI language models. Mount it with `.use(mcp())` and all routes become callable tools with proper input validation. See [MCP docs](docs/mcp.md) for full setup, client examples, and integrating with existing MCP servers.

## KV Page Caching

Cache full-page HTML in Cloudflare KV with deployment-aware cache keys. See [Cloudflare docs](docs/cloudflare.md#kv-page-caching) for the full middleware example.

## Deployment Skew Protection

When you deploy a new version of your app, users with stale browser tabs still have the old client bundle. If they navigate or call a server action, the old client would try to deserialize a flight payload from the new server — module IDs, serialization formats, and action references may have changed. Spiceflow detects this automatically and forces a hard page reload so the browser picks up the new bundle.

Each production build stamps a unique deployment ID (build timestamp) into the server bundle. The first document request sets an `HttpOnly` cookie with this ID. On subsequent RSC navigations and server action calls, the server compares the cookie against the current build:

- **Match** — request proceeds normally
- **Mismatch** — server returns `409` with an `x-spiceflow-reload` header pointing to the equivalent document URL. The client calls `window.location.replace()` to hard-reload the page, picking up the fresh HTML, JS, and cookie

This is automatic — no configuration needed. The deployment ID is disabled during development (`vite dev`) so it never interferes with HMR.

<details>
<summary>Server action behavior on mismatch</summary>

Server actions with a stale deployment cookie are never executed. The server short-circuits before route resolution and returns the 409 mismatch response. This prevents running action code against a mismatched server bundle where module IDs or database schemas may have changed. The client hard-reloads, and the user can retry the action on the fresh page.

</details>

<details>
<summary>How the deployment ID is resolved per environment</summary>

The deployment ID uses the `#deployment-id` import map in `package.json` with environment-conditional resolution:

- **`react-server`** — imports from `virtual:spiceflow-deployment-id` (the build timestamp baked in by Vite)
- **`default`** (browser, tests) — returns `''` (no-op, skew protection is server-side only)

In dev mode the RSC loader also returns `''`, so skew detection is only active in production builds.

</details>

## Node.js Handlers

In user-facing code, you should almost never convert a Node.js `req`/`res` pair into a standard `Request` yourself. Spiceflow already exposes the right adapter for each situation, so this conversion should stay inside Spiceflow rather than in app code.

<details>
<summary>Which adapter to use</summary>

- If you want to run your app on a port in Node.js or Bun, use `app.listen(3000)`. Spiceflow sets up the server adapter for you. Cloudflare Workers are the main exception because there is no port-based server to listen on there.
- If you need to plug a Spiceflow app into a classic Node.js handler API that gives you `req` and `res` (for example a Next.js pages API route), use `app.handleForNode(req, res)`. The older `app.handleNode(req, res)` alias also exists, but `handleForNode` is the current API.
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
  // IMPORTANT! nothing should be run before calling handleNode that could read the request body!
  await mcpAuthApp.handleNode(req, res)
}

export const config = {
  api: {
    bodyParser: false,
  },
}
```

## Docker Deployment

The build output is self-contained — `dist/` includes all traced runtime dependencies, so you can copy it directly into a Docker image without installing packages at deploy time. See [Docker docs](docs/docker.md) for Dockerfile examples and cross-platform native module handling.

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

## Comparisons

#### Elysia

This project was born as a fork of Elysia with several changes:

- Use Zod instead of Typebox
- Do not compile user code with `aot` and `eval`, Elysia is very difficult to contribue to because the app is generated by compiling the user routes with `new Function()`, which also causes [several bugs](https://github.com/elysiajs/elysia/pull/773)
- Better async generator support by using SSE

#### Hono

This project shares many inspirations with Hono with many differences

- First class OpenAPI support, you don't need to change anything to produce an OpenAPI spec, just add the `openapi` plugin to automaitcally export your openapi schema on `/openapi`
- Much simpler framework, everything is done with native `Request` and `Response` objects instead of framework specific utilities
- Support for async generators
- Adding schemas to your routes is easier and does not require using `validator` functions, which slow down TypeScript inference
- The generated RPC client has much faster type inference, intellisense in VSCode appears in milliseconds instead of seconds
- Spiceflow uses whatwg Request and Response instead of custom utilities like `c.text` and `c.req`
