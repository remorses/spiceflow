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
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  plugins: [react(), spiceflowPlugin({ entry: './src/main.tsx' })],
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
- Static files win over root catch-all routes like `/*` and `*`. This is useful for SPA fallbacks and custom 404 routes.
- If static does not find a file, the request falls through to the next matching route, so a `/*` fallback still runs when the asset is missing.
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

### Authorization

You can handle authorization in a middleware. The example below checks if the user is logged in and uses `.state()` to track the session across handlers:

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('session', null as Session | null)
  .use(async ({ request: req, state }, next) => {
    const res = new Response()

    const { session } = await getSession({ req, res })
    if (!session) {
      return
    }
    state.session = session
    const response = await next()

    const cookies = res.headers.getSetCookie()
    for (const cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response
  })
  .route({
    method: 'POST',
    path: '/protected',
    async handler({ state }) {
      const { session } = state
      if (!session) {
        throw new Error('Not logged in')
      }
      return { ok: true }
    },
  })
```

### Proxy

```ts
import { Spiceflow } from 'spiceflow'
import type { MiddlewareHandler } from 'spiceflow'

export const app = new Spiceflow()

function createProxyMiddleware({
  target,
  changeOrigin = false,
}): MiddlewareHandler {
  return async ({ request }) => {
    const url = new URL(request.url)

    const proxyReq = new Request(
      new URL(url.pathname + url.search, target),
      request,
    )

    if (changeOrigin) {
      proxyReq.headers.set('origin', new URL(target).origin || '')
    }
    console.log('proxying', proxyReq.url)
    const res = await fetch(proxyReq)

    return res
  }
}

app.use(
  createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
  }),
)

// or with a basePath
app.use(
  new Spiceflow({ basePath: '/v1/completions' }).use(
    createProxyMiddleware({
      target: 'https://api.openai.com',
      changeOrigin: true,
    }),
  ),
)

app.listen(3030)
```

### Non-Blocking Auth

Sometimes authentication is only required for specific routes, and you don't want to block public routes while waiting for authentication. You can use `Promise.withResolvers()` to start fetching user data in parallel, allowing public routes to respond immediately while protected routes wait for authentication to complete.

The example below demonstrates this pattern - the `/public` route responds instantly while `/protected` waits for authentication:

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('userId', Promise.resolve(''))
  .state('userEmail', Promise.resolve(''))
  .use(async ({ request, state }, next) => {
    const sessionKey = request.headers.get('sessionKey')
    const userIdPromise = Promise.withResolvers<string>()
    const userEmailPromise = Promise.withResolvers<string>()

    state.userId = userIdPromise.promise
    state.userEmail = userEmailPromise.promise

    async function resolveUser() {
      if (!sessionKey) {
        userIdPromise.resolve('')
        userEmailPromise.resolve('')
        return
      }
      const user = await getUser(sessionKey)
      userIdPromise.resolve(user?.id ?? '')
      userEmailPromise.resolve(user?.email ?? '')
    }

    resolveUser()
  })
  .route({
    method: 'GET',
    path: '/protected',
    async handler({ state }) {
      const userId = await state.userId
      if (!userId) throw new Error('Not authenticated')
      return { message: 'Protected data' }
    },
  })
  .route({
    method: 'GET',
    path: '/public',
    handler() {
      return { message: 'Public data' }
    },
  })

async function getUser(sessionKey: string) {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return sessionKey === 'valid'
    ? { id: '123', email: 'user@example.com' }
    : null
}
```

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

Use `/*` as a catch-all route to handle 404 errors. More specific routes always take precedence regardless of registration order:

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
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  base: '/my-app',
  plugins: [react(), spiceflowPlugin({ entry: 'src/main.tsx' })],
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

### Path Matching

**Supported patterns:**

- **Named parameters**: `:param` - Captures dynamic segments like `/users/:id` or `/api/:version/users/:userId`
- **Wildcards**: `*` - Matches any remaining path segments like `/files/*` or `/proxy/*`. A wildcard route also matches the parent path without a trailing segment — `/files/*` matches both `/files/foo` and `/files`.
- **Catch-all routes**: `/*` - Use as a not-found handler that catches any unmatched paths

**Unsupported patterns:**

- **Optional parameters**: `/:param?` - Use separate routes instead - IS NOT SUPPORTED
- **Named wildcards**: `/files/*name` - Use unnamed `*` only - IS NOT SUPPORTED
- **Partial parameters**: `/:param-suffix` or `/prefix-:param` - Use full segment parameters only - IS NOT SUPPORTED
- **Regex patterns**: `/users/(\\d+)` - Use string parameters with validation in handlers - IS NOT SUPPORTED
- **Multiple wildcards**: `/*/files/*` - Use single wildcard only - IS NOT SUPPORTED

### Fetch Client Errors

The fetch client returns `Error | Data` directly. When the server responds with a non-2xx status code, the client returns a `SpiceflowFetchError` instead of the data. Use `instanceof Error` to check:

- Responses with status codes 200-299 return the parsed data directly
- Responses with status codes < 200 or ≥ 300 return a `SpiceflowFetchError`
- The error has `status`, `value` (parsed response body), and `response` (raw Response) properties

