<div align='center' className='hidden w-full'>
    <br/>
    <br/>
    <br/>
    <h1>spiceflow</h1>
    <p>type safe API and React Server Components framework for Node, Bun, and Cloudflare</p>
    <br/>
    <br/>
</div>

Spiceflow is a type-safe API framework and full-stack React RSC framework focused on absolute simplicity. It works across all JavaScript runtimes: Node.js, Bun, and Cloudflare Workers. Read the source code on [GitHub](https://github.com/remorses/spiceflow). Full documentation lives at [getspiceflow.com](https://getspiceflow.com).

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

> [!IMPORTANT]
> Spiceflow is still in pre-release. Install with `spiceflow@rsc`, not `spiceflow@latest`.

## AI Agents

To let your AI coding agent know how to use spiceflow, run:

```bash
npx -y skills add remorses/spiceflow
```

Every documentation page is also available as raw markdown: append `.md` to any [getspiceflow.com](https://getspiceflow.com) URL, for example `https://getspiceflow.com/react-data.md`.

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

## How a Spiceflow App Works

Everything is one chained expression on a single `Spiceflow` instance: API routes, middleware, loaders, layouts, and pages. The chain is the source of truth for both runtime routing and TypeScript inference — the typed fetch client, `router.href()`, and `useLoaderData()` all read their types from `typeof app`.

```diagram
                       new Spiceflow()  ──  one chain, one type
                              │
        ┌─────────────────────┼──────────────────────┐
        v                     v                      v
   .get / .post          .use(middleware)      .loader / .layout / .page
   .route (Zod)          serveStatic, cors     React Server Components
   JSON + SSE APIs       mounted sub-apps      server actions, client chunks
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              v
              app.listen(3000)  /  app.handle(request)
           Node.js  <──────>  Bun  <──────>  Cloudflare Workers
```

For the React side, Vite builds three environments from the same entry: **rsc** (server components and actions), **ssr** (HTML rendering), and **client** (hydration and navigation). Every `"use client"` file automatically becomes its own browser chunk. Server actions marked `"use server"` become POST endpoints that re-render the page with fresh data after they run.

A realistic app entry looks like this:

```tsx
// src/main.tsx
import { Spiceflow, parseFormData } from 'spiceflow'
import { Head, Link, router } from 'spiceflow/react'
import { z } from 'zod'
import { Counter } from './app/counter'

export const app = new Spiceflow()
  .get('/api/hello', () => ({ message: 'Hello!' }))
  .loader('/dashboard/*', async ({ request }) => {
    const user = await getUser(request)
    return { user }
  })
  .layout('/*', async ({ children }) => {
    return (
      <html>
        <Head>
          <Head.Meta charSet="UTF-8" />
        </Head>
        <body>{children}</body>
      </html>
    )
  })
  .page('/dashboard', async ({ loaderData }) => {
    return (
      <div>
        <h1>Welcome {loaderData.user.name}</h1>
        <Counter />
        <Link href={router.href('/')}>Home</Link>
      </div>
    )
  })
  .listen(3000)

// Register the app type for type-safe routing everywhere
declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
```

## Documentation

The README is only an overview. The full documentation is split into feature docs — **always read the doc for the feature you are working on before writing code**. The API is small but opinionated, and the opinions are not guessable from other frameworks.

### API framework

| When you work on                                                                                                                                                          | Read                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Routes, Zod validation, typed errors, middleware, static files, CORS, streaming/SSE, `.onError()`, `listen()`, `waitUntil`, Node.js adapters, Next.js mounting, base path | [API Framework](./website/src/api.md)                                     |
| Calling the API with the typed fetch client, WebMCP browser tools                                                                                                         | [Fetch Client](./website/src/fetch-client.md)                             |
| Generating OpenAPI documents, response maps, hiding routes                                                                                                                | [OpenAPI](./website/src/openapi.md)                                       |
| Exposing routes as LLM tools over Model Context Protocol                                                                                                                  | [MCP](./website/src/mcp.md)                                               |
| OpenTelemetry spans, Server-Timing, custom tracers                                                                                                                        | [Tracing](./website/src/tracing.md) and [Strada](./website/src/strada.md) |
| Sending non-JSON types (`Date`, `Map`, `Set`, `BigInt`) over the wire                                                                                                     | [Custom Serialization](./website/src/custom-serialization.md)             |

### React framework (RSC)

| When you work on                                                                                                                                           | Read                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Vite setup, Tailwind, shadcn/ui, app entry, layouts, `<Head>` SEO, query params, client components, code splitting, `router`, `Link`, redirects, 404 pages | [React Framework](./website/src/react.md)         |
| Loaders, `useLoaderData`, streaming with `use()`, forms, server actions, `parseFormData`, `useActionState`, `ErrorBoundary`                                | [Data & Actions](./website/src/react-data.md)     |
| The `SpiceflowRegister` type registry, `knownPaths`, multi-app workspaces                                                                                  | [Type-Safe Routing](./website/src/type-safety.md) |
| Rendering remote components from another server                                                                                                            | [Federation](./website/src/federation.md)         |

### Guides

| When you work on                                                                 | Read                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Writing vitest tests for routes, pages, and server actions                       | [Testing](./website/src/testing.md)                         |
| Auth middleware, proxying, non-blocking auth, cookie patterns, graceful shutdown | [Middleware Patterns](./website/src/middleware-patterns.md) |
| Authenticating server actions and routes — they are public endpoints             | [Security](./website/src/security.md)                       |
| Porting an app from Remix or React Router                                        | [Migrate from Remix](./website/src/migrate-from-remix.md)   |
| Installing and structuring shadcn/ui components                                  | [shadcn/ui](./website/src/shadcn.md)                        |
| A dependency crashing with `useState is undefined` at startup                    | [use client trap](./docs/use-client-trap.md)                |

### Deployment

| When you deploy to                                                       | Read                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| Cloudflare Workers: setup, bindings, `waitUntil`, KV caching, edge cache | [Cloudflare](./website/src/cloudflare.md)             |
| Any host, to understand what happens across deploys                      | [Deployment Skew](./website/src/deployment-skew.md)   |
| Cloudflare service bindings between Workers                              | [Service Bindings](./website/src/service-bindings.md) |
| Docker or any container platform                                         | [Docker](./website/src/docker.md)                     |

## Testing

Test your spiceflow app directly with vitest. No browser, no build step, sub-second feedback. Call the app through the typed fetch client, call server actions as plain functions, and assert on responses:

```ts
import { createSpiceflowFetch } from 'spiceflow/client'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app } from './main.js'

const f = createSpiceflowFetch(app)

// API routes return typed JSON
const data = await f('/api/hello')
expect(data).toEqual({ message: 'Hello, World!' })

// Page routes return SpiceflowTestResponse with rendered HTML
const res = await f('/about')
if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected page')
expect(await res.text()).toContain('About')
```

The spiceflow Vite plugin auto-detects vitest and configures everything. See the [Testing guide](./website/src/testing.md) for authentication patterns, stateful workflows, and dependency injection.

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
