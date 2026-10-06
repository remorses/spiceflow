---
$schema: https://holocron.so/frontmatter.json
title: "Compared with Next.js, Hono, and Elysia"
sidebarTitle: Comparisons
description: "How Spiceflow compares to Next.js App Router, Hono, and Elysia. Same stack for APIs and full React RSC apps, with a simpler request model."
icon: "lucide:git-compare"
prompt: |
  Write framework comparisons from @/README.md, @/website/src/react.md,
  @/website/src/api.md, and @/website/src/type-safety.md.
  Cover Next.js App Router, Hono, and Elysia. Stress that Spiceflow is a
  full React RSC framework, not only an API layer. For Next.js: no file-based
  page routing, more flexible route registration, more type safety, no App
  Router cache or render-mode constraints, every request re-runs matching
  layouts.
---

# Compared with Next.js, Hono, and Elysia

Spiceflow is both a **type-safe API framework** and a **full-stack React RSC framework**. Hono and Elysia stop at HTTP. Next.js is a React app framework with a different routing and caching model. Use this page when you are choosing between them.

```diagram
┌──────────────────┐      ┌────────────────────────┐      ┌───────────────────────┐
│ Hono / Elysia    │      │ Spiceflow              │      │ Next.js App Router    │
│ HTTP APIs        │      │ APIs + React RSC       │      │ File-system React app │
└────────┬─────────┘      └────────────┬───────────┘      └───────────┬───────────┘
         │                             │                              │
         v                             v                              v
 JSON routes, middleware     .get .page .layout .loader     app/**/page.tsx
                             server actions, Link            force-dynamic, cache, PPR
                             Node, Bun, Cloudflare
```

## Next.js App Router

Next.js is the closest comparison on the React side. Spiceflow also ships **React Server Components**, **server actions**, **layouts**, and **client navigation**. The mental model is different.

**No file-based page routing.** Routes are methods on one `Spiceflow` instance. You choose the path. You can colocate an API route and a page, mount a sub-app, or generate routes in a loop. There is no `app/` directory, no `page.tsx` / `layout.tsx` filename contract, and no parallel-route or intercepting-route conventions.

```tsx
export const app = new Spiceflow()
  .get('/api/hello', () => ({ message: 'Hello' }))
  .layout('/*', async ({ children }) => (
    <html>
      <body>{children}</body>
    </html>
  ))
  .page('/', async () => <Home />)
  .page('/posts/:slug', async ({ params }) => <Post slug={params.slug} />)
```

**More flexible.** A route is just a function. Mix JSON APIs, HTML pages, SSE streams, and MCP tools on the same app. Mount another Spiceflow app with `.use()`. That is awkward in App Router, where API routes, pages, and middleware live in separate file conventions.

**More type safety.** `declare module 'spiceflow/react'` registers `typeof app`. Then `router.href()`, `<Link>`, `useLoaderData()`, and `createSpiceflowFetch()` all infer paths, params, query, and response types. Next.js does not type your route table. A renamed `page.tsx` does not fail `tsc` at every stale `<Link href>`.

**No App Router cache or render-mode maze.** There is no `dynamic`, `revalidate`, `fetch` cache, `unstable_cache`, `noStore`, `cookies()` opting a tree into dynamic rendering, or "this component is static except when a child is dynamic." You do not pick RSC payload cache vs full route cache vs data cache.

**Every request re-runs matching layouts.** A GET to `/dashboard/settings` runs the matching loaders, then the matching layouts, then the page. The next GET does the same. Client navigations refetch RSC for the new path. Server actions re-render the current page. There is no hidden static shell that later becomes dynamic.

That is simpler to reason about:

```diagram
request ──> loaders ──> layouts ──> page ──> HTML or RSC
   │
   └──> every stage runs for this request
        no static/dynamic split, no segment cache, no PPR puzzle
```

Other Next.js differences:

- **Same code on Node, Bun, and Cloudflare Workers.** Next.js is built around Node and its own bundler. Spiceflow is Vite plus web `Request` / `Response`.
- **APIs and pages share one router.** In Next you split `app/api` route handlers from `page.tsx`. In Spiceflow both are methods on the same app, so the typed client covers HTML and JSON.
- **Explicit layouts, not folder nesting.** `.layout('/app/*', ...)` wraps that prefix. You see the tree in the chain instead of inferring it from directories.
- **Loaders are first-class.** `.loader()` returns typed data for pages and `useLoaderData()`. You do not thread `fetch` through server components and hope the cache dedupes it.
- **HTTP status codes are real.** `throw redirect('/login')` is a 307 with `Location`. `response.status = 404` is a 404. App Router often returns 200 HTML for redirects and not-found UI.
- **No `'use cache'`, `'use server'` boundary puzzles beyond the usual RSC split.** `"use client"` and `"use server"` still exist. There is no extra cache directive layer.
- **Vite, not Turbopack or webpack.** HMR, plugins, and Cloudflare's Vite plugin work the way other Vite apps do.
- **OpenAPI, MCP, and SSE are built in.** Next does not generate an API spec from your route table.