```ts
// server.ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/error',
    handler() {
      throw new Error('Something went wrong')
    },
  })
  .route({
    method: 'GET',
    path: '/unauthorized',
    handler() {
      return new Response('Unauthorized access', { status: 401 })
    },
  })
  .route({
    method: 'GET',
    path: '/success',
    handler() {
      throw new Response('Success message', { status: 200 })
      return ''
    },
  })

export type App = typeof app
```

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

async function handleErrors() {
  const errorResult = await safeFetch('/error')
  if (errorResult instanceof Error) {
    console.error('Error occurred:', errorResult.message)
  }

  const unauthorizedResult = await safeFetch('/unauthorized')
  if (unauthorizedResult instanceof Error) {
    console.error(
      'Unauthorized:',
      unauthorizedResult.message,
      'Status:',
      unauthorizedResult.status,
    )
  }

  const successResult = await safeFetch('/success')
  if (successResult instanceof Error) return
  console.log('Success:', successResult) // 'Success message'
}
```

### Server-Side Fetch

You can pass the Spiceflow app instance directly to `createSpiceflowFetch()` instead of providing a URL. This makes "virtual" requests handled directly by the app without actual network requests. Useful for testing, generating documentation, or interacting with your API programmatically without setting up a server.

```tsx
import { Spiceflow } from 'spiceflow'
import { createSpiceflowFetch } from 'spiceflow/client'
import { openapi } from 'spiceflow/openapi'
import { writeFile } from 'node:fs/promises'

