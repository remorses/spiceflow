---
name: spiceflow
description: 'Spiceflow is a super simple, fast, and type-safe API and React Server Components framework for TypeScript. Works on Node.js, Bun, and Cloudflare Workers. ALWAYS load this skill BEFORE writing or editing ANY spiceflow code, including one-line changes: routes, pages, layouts, loaders, server actions, forms, ErrorBoundary, redirects, cookies, navigation, Link, router, ProgressBar, the typed fetch client, middleware, and OpenAPI. A project uses spiceflow if anything imports from "spiceflow" or "spiceflow/react", or constructs new Spiceflow(). The API is small but very opinionated and the opinions are NOT guessable; writing spiceflow code from memory or from what looks like Next.js produces wrong code every time.'
---

# Spiceflow

A project uses spiceflow if anything imports from `spiceflow` or `spiceflow/react`, or constructs `new Spiceflow()`. The API surface is small but **very opinionated**, and the opinions are NOT guessable. Every framework has its own answer for forms, pending state, error display, and redirects; spiceflow's answers are frequently different from Next.js and from React defaults. Writing spiceflow code from memory, or from what "looks like Next.js", produces wrong code every time.

## How the docs work

Documentation lives at **https://getspiceflow.com**. Append `.md` to any page URL to get raw markdown. Fetch the docs index first if you have not read it this session:

```bash
curl -s https://getspiceflow.com/llms.txt
```

`https://getspiceflow.com/llms-full.txt` contains every doc in one file, and `https://getspiceflow.com/docs.zip` downloads all markdown files for local grepping.

Read every fetched doc **completely, with no truncation**. Never pipe to `head`, `tail`, or `sed`. Source code and runnable examples (`example-*` folders) live in the repo: https://github.com/remorses/spiceflow — read the code there when the docs are not enough.

## ALWAYS read the feature doc before writing code

Before touching code for a feature, fetch its doc in full. One page per branch:

| Task | Fetch |
| --- | --- |
| API routes, Zod validation, `json()`, typed errors, middleware, `serveStatic`, CORS, streaming/SSE, `.onError()`, `listen()`, Node adapters, Next.js mount, `waitUntil`, base path, class instances | https://getspiceflow.com/api.md |
| Typed fetch client (`createSpiceflowFetch`), WebMCP | https://getspiceflow.com/fetch-client.md |
| OpenAPI generation | https://getspiceflow.com/openapi.md |
| MCP tools | https://getspiceflow.com/mcp.md |
| Tracing / OpenTelemetry | https://getspiceflow.com/tracing.md (Strada projects: https://getspiceflow.com/strada.md) |
| Custom serialization (`Date`, `Map`, `Set`, `BigInt`) | https://getspiceflow.com/custom-serialization.md |
| RSC setup, Tailwind, shadcn, app entry, layouts, `<Head>` SEO, query params, `"use client"` components, code splitting, `router`, `Link`, redirects, `ProgressBar`, 404 pages | https://getspiceflow.com/react.md |
| Loaders, `useLoaderData`, streaming with `use()`, forms, server actions, `parseFormData`, `useActionState`, `ErrorBoundary` | https://getspiceflow.com/react-data.md |
| `SpiceflowRegister`, `knownPaths`, multi-app workspaces, circular TS7022 errors | https://getspiceflow.com/type-safety.md |
| Federation / remote components | https://getspiceflow.com/federation.md |
| Auth middleware, proxying, cookies, graceful shutdown | https://getspiceflow.com/middleware-patterns.md |
| Securing actions and routes | https://getspiceflow.com/security.md |
| Migrating from Remix / React Router | https://getspiceflow.com/migrate-from-remix.md |
| Cloudflare Workers (setup, bindings, KV caching, edge cache) | https://getspiceflow.com/cloudflare.md |
| Deploy skew, cross-deployment behavior | https://getspiceflow.com/deployment-skew.md |
| Service bindings | https://getspiceflow.com/service-bindings.md |
| Docker | https://getspiceflow.com/docker.md |
| Dependency crashes with `useState is undefined` at startup | https://github.com/remorses/spiceflow/blob/main/docs/use-client-trap.md |

