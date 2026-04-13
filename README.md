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

## Returning JSON

Spiceflow automatically serializes objects returned from handlers to JSON, so you don't need to wrap them in a `Response` object:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .get('/user', () => {
    // Return object directly - no need for new Response()
    return { id: 1, name: 'John', email: 'john@example.com' }
  })
  .post('/data', async ({ request }) => {
    const body = await request.json()
    // Objects are automatically serialized to JSON
    return {
      received: body,
      timestamp: new Date().toISOString(),
      processed: true,
    }
  })
```

When you need a `Response` object directly (for custom status codes or headers), use `Response.json()` instead of `new Response(JSON.stringify(...))`:

```ts
// Good — built-in static method, sets Content-Type automatically
return Response.json({ error: 'Not found' }, { status: 404 })

// Avoid — verbose, easy to forget Content-Type header
return new Response(JSON.stringify({ error: 'Not found' }), {
  status: 404,
  headers: { 'content-type': 'application/json' },
})
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

To get the body of the request, call `request.json()` to parse the body as JSON. Spiceflow does not parse the body automatically — there is no `body` field in the route argument. Instead you call either `request.json()` or `request.formData()` to get the body and validate it at the same time. This works by wrapping the request in a `SpiceflowRequest` instance, which has `json()` and `formData()` methods that parse and validate. The returned data will have the correct schema type instead of `any`.

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

## Middleware

Middleware functions run before route handlers. They can log, authenticate, modify responses, or short-circuit the request entirely.

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().use(({ request }) => {
  console.log(`Received ${request.method} request to ${request.url}`)
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
      return new Response(`Cannot ${request.method} ${request.url}`, {
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
- `request.url` in middleware — contains the full URL including the base prefix

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

For Cloudflare Workers deployment with RSC, see [Cloudflare docs](docs/cloudflare.md). See [`cloudflare-example/`](cloudflare-example) for a complete working example.

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

The entry file defines your routes using `.page()` for pages and `.layout()` for layouts. This file runs in the RSC environment on the server. All routes registered with `.page()`, `.get()`, etc. are available in `app.href()` for type-safe URL building — including path params and query params.

```tsx
// src/main.tsx
import { Spiceflow, serveStatic } from 'spiceflow'
import { Head, Link } from 'spiceflow/react'
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
    const data = await fetchSomeData()
    return (
      <div>
        <h1>Welcome</h1>
        <p>Server-rendered data: {data.message}</p>
        <Counter />
        <Link href={app.href('/users/:id', { id: '42' })}>View User 42</Link>
        <Link href={app.href('/search', { q: 'spiceflow' })}>Search</Link>
      </div>
    )
  })
  .page('/about', async () => {
    return (
      <div>
        <h1>About</h1>
        <Link href={app.href('/')}>Back to Home</Link>
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

`app.href()` gives you **type-safe links** — TypeScript validates that the path exists, params are correct, and query values match the schema. Invalid paths or missing params are caught at compile time. The closure over `app` sees all routes, including ones defined later in the chain.

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
import { Link } from 'spiceflow/react'
import { href } from './router'

export function ProductFilters() {
  return (
    <nav>
      {/* TypeScript validates these query keys against the schema */}
      <Link href={href('/products', { category: 'shoes', sort: 'price' })}>
        Shoes by Price
      </Link>
      <Link href={href('/products', { sort: 'date', page: 2 })}>
        Page 2, newest first
      </Link>

      {/* @ts-expect-error — 'color' is not in the query schema */}
      <Link href={href('/products', { color: 'red' })}>Red</Link>
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

### Forms & Server Actions

Forms use React 19's `<form action>` with server functions marked `"use server"`. They work before JavaScript loads (progressive enhancement). After a form submission completes, the page re-renders with fresh server data automatically. When calling a server action directly as a function (not via form submission), the page does **not** re-render — call `router.refresh()` if you need the UI to update.

```tsx
// src/app/submit-button.tsx
'use client'
import { useFormStatus } from 'react-dom'

// useFormStatus must be in a component rendered inside the <form>
export function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}
```

```tsx
import { redirect } from 'spiceflow'
import { SubmitButton } from './app/submit-button'

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
      <SubmitButton />
    </form>
  )
})
```

Use `useActionState` to display return values from the action. The action receives the previous state as its first argument and `FormData` as the second:

```tsx
// src/app/newsletter.tsx
'use client'
import { useActionState } from 'react'
import { SubmitButton } from './submit-button'

export function NewsletterForm({
  action,
}: {
  action: (prev: string, formData: FormData) => Promise<string>
}) {
  const [message, formAction] = useActionState(action, '')
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <SubmitButton />
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

If a server action throws, the error is caught by the nearest error boundary. The error message is preserved (sanitized to strip secrets) and displayed to the user in both development and production builds.

### Router

Use `getRouter` with your app type for type-safe navigation, URL building, and imperative loader data access. It works in **both client and server components** — in server/RSC code it reads the current request's location from async context, and `router.href()` builds typed URLs the same way. `useLoaderData` and `useRouterState` are exported separately from `spiceflow/react`, and both accept the same optional app generic.

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

`app.href()` is scoped to the app instance it's called on — inside a sub-app mounted with `.use()`, you only see that sub-app's own routes, not the root app's. To build type-safe links that reference the whole app's routes from inside a sub-app (or any helper module that doesn't close over the root `app`), import the root `App` type and use `getRouter<App>()` instead of `app.href()`:

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

This is the recommended way to build links from server components in modular codebases — no need to thread `app` through props or imports, and every call is still fully type-checked against the root app's route table.

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