export const app = new Spiceflow()
  .use(openapi({ path: '/openapi' }))
  .route({
    method: 'GET',
    path: '/users',
    handler() {
      return [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    handler({ request }) {
      return request.json()
    },
  })

// Create fetch client by passing app instance directly
const safeFetch = createSpiceflowFetch(app)

// Get OpenAPI schema and write to disk
const data = await safeFetch('/openapi')
if (data instanceof Error) throw data
await writeFile('openapi.json', JSON.stringify(data, null, 2))
console.log('OpenAPI schema saved to openapi.json')
```

<details>
<summary>Fixing ts(2742) with SpiceflowFetch</summary>

When using `createSpiceflowFetch` and getting typescript error `The inferred type of '...' cannot be named without a reference to '...'. This is likely not portable. A type annotation is necessary. (ts 2742)`, you can resolve this issue by adding an explicit type for the client:

```ts
import type { SpiceflowFetch } from 'spiceflow/client'

export const f: SpiceflowFetch<App> = createSpiceflowFetch<App>(PUBLIC_URL)
```

</details>

## Type-Safe RPC

To maintain type safety when using the fetch client, **throw Response objects for errors** and **return objects directly for success cases**. The fetch client returns `Error | Data` directly — use `instanceof Error` to narrow the type:

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users/:id',
    query: z.object({
      q: z.string(),
    }),
    response: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    handler({ params }) {
      const user = getUserById(params.id)

      if (!user) {
        throw new Response('User not found', { status: 404 })
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    request: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    response: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    async handler({ request }) {
      const body = await request.json()

      if (await userExists(body.email)) {
        throw new Response('User already exists', { status: 409 })
      }

      const newUser = await createUser(body)

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
    },
  })

export type App = typeof app
```

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

// Path params are type-safe — TypeScript requires { id: string }
const user = await safeFetch('/users/:id', {
  params: { id: '123' },
  query: { q: 'something' },
})
if (user instanceof Error) {
  console.error('Error:', user.message)
  return
}
// user is typed as { id: string, name: string, email: string }
console.log('User:', user.name, user.email)

// Body is type-safe — TypeScript requires { name: string, email: string }
const newUser = await safeFetch('/users', {
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' },
})
if (newUser instanceof Error) return newUser
console.log('Created:', newUser.id)
```

With this pattern:

- **Success responses**: Return objects directly for automatic JSON serialization and proper type inference
- **Error responses**: Throw `Response` objects — the fetch client returns a `SpiceflowFetchError` with `status`, `value`, and `response` properties
- **Type safety**: The fetch client gives you full type safety on **path params**, **query params**, **request body**, and **response data** — all inferred from your route definitions

## Path Building

The `href` method provides a type-safe way to build URLs with parameters. It prevents runtime errors by ensuring all required parameters are provided and properly substituted into the path.

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id/posts/:postId',
    handler({ params }) {
      return { userId: params.id, postId: params.postId }
    },
  })

// Building URLs with required parameters
const userPath = app.href('/users/:id', { id: '123' })
// Result: '/users/123'

// Building URLs with required parameters
const userPostPath = app.href('/users/:id/posts/:postId', {
  id: '456',
  postId: 'abc',
})
// Result: '/users/456/posts/abc'
```

### Query Parameters

When a route has a `query` schema, `href` accepts query parameters alongside path parameters in the same flat object. Query parameters are appended as a query string, and unknown keys are rejected at the type level:

```ts
export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/search',
    query: z.object({ q: z.string(), page: z.coerce.number() }),
    handler({ query }) {
      return { results: [], q: query.q }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    query: z.object({ fields: z.string() }),
    handler({ params, query }) {
      return { id: params.id, fields: query.fields }
    },
  })

app.href('/search', { q: 'hello', page: 1 })
// Result: '/search?q=hello&page=1'

app.href('/users/:id', { id: '42', fields: 'name' })
// Result: '/users/42?fields=name'

// @ts-expect-error - 'invalid' is not a known query key
app.href('/search', { invalid: 'x' })
```

### Standalone `createHref`

If you need a path builder on the client side where you can't import server app code, use `createHref` with the `App` type:

```ts
import { createHref } from 'spiceflow'
import type { App } from './server' // import only the type, not the runtime app

const href = createHref<App>()

href('/users/:id', { id: '123' })
// Result: '/users/123'

href('/search', { q: 'hello', page: 1 })
// Result: '/search?q=hello&page=1'
```

The returned function has the same type safety as `app.href` — it infers paths, params, and query schemas from the app type. The app argument is optional and not used at runtime, so you can call `createHref<App>()` without passing any value.

<details>
<summary>OAuth callback example</summary>

The `href` method is particularly useful when building callback URLs for OAuth flows, where you need to construct URLs dynamically based on user data or session information:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/auth/callback/:provider/:userId',
    handler({ params, query }) {
      const { provider, userId } = params
      const { code, state } = query

      return {
        provider,
        userId,
        authCode: code,
        state,
      }
    },
  })
  .route({
    method: 'POST',
    path: '/auth/login',
    handler({ request }) {
      const userId = '12345'
      const provider = 'google'

      const callbackUrl = new URL(
        app.href('/auth/callback/:provider/:userId', {
          provider,
          userId,
        }),
        'https://myapp.com',
      ).toString()

      const oauthUrl =
        `https://accounts.google.com/oauth/authorize?` +
        `client_id=your-client-id&` +
        `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
        `response_type=code&` +
        `scope=openid%20profile%20email`

      return { redirectUrl: oauthUrl }
    },
  })
```

</details>

## State & Bindings

You can use bindings type safely using a `.state` method and then passing the state in the `handle` method in the second argument. This pattern is useful for dependency injection — you can swap the env with mocks when testing with Node.js:

```tsx
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

interface Env {
  KV: KVNamespace
  QUEUE: Queue
  SECRET: string
}

export const app = new Spiceflow()
  .state('env', {} as Env)
  .route({
    method: 'GET',
    path: '/kv/:key',
    async handler({ params, state }) {
      const value = await state.env!.KV.get(params.key)
      return { key: params.key, value }
    },
  })
  .route({
    method: 'POST',
    path: '/queue',
    async handler({ request, state }) {
      const body = await request.json()
      await state.env!.QUEUE.send(body)
      return { success: true, message: 'Added to queue' }
    },
  })

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Pass the env bindings to the app
    return app.handle(request, { state: { env } })
  },
}
```

> **Alternative:** On Cloudflare Workers you can also `import { env } from 'cloudflare:workers'` to access bindings directly from anywhere in your code, without threading env through `.state()`. See the [KV caching example](#kv-page-caching) above for this approach.

## Cookies

Spiceflow works with standard Request and Response objects, so you can use any cookie library like the `cookie` npm package to handle cookies.

<details>
<summary>Full set/get/clear cookie example</summary>

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/set-cookie',
    handler({ request }) {
      const cookies = parse(request.headers.get('Cookie') || '')

      const response = new Response(
        JSON.stringify({
          message: 'Cookie set!',
          existingCookies: cookies,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )

      response.headers.set(
        'Set-Cookie',
        serialize('session', 'abc123', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        }),
      )

      return response
    },
  })
  .route({
    method: 'GET',
    path: '/get-cookie',
    handler({ request }) {
      const cookies = parse(request.headers.get('Cookie') || '')
      return { sessionId: cookies.session || null, allCookies: cookies }
    },
  })
  .route({
    method: 'POST',
    path: '/clear-cookie',
    handler({ request }) {
      const response = new Response(
        JSON.stringify({ message: 'Cookie cleared!' }),
        { headers: { 'Content-Type': 'application/json' } },
      )

      response.headers.set(
        'Set-Cookie',
        serialize('session', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          expires: new Date(0),
          path: '/',
        }),
      )

      return response
    },
  })

app.listen(3000)
```

</details>

You can also use cookies in middleware for authentication or session handling:

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

export const app = new Spiceflow()
  .state('userId', null as string | null)
  .use(async ({ request, state }, next) => {
    // Parse cookies from incoming request
    const cookies = parse(request.headers.get('Cookie') || '')

    // Extract user ID from session cookie
    if (cookies.session) {
      // In a real app, you'd verify the session token
      state.userId = cookies.session
    }

    const response = await next()

    // Optionally refresh the session cookie
    if (state.userId && response) {
      response.headers.set(
        'Set-Cookie',
        serialize('session', state.userId, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        }),
      )
    }

    return response
  })
  .route({
    method: 'GET',
    path: '/profile',
    handler({ state }) {
      if (!state.userId) {
        return new Response('Unauthorized', { status: 401 })
      }

      return { userId: state.userId, message: 'Welcome back!' }
    },
  })
```

## Generating OpenAPI Schema

```ts
import { openapi } from 'spiceflow/openapi'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  .use(openapi({ path: '/openapi.json' }))
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello, World!'
    },
    query: z.object({
      name: z.string(),
      age: z.number(),
    }),
    response: z.string(),
  })
  .route({
    method: 'POST',
    path: '/user',
    handler() {
      return new Response('Hello, World!')
    },
    request: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  })

const openapiSchema = await (
  await app.handle(new Request('http://localhost:3000/openapi.json'))
).json()
```

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

Spiceflow provides a `waitUntil` function in the handler context that allows you to schedule tasks in the background in a cross platform way. It will use the Cloudflare Workers `waitUntil` if present. It's currently a no-op in Node.js.

### Basic Usage

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'POST',
  path: '/process',
  async handler({ request, waitUntil }) {
    const data = await request.json()

    // Schedule background task
    waitUntil(
      fetch('https://analytics.example.com/track', {
        method: 'POST',
        body: JSON.stringify({ event: 'data_processed', data }),
      }),
    )

    // Return response immediately
    return { success: true, id: Math.random().toString(36) }
  },
})
```

### Cloudflare Workers Integration

In Cloudflare Workers, `waitUntil` is automatically detected from the global context:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'POST',
  path: '/webhook',
  async handler({ request, waitUntil }) {
    const payload = await request.json()

    // Process webhook data in background
    waitUntil(
      processWebhookData(payload)
        .then(() => console.log('Webhook processed'))
        .catch((err) => console.error('Webhook processing failed:', err)),
    )

    // Respond immediately to webhook sender
    return new Response('OK', { status: 200 })
  },
})

async function processWebhookData(payload: any) {
  // Simulate time-consuming processing
  await new Promise((resolve) => setTimeout(resolve, 1000))
  // Save to database, send notifications, etc.
}

export default {
  fetch(request: Request, env: any, ctx: ExecutionContext) {
    return app.handle(request, { state: { env } })
  },
}
```