## Testing spiceflow apps

Before writing any vitest tests for a spiceflow app, ALWAYS read the testing guide first:

```bash
curl -s https://getspiceflow.com/testing.md
```

Reference examples: [example-vitest](https://github.com/remorses/spiceflow/tree/main/example-vitest) (API routes, pages, actions, DI, tracing spans) and [example-vitest-cloudflare](https://github.com/remorses/spiceflow/tree/main/example-vitest-cloudflare) (tests inside workerd with D1 and KV).

## Non-negotiable rules

These are the landmines that break apps when guessed. Each links to its full doc.

- **Always use `Link` from `spiceflow/react`, never raw `<a>`, for links.** `Link` auto-prepends the Vite `base` path; never prepend it manually. Raw `fetch()` and `Response.redirect()` still need manual base handling. → [navigation](https://getspiceflow.com/react.md)
- **`<Head>` is server-only.** It records children during the RSC render; a `'use client'` module never runs there, so a `<Head>` inside one contributes nothing (and importing it fails the build). Put `<Head>` in `.page()` / `.layout()` handlers. Use `document.title` in an effect for client-side title changes. → [pages & layouts](https://getspiceflow.com/react.md)
- **Always `throw redirect(...)`, never `return redirect(...)`.** Applies to `.page()`, `.layout()`, `.loader()`, `.get()`, `.post()`, server actions, and middleware. → [navigation](https://getspiceflow.com/react.md)
- **Never call `router.refresh()` after a server action.** Successful actions already re-run loaders and reconcile the page. All navigation and refresh methods are fire-and-forget; never await a navigation commit inside a React form action (it can deadlock). → [forms & actions](https://getspiceflow.com/react-data.md)
- **Server actions and API routes are public endpoints.** CSRF Origin checks do not authenticate the caller; every mutating action must read and verify a session or token itself via `getActionRequest()`. → [security](https://getspiceflow.com/security.md)
- **Typed fetch client:** use `:param` paths with a `params` object (never interpolate IDs), return plain objects or `json(...)` from handlers (never `return new Response(...)`), pass `body` as a plain object, and check results with `instanceof Error`. → [fetch client](https://getspiceflow.com/fetch-client.md)
- **Pass an OTel tracer in production apps** (`new Spiceflow({ tracer })`) so handlers get `span` and `tracer` on the context. → [tracing](https://getspiceflow.com/tracing.md)
- **One spiceflow copy per monorepo.** Mismatched or duplicated versions cause `Types have separate declarations of a private property`. Fix with `pnpm update -r spiceflow` then `pnpm dedupe` (or `npm update spiceflow --workspaces` / `bun update -r spiceflow`). → [fetch client](https://getspiceflow.com/fetch-client.md)
- **Circular TS7022 errors** happen when a `SpiceflowRegister`-typed API (`router.href()`, `createSpiceflowFetch()`, `useLoaderData()`) appears in a handler **return value** in the app entry. JSX, `throw`, event handlers, and separate files are always safe. → [type safety](https://getspiceflow.com/type-safety.md)
- **Always 301 `www` to the apex in one hop** on new custom-domain sites. Point `www.example.com` at the same Cloudflare worker (`custom_domain`). Redirect `www` → `https://example.com` + path + query with status **301**. Never leave www on Vercel/Pages. Never use 307. Never chain `http://www` → `https://www` → apex.

```ts
.use(({ request }, next) => {
  const url = new URL(request.url)
  if (!url.hostname.startsWith('www.')) return next()
  url.hostname = url.hostname.slice('www.'.length)
  url.protocol = 'https:'
  throw redirect(url.toString(), { status: 301 })
})
```