Spiceflow does **not** try to copy Next's content platform: no built-in image optimizer, no `next/font`, no ISR, no PPR. If you need those, Next still fits. If you want a React RSC app you can hold in your head, Spiceflow is the simpler model.

## Hono

Hono is a small HTTP framework with great middleware and Cloudflare support. Spiceflow shares the **web `Request` / `Response`** style, then goes further.

- **Full React RSC apps**, not only APIs. Hono can render JSX in some setups. It is not a React framework with server components, client navigation, loaders, and server actions.
- **First-class OpenAPI.** Add the `openapi` plugin and the spec is derived from your routes. You do not rewrite handlers with a separate OpenAPI wrapper.
- **Simpler surface.** Handlers use native `Request` and `Response`. There is no `c.text()`, `c.json()`, or `c.req` helper object.
- **Async generators as SSE.** `yield` in a handler streams Server-Sent Events. No extra SSE helper.
- **Zod on the route**, not a `validator()` wrapper that slows TypeScript. `.route({ request, query, params })` is the schema.
- **Faster RPC client inference.** Intellisense on `createSpiceflowFetch()` shows up in milliseconds, not seconds.
- **One type for the whole app.** Pages, loaders, and API routes all feed `SpiceflowRegister`. Hono's RPC client types APIs only.
- **Layouts, `Link`, and `router.href()`.** Hono has no typed app router for HTML.
- **Vite RSC plugin.** Hono + Vite is an API or SSR adapter. Spiceflow's plugin builds rsc, ssr, and client environments from one entry.
- **Same Worker story.** Both run on Cloudflare. Spiceflow also owns the React tree on that Worker.

Use Hono when you want a tiny API or you already have a separate frontend. Use Spiceflow when the API and the React app should be the same program.

## Elysia

Spiceflow started as a **fork of Elysia**, then replaced the parts that made the framework hard to change.

- **Zod instead of TypeBox.** Schema validation uses the library most TypeScript apps already have.
- **No AOT `new Function()` compile.** Elysia generates the app with `eval` / `new Function()`, which [causes bugs](https://github.com/elysiajs/elysia/pull/773) and makes the codebase hard to contribute to. Spiceflow is plain functions over a route tree.
- **Better async generators.** Streaming uses SSE instead of a custom generator protocol.
- **Full React RSC framework.** Elysia is an API framework (Eden Treaty, OpenAPI, plugins). It does not ship pages, layouts, server actions, or a Vite RSC plugin.
- **Cloudflare and Node as first-class targets**, not Bun-first with adapters bolted on.
- **Typed HTML routing.** `router.href('/posts/:slug', { slug })` is checked against the same app that serves `/posts/:slug`.
- **Server actions and forms.** `"use server"` functions are POST endpoints that re-render the page. Elysia has no equivalent.
- **Loaders.** Request-scoped data for a path prefix, available in server and client components.
- **Federation.** One Spiceflow app can render RSC from another origin. That is a React feature, not an HTTP feature.

If you like Elysia's chain API and want React on top, Spiceflow is that chain plus RSC.

## What only Spiceflow combines

| Capability                       | Spiceflow | Next.js | Hono  | Elysia  |
| -------------------------------- | --------- | ------- | ----- | ------- |
| Type-safe HTTP API               | Yes       | Partial | Yes   | Yes     |
| OpenAPI from the route table     | Yes       | No      | Extra | Yes     |
| MCP tools from routes            | Yes       | No      | No    | No      |
| React Server Components          | Yes       | Yes     | No    | No      |
| Server actions that re-render    | Yes       | Yes     | No    | No      |
| Explicit `.page()` / `.layout()` | Yes       | Files   | No    | No      |
| Typed `router.href()` / `Link`   | Yes       | No      | No    | No      |
| Every request re-runs layouts    | Yes       | No      | n/a   | n/a     |
| No App Router cache model        | Yes       | No      | n/a   | n/a     |
| Node, Bun, Cloudflare, same code | Yes       | Partial | Yes   | Partial |

The short version: **Hono and Elysia are APIs. Next.js is a React platform with a cache-heavy App Router. Spiceflow is a full React RSC app and a type-safe API in one chain, and every request just runs the matching layouts again.**