### Custom `waitUntil` Function

You can also provide your own `waitUntil` implementation:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow({
  waitUntil: (promise) => {
    // Custom implementation for non-Cloudflare environments
    promise.catch((err) => console.error('Background task failed:', err))
  },
}).route({
  method: 'GET',
  path: '/analytics',
  async handler({ waitUntil }) {
    // Schedule analytics tracking
    waitUntil(trackPageView('/analytics'))

    return { message: 'Analytics page loaded' }
  },
})

async function trackPageView(path: string) {
  // Track page view in analytics system
  console.log(`Page view tracked: ${path}`)
}
```

**Note:** In non-Cloudflare environments, if no custom `waitUntil` function is provided, the default implementation is a no-op that doesn't wait for the promises to complete.

## Server Lifecycle

`listen()` returns an object with `port`, `server`, and `stop()` for programmatic control:

```ts
const listener = await app.listen(3000)

console.log(`Listening on port ${listener.port}`)

await listener.stop()
```

> In Vite dev and during prerender, Spiceflow skips starting a real server. `listen()` still returns an object, but `port` and `server` are `undefined` and `stop()` is a noop, so cleanup code can stay unconditional.

## Graceful Shutdown

The `preventProcessExitIfBusy` middleware prevents platforms like Fly.io from killing your app while processing long requests (e.g., AI payloads). Fly.io can wait up to 5 minutes for graceful shutdown.

```ts
import { Spiceflow, preventProcessExitIfBusy } from 'spiceflow'

export const app = new Spiceflow()
  .use(
    preventProcessExitIfBusy({
      maxWaitSeconds: 300, // 5 minutes max wait (default: 300)
      checkIntervalMs: 250, // Check interval (default: 250ms)
    }),
  )
  .route({
    method: 'POST',
    path: '/ai/generate',
    async handler({ request }) {
      const prompt = await request.json()
      // Long-running AI generation
      const result = await generateAIResponse(prompt)
      return result
    },
  })

app.listen(3000)
```

When receiving SIGTERM during deployment, the middleware waits for all active requests to complete before exiting. Perfect for AI workloads that may take minutes to process.

## Tracing (OpenTelemetry)

Spiceflow has built-in OpenTelemetry tracing. Pass a `tracer` to the constructor and every request gets automatic spans for middleware, handlers, loaders, layouts, pages, and RSC serialization — no monkey-patching, no plugins.

### Setup

Install the OTel SDK packages alongside spiceflow:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/api
```

Create a tracing setup file that runs **before** your app starts. This registers the OTel SDK globally so spans are collected and exported:

```ts
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  serviceName: 'my-app',
  traceExporter: new OTLPTraceExporter({
    // Send traces to your collector or observability backend
    url: 'http://localhost:4318/v1/traces',
  }),
})

sdk.start()
```

Then pass a tracer to your Spiceflow app:

```ts
// main.ts
import './tracing' // must be imported first
import { trace } from '@opentelemetry/api'
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow({ tracer: trace.getTracer('my-app') }).get(
  '/api/users/:id',
  ({ params }) => {
    return { id: params.id, name: 'Alice' }
  },
)
```

### What you get

Every request produces a span tree. For API routes:

```
GET /api/users/:id [server]
├── middleware - cors
├── middleware - auth
└── handler - /api/users/:id
```

For React routes with loaders and layouts:

```
GET /dashboard [server]
├── middleware - auth
├── loader - /dashboard
├── loader - /sidebar
├── layout - /
├── page - /dashboard
└── rsc.serialize
```

Each span includes standard HTTP attributes (`http.request.method`, `http.route`, `http.response.status_code`, `url.full`) following [OTel semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/). Errors are recorded with `recordException` and set the span status to ERROR. If your errors use [errore](https://errore.org) tagged errors, the stable fingerprint is propagated as an `error.fingerprint` attribute for consistent error grouping.

### Custom spans and attributes

Every handler receives `span` and `tracer` on its context. These work whether or not you configured a tracer — when no tracer is passed, they use no-op implementations that do nothing, so you never need conditional checks.

**Add attributes to the current span:**

```ts
.get('/api/users/:id', ({ params, span }) => {
  const user = db.findUser(params.id)
  span.setAttribute('user.plan', user.plan)
  return user
})
```

**Record a caught exception without re-throwing:**

```ts
.post('/api/webhook', async ({ request, span }) => {
  const body = await request.json()
  try {
    await processWebhook(body)
  } catch (err) {
    span.recordException(err)
  }
  return { ok: true }
})
```

**Create child spans for DB calls or external APIs:**

```ts
.get('/api/data', async ({ tracer, params }) => {
  return tracer.startActiveSpan('db.query', async (dbSpan) => {
    const data = await db.query(params.id)
    dbSpan.setAttribute('db.rows', data.length)
    dbSpan.end()
    return data
  })
})
```

You can also import `withSpan` as a convenience wrapper that handles errors and `span.end()` automatically:

```ts
import { withSpan } from 'spiceflow'

.get('/api/data', async ({ tracer, params }) => {
  return withSpan(tracer, 'db.query', {}, async (dbSpan) => {
    dbSpan.setAttribute('db.table', 'users')
    return db.query(params.id)
  })
})
```

### Zero overhead without tracer

When no `tracer` is passed, every instrumentation point is skipped entirely — no strings allocated, no objects created, no extra async wrappers. The `span` and `tracer` on the handler context use no-op implementations whose empty methods V8 inlines away.

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
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    react(),
    spiceflowPlugin({
      entry: './src/main.tsx',
    }),
  ],
})
```

### Cloudflare RSC Setup

For Cloudflare Workers, keep the worker-specific SSR output and child environment wiring in Vite, then let your Worker default export delegate to `app.handle(request)`.

```jsonc
// wrangler.jsonc
{
  "main": "spiceflow/cloudflare-entrypoint",
}
```

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    react(),
    spiceflowPlugin({ entry: './app/main.tsx' }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
```

```tsx
// app/main.tsx
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().page('/', async () => {
  return <div>Hello from Cloudflare RSC</div>
})

export type App = typeof app

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

See [`cloudflare-example/`](cloudflare-example) for a complete working example.

#### Wrangler Environments

The `@cloudflare/vite-plugin` resolves and flattens your `wrangler.json` config at **build time** and writes it into `dist/rsc/wrangler.json`. When `wrangler deploy` runs, it reads this generated config — not your top-level `wrangler.json`. This means `wrangler deploy --env preview` alone is not enough if the build was done without specifying the environment.

Set the `CLOUDFLARE_ENV` env var during `vite build` so the plugin resolves the correct environment section:

```bash
# Build for preview environment
CLOUDFLARE_ENV=preview vite build && wrangler deploy --env preview

# Build for production (default, no env var needed)
vite build && wrangler deploy
```

Without `CLOUDFLARE_ENV=preview`, the generated `dist/rsc/wrangler.json` will contain the top-level config (production name, routes, KV namespaces, etc.) and `--env preview` will be ignored at deploy time.

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

**Reading loader data in client components** uses the `useLoaderData` hook from `createRouter`:

```tsx
// src/app/sidebar.tsx
'use client'

import { useLoaderData } from './router'

export function Sidebar() {
  // Type-safe: path narrows the return type to the loaders matching '/dashboard'
  const { user, stats } = useLoaderData('/dashboard')
  return (
    <aside>
      {user.name} — {stats.totalViews} views
    </aside>
  )
}
```

Loader data updates automatically on client-side navigation — when the user navigates to a new route, the server re-runs the matching loaders and the new data arrives atomically with the new page content via the RSC flight stream.

**Reading loader data outside React** with `getLoaderData` is useful when you need data before React starts rendering, for example to initialize a ProseMirror editor, a canvas, or a WebGL scene. It reads synchronously from a global set by the server during SSR — available at module scope before any component mounts:

```tsx
// src/app/editor.tsx
'use client'

import { useCallback } from 'react'
import { getLoaderData, router } from './router'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

// Top-level await — module pauses until loader data resolves from the RSC
// flight payload. Supports Date, Map, Set etc (RSC encoding, not JSON).
const { document } = await getLoaderData('/editor/:id')
const state = EditorState.create({ doc: document.content })
const view = new EditorView(null, { state })

// Update editor when loader data changes on navigation
router.subscribe(async (event) => {
  if (event.action !== 'LOADER_DATA') return
  const { document } = await getLoaderData('/editor/:id')
  view.updateState(EditorState.create({ doc: document.content }))
})

export function Editor() {
  // Mount the existing EditorView into the DOM — no useEffect needed
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node && !node.firstChild) node.appendChild(view.dom)
  }, [])
  return <div ref={ref} />
}
```

**Error handling**: if a loader throws a `redirect()` or `notFound()`, the entire request short-circuits — the page handler never runs. If a loader throws any other error, it renders through the nearest error boundary instead of showing a blank page.

### Forms & Server Actions

Forms use React 19's `<form action>` with server functions marked `"use server"`. They work before JavaScript loads (progressive enhancement). After a server action completes, all matching loaders re-run automatically — no manual revalidation needed.

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

### Client Router

Use `createRouter` with your app type for type-safe navigation, URL building, and loader data access in client components. Bind the app type once — all paths, params, query schemas, and loader data are inferred from arguments.

```tsx
// src/app/router.ts
'use client'

import { createRouter } from 'spiceflow/react'
import type { App } from '../main'

export const { router, useRouterState, useLoaderData, getLoaderData, href } =
  createRouter<App>()
```

```tsx
// src/app/nav.tsx
'use client'

import { Link } from 'spiceflow/react'
import { href } from './router'

export function Nav() {
  return (
    <nav>
      <Link href={href('/')}>Home</Link>
      <Link href={href('/about')}>About</Link>
      <Link href={href('/users/:id', { id: '1' })}>User 1</Link>
      <Link href={href('/search', { q: 'docs', page: 1 })}>Search Docs</Link>
    </nav>
  )
}
```

### Navigation & State

The `router` object from `createRouter` handles type-safe client-side navigation. `router.push` and `router.replace` accept typed paths with autocomplete — params and query values are validated at compile time:

```tsx
// src/app/search-filters.tsx
'use client'

import { router, useRouterState } from './router'

export function SearchFilters() {
  const { pathname, searchParams } = useRouterState()

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

`useRouterState()` subscribes to navigation changes and re-renders the component when the URL changes. It returns the current `pathname`, `search`, `hash`, and a parsed `searchParams` (a read-only `URLSearchParams`).

You can also navigate to a different pathname with search params, or use `router.replace` to update without adding a history entry:

```tsx
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

Use `redirect()` and `response.status` inside `.page()` and `.layout()` handlers to control navigation and HTTP status codes:

```tsx
import { Spiceflow, redirect } from 'spiceflow'

export const app = new Spiceflow()
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
  // Catch-all page for any unmatched route — works as a custom 404 page.
  // More specific routes always win over /* regardless of registration order.
  .page('/*', async ({ response, params }) => {
    response.status = 404
    return <NotFound message={`Page not found: ${params['*']}`} />
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

### Remote Components

Embed components from other spiceflow servers or load client-only components from any ESM URL (like [esm.sh](https://esm.sh) or [Framer](https://framer.com)). `RemoteComponent` is an async server component that detects the response type automatically — JSON for federation, JavaScript for ESM modules.

```tsx
import { Suspense } from 'react'
import { RemoteComponent } from 'spiceflow/react'

// From another spiceflow server (federation)
<Suspense fallback={<div>Loading...</div>}>
  <RemoteComponent src="https://my-remote.com/api/chart" props={{ dataSource: 'revenue' }} />
</Suspense>

// From esm.sh
<Suspense fallback={<div>Loading...</div>}>
  <RemoteComponent src="https://esm.sh/some-chart-component" />
</Suspense>

// From Framer
<Suspense fallback={<div>Loading...</div>}>
  <RemoteComponent src="https://framer.com/m/IOKnob-DT0M.js@eZsKjfnRtnN8np5uwoAx" />
</Suspense>
```

`RemoteComponent` must be wrapped in `<Suspense>` — the fallback shows while the remote server responds (federation) or while the module loads (ESM).

#### Federation

Federation lets you compose multiple spiceflow apps at the React Server Component level. A **remote** app exposes components, and a **host** app embeds them — with full SSR, hydration, and client interactivity.

**Remote app** — exposes a component via `renderComponentPayload`:

```tsx
// remote/vite.config.ts
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  base: process.env.REMOTE_ORIGIN || 'http://localhost:3001',
  plugins: [
    spiceflowPlugin({
      entry: './app/main.tsx',
      federation: 'remote',
    }),
  ],
})
```

```tsx
// remote/app/main.tsx
import { Spiceflow } from 'spiceflow'
import { cors } from 'spiceflow/cors'
import { renderComponentPayload } from 'spiceflow/federation'
import { Chart } from './chart'
import { Table } from './table'
import { db } from './db'

export const app = new Spiceflow()
  .use(cors({ origin: '*' }))
  // Dynamic: fetch data at request time, render the component, return the payload
  .get('/api/chart', async ({ request }) => {
    const url = new URL(request.url)
    const props = JSON.parse(url.searchParams.get('props') || '{}')
    const rows = await db.query('SELECT month, revenue FROM sales WHERE year = 2025')
    const payload = await renderComponentPayload(<Chart data={rows} {...props} />)
    return Response.json(payload)
  })
  // Static: pre-rendered at build time and written to disk as a JSON file.
  // Serve it from S3, a CDN, or any static host — no server needed at runtime.
  .staticGet('/api/table', async () => {
    const rows = await db.query('SELECT name, role, department FROM employees')
    const payload = await renderComponentPayload(<Table rows={rows} />)
    return Response.json(payload)
  })
```

The `.staticGet` route runs at build time and writes the JSON response to disk. You can upload the output to S3 or any static host — the host app fetches it like any other URL, and `RemoteComponent` renders it with full SSR and hydration. No server running for the remote at runtime.

**Host app** — embeds the remote components:

```tsx
// host/app/main.tsx
import { Suspense } from 'react'
import { Spiceflow } from 'spiceflow'
import { RemoteComponent } from 'spiceflow/react'

const REMOTE = process.env.REMOTE_ORIGIN || 'http://localhost:3001'

export const app = new Spiceflow()
  .page('/', async () => (
    <div>
      <Suspense fallback={<div>Loading chart...</div>}>
        <RemoteComponent src={`${REMOTE}/api/chart`} />
      </Suspense>
      <Suspense fallback={<div>Loading table...</div>}>
        <RemoteComponent src={`${REMOTE}/api/table`} />
      </Suspense>
    </div>
  ))
```

The remote components are SSR-rendered in the host's HTML stream, then hydrated on the client with full interactivity. CSS from the remote is automatically injected.

<details>
<summary>How federation works under the hood</summary>

The remote's `renderComponentPayload` produces a JSON response containing:
- **flightPayload** — the RSC Flight stream (serialized React tree)
- **ssrHtml** — pre-rendered HTML for instant display
- **clientModules** — chunk URLs for client components
- **cssLinks** — stylesheet URLs

The host fetches this JSON, SSR-renders the `ssrHtml` via `dangerouslySetInnerHTML`, then hydrates using `hydrateRoot` to patch the existing DOM in-place (no flash).

**Import map and module deduplication.** Spiceflow automatically injects a `<script type="importmap">` into the HTML with entries for shared modules:

```
react, react-dom, react-dom/client, react/jsx-runtime, spiceflow/react
```

Each entry points to a hashed chunk built from the host app's own dependencies. When a remote component's client code does `import React from 'react'`, the browser resolves it through the import map to the **host's React chunk** — not a separate copy. This is how federation avoids duplicate React instances (which would break hooks and context). The same deduplication works for any module you add via the `importMap` plugin option: if a Framer component does `import { motion } from 'framer-motion'`, and you've mapped `framer-motion` to a local re-export file, the browser loads the host's bundled copy.

This means remote client components can use `useRouterState` from the host and read host-provided React contexts (via `useContextBridge` from [its-fine](https://github.com/pmndrs/its-fine)). External ESM components from esm.sh or Framer also benefit — as long as they externalize `react` (e.g. `https://esm.sh/some-lib?external=react`), the import map resolves the bare specifier to the host's instance and everything just works.

</details>

#### External ESM Components

`RemoteComponent` also works with plain JavaScript modules — any URL that returns `content-type: text/javascript`. The module is dynamically imported in the browser, and its default export (or first function export) is rendered as a React component.

This is useful for loading components from Framer, esm.sh, or any CDN that serves ES modules. ESM components are **client-only** — they render `null` during SSR and load after hydration.

Framer components import bare specifiers like `framer` and `framer-motion`. These need to be in the browser's import map so the dynamic `import()` can resolve them. Use the `importMap` option in your Vite config to point these specifiers to local re-export files — this way the browser uses the same bundled instance as your host app (deduplication):

```ts
// vite.config.ts
import { spiceflowPlugin } from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    spiceflowPlugin({
      entry: './app/main.tsx',
      importMap: {
        'framer-motion': './app/shared/framer-motion.ts',
        'framer': './app/shared/framer.ts',
      },
    }),
  ],
})
```

```ts
// app/shared/framer-motion.ts
export * from 'framer-motion'
```

```ts
// app/shared/framer.ts
export * from 'framer'
```

Each local file is built into a hashed chunk — the same pattern spiceflow uses internally for React and `spiceflow/react`. If you prefer loading from a CDN instead, pass a URL:

```ts
importMap: {
  'framer-motion': 'https://esm.sh/framer-motion?external=react',
  'framer': 'https://esm.sh/unframer@latest/esm/framer.js?external=react',
}
```

These entries are merged into the auto-generated import map that spiceflow already injects for `react`, `react-dom`, `react/jsx-runtime`, and `spiceflow/react`.

## Model Context Protocol (MCP)

Spiceflow includes a Model Context Protocol (MCP) plugin that exposes your API routes as tools and resources that can be used by AI language models like Claude. The MCP plugin makes it easy to let AI assistants interact with your API endpoints in a controlled way.

When you mount the MCP plugin (default path is `/mcp`), it automatically:

- Exposes all your routes as callable tools with proper input validation
- Exposes GET routes without query/path parameters as `resources`
- Provides an SSE-based transport for real-time communication
- Handles serialization of requests and responses

This makes it simple to let AI models like Claude discover and call your API endpoints programmatically.

### Basic MCP Usage

Here's an example:

```tsx
// Import the MCP plugin and client
import { mcp } from 'spiceflow/mcp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { Spiceflow } from 'spiceflow'
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Create a new app with some example routes
export const app = new Spiceflow()
  // Mount the MCP plugin at /mcp (default path)
  .use(mcp())
  // These routes will be available as tools
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello World'
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
    method: 'POST',
    path: '/echo',
    async handler({ request }) {
      const body = await request.json()
      return body
    },
  })

// Start the server
app.listen(3000)

// Example client usage:
const transport = new SSEClientTransport(new URL('http://localhost:3000/mcp'))

const client = new Client(
  { name: 'example-client', version: '1.0.0' },
  { capabilities: {} },
)

await client.connect(transport)

// List available tools
const tools = await client.request(
  { method: 'tools/list' },
  ListToolsResultSchema,
)

// Call a tool
const result = await client.request(
  {
    method: 'tools/call',
    params: {
      name: 'GET /hello',
      arguments: {},
    },
  },
  CallToolResultSchema,
)

// List available resources (only GET /hello is exposed since it has no params)
const resources = await client.request(
  { method: 'resources/list' },
  ListResourcesResultSchema,
)
```

### Existing MCP Servers

If you already have an existing MCP server and want to add Spiceflow route tools to it, use the `addMcpTools` helper function:

```ts
import { addMcpTools } from 'spiceflow/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { Spiceflow } from 'spiceflow'

// Your existing MCP server
const existingServer = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } },
)

// Your Spiceflow app
export const app = new Spiceflow()
  .use(mcp()) // Required for MCP configuration
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello from Spiceflow!'
    },
  })

// Add Spiceflow tools to your existing server
const mcpServer = await addMcpTools({
  mcpServer: existingServer,
  app,
  ignorePaths: ['/mcp', '/sse'],
})

// Now your existing server has access to all Spiceflow routes as tools
```

## KV Page Caching

Use middleware to cache full-page HTML in Cloudflare KV. The deployment ID is included in the cache key so each deploy gets its own cache namespace — this prevents serving stale HTML that references old CSS/JS filenames with different content hashes.

This example uses `import { env } from 'cloudflare:workers'` to access KV bindings directly from anywhere in your code, without threading env through `.state()`.

```tsx
import { Spiceflow, getDeploymentId } from 'spiceflow'
import { env } from 'cloudflare:workers'

export const app = new Spiceflow()
  .use(async ({ request, waitUntil }, next) => {
    if (request.method !== 'GET') {
      return next()
    }

    const url = new URL(request.url)
    const deploymentId = await getDeploymentId()
    const cacheKey = `${deploymentId}:${url.pathname}${url.search}` // IMPORTANT. cache key must always include search to distinguish html and rsc responses

    const cached = await env.PAGE_CACHE.get(cacheKey)
    if (cached) {
      return new Response(cached, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-cache': 'HIT',
        },
      })
    }

    const response = await next()
    if (!response || response.status !== 200) {
      return response
    }

    const html = await response.text()
    // Write to KV in the background so the response is not delayed
    waitUntil(
      env.PAGE_CACHE.put(cacheKey, html, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      }),
    )

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-cache': 'MISS',
      },
    })
  })
  .page('/', async () => {
    return (
      <div>
        <h1>Home</h1>
      </div>
    )
  })

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

When a new version is deployed the build timestamp changes, so `getDeploymentId()` returns a different value and all cache keys are effectively new. Old entries expire naturally after 7 days.

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

The build output is self-contained — `dist/` includes all traced runtime dependencies in `dist/node_modules/`, so you can copy it directly into a Docker image without installing packages at deploy time. The dependency tracing uses `@vercel/nft` to find exactly which files from `node_modules/` are needed at runtime, copying only those into `dist/node_modules/`. This keeps the image small — typically 5-50MB of dependencies instead of hundreds of megabytes. On Vercel and Cloudflare, this step is skipped since those platforms have their own bundling.

The traced `dist/node_modules/` comes from whatever is currently installed in your local `node_modules/` at build time. NFT copies those files directly — no `npm install` runs during the Docker build.

<details>
<summary>Cross-platform native modules</summary>

Package managers only install native modules for your current OS and CPU by default. If you develop on macOS and deploy to Linux (Docker), native packages like `esbuild`, `@swc/core`, or `lightningcss` will be macOS binaries and won't work in the container. You must install dependencies for all platforms **before** running `build`.

Install the Linux native modules before building. Both pnpm and bun `--os`/`--cpu` flags are additive — they keep your current platform and add the target:

```bash
# pnpm
pnpm install --os linux --cpu x64

# bun
bun install --os linux --cpu x64
```

Then run the build:

```bash
pnpm build
```

You can add a convenience script in `package.json` so you don't forget this step:

```jsonc
{
  "scripts": {
    // installs linux native modules alongside current platform, then builds
    "build:docker": "pnpm install --os linux --cpu x64 && pnpm build"
  }
}
```

</details>

Example Dockerfile using `node:24-slim`:

```dockerfile
FROM --platform=linux/amd64 node:24-slim

WORKDIR /app

# IMPORTANT: Before building, install Linux native modules (both flags are
# additive — they keep your current platform and add the target):
#   pnpm install --os linux --cpu x64
#   bun install --os linux --cpu x64

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3000
CMD ["node", "dist/rsc/index.js"]
```

```bash
docker build --platform linux/amd64 -t my-app .
docker run -p 3000:3000 my-app
```

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
