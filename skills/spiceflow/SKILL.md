---
name: spiceflow
description: 'Spiceflow is a super simple, fast, and type-safe API and React Server Components framework for TypeScript. Works on Node.js, Bun, and Cloudflare Workers. Use this skill whenever working with spiceflow to get the latest docs and API reference.'
---

# Spiceflow

Every time you work with spiceflow, you MUST fetch the latest README from the main branch. If that README references relevant subdocuments, you MUST fetch those too:

```bash
curl -s https://raw.githubusercontent.com/remorses/spiceflow/main/README.md # NEVER pipe to head/tail, read the full output

# Always read the typed fetch client doc when using createSpiceflowFetch
curl -s https://raw.githubusercontent.com/remorses/spiceflow/main/docs/fetch-client.md
```

NEVER use `head`, `tail`, or any other command to truncate the output. Read the full README every time, then read any referenced subdocuments that are relevant to the task. They contain API details, examples, and framework conventions that are easy to miss if you only read the top-level README.

## Testing spiceflow apps

Before writing any vitest tests for a spiceflow app, ALWAYS read the testing guide first:

```bash
curl -s https://raw.githubusercontent.com/remorses/spiceflow/main/docs/testing.md
```

It covers setup, API route testing, page route testing, server actions, `createTestTracer` for span snapshots, HTML formatting with posthtml, DI with `.state()`, and better-auth integration patterns.

Reference examples for real-world usage:

- **[example-vitest](https://github.com/remorses/spiceflow/tree/main/example-vitest)** — tests API routes, page routes, server actions, DI with state, tracing spans, and HTML snapshot formatting
- **[example-vitest-cloudflare](https://github.com/remorses/spiceflow/tree/main/example-vitest-cloudflare)** — tests running inside Cloudflare Workers runtime (workerd) via `@cloudflare/vitest-pool-workers`, covering D1 database, KV, and `cloudflare:workers` APIs

## Client navigation links

Always import and use `Link` from `spiceflow/react` for navigational links in Spiceflow apps. Do not render raw `<a>` elements for links. `Link` enables client-side navigation while preserving normal anchor behavior for external URLs, hashes, `target`, `rel`, styling, and event handlers. `Link` supports external URLs too, so it is fine to use for ambiguous or user-provided links when you do not know ahead of time whether they are internal or external.

## OpenTelemetry instrumentation

Spiceflow supports automatic route instrumentation when you pass an OpenTelemetry-compatible tracer to the constructor:

```ts
import { trace } from '@opentelemetry/api'
import { Spiceflow } from 'spiceflow'

const tracer = trace.getTracer('my-app')

export const app = new Spiceflow({ tracer })
  .get('/hello', ({ span }) => {
    span.setAttribute('app.route', '/hello')
    return { hello: 'world' }
  })
```

When a project uses Strada for observability, read `docs/strada.md` and pass Strada's re-exported `trace` API to Spiceflow so spans go through the configured provider.

Always pass a tracer for production Spiceflow apps unless there is a specific reason not to. The handler context then exposes `span` and `tracer`, so route code can add attributes or create child spans without manual request wrappers.

## Typed fetch client rules

When using the typed fetch client (`createSpiceflowFetch`), follow these rules:

- **Use `:param` paths with a `params` object.** Never interpolate IDs into the path string. `` `/users/${id}` `` is just `string` and breaks all type inference.
- **All packages in a monorepo must use the exact same spiceflow version.** Mismatched versions cause `Types have separate declarations of a private property` errors. Use `pnpm update -r spiceflow` (without `--latest`) to sync.
- **Import API types from source files, not `dist/*.d.ts`.** Use `import type { App } from "website/src/server.tsx"`. This avoids build-order dependencies (server doesn't need to build before client can typecheck). If tsc fails on unresolvable modules in the server's transitive imports (like `cloudflare:workers`, CSS, etc.), add a small ambient `.d.ts` stub in the client package.
- **Use `import type` for cross-workspace API types.** Never value-import the server app just to get fetch client typing.
- **Keep the server package as a `devDependency`** of the client package for typechecking.
- **Route handlers must return plain objects** for the response type to be inferred. Returning `res.json()` or `Response.json()` erases the type to `any`.
- **Never `return new Response(...)`.** It erases the body type. Use `return json(...)` (preserves type and status) or `throw` anything (`throw new Response(...)` is fine since throws don't affect return type).
- **`body` is a plain object**, not `JSON.stringify()`. The client serializes it automatically.
- **Response is `Error | Data`.** Check with `instanceof Error`, then the happy path has the narrowed type.

## Duplicate spiceflow in monorepos

Spiceflow must be a single copy in `node_modules`. Duplicates cause type errors (`Types have separate declarations of a private property`) and Vite resolution bugs.

**Always use `-r` (recursive) when updating spiceflow in a monorepo:**

```bash
# pnpm
pnpm update -r spiceflow

# npm
npm update spiceflow --workspaces

# bun
bun update -r spiceflow
```

**When you hit weird type errors or Vite/spiceflow resolution issues, deduplicate first:**

```bash
# pnpm
pnpm dedupe

# npm
npm dedupe --workspaces

# bun (re-install deduplicates automatically)
bun install
```

## Security: server actions and routes are public endpoints

Server actions (`"use server"`) are **public POST endpoints**. Any HTTP client can call them directly, not just the app's own browser. CSRF protection (Origin header check) blocks cross-site form submissions but does NOT authenticate the caller. Every server action that mutates data, creates resources, or reads user-specific data MUST authenticate and authorize the request explicitly, for example by reading a session from cookies or a bearer token from headers. The same rule applies to all API routes (`.get()`, `.post()`, etc.) and middleware that modifies state.

```tsx
'use server'

import { getActionRequest } from 'spiceflow'
import { getUser } from './auth'

export async function deleteProject(id: string) {
  const { request } = getActionRequest()
  const user = await getUser(request)
  if (!user) throw new Error('Not authenticated')
  if (!user.canDelete(id)) throw new Error('Not authorized')
  await db.project.delete({ where: { id } })
}
```

Never assume a server action is only reachable through your own UI. Treat every server action like a public API endpoint.

## Router usage in app entry handlers

`router` from `spiceflow/react` is typed from the globally registered `typeof app`. Do **not** use `router` inside `.loader()`, `.get()`, `.post()`, or `.route()` handlers in the same file that initializes `export const app = new Spiceflow()`. Those handlers feed return types back into `typeof app` through loader data or typed API responses, so `router.href()` can create recursive circular TypeScript errors such as TS7022.

`router.href()` is okay in components, other modules, and for JSX links inside `.page()` / `.layout()` handlers because rendered page/layout JSX is not part of the app metadata. If a loader-heavy app still hits a circular `typeof app` error from page/layout usage, move the link UI into a component module. Context `redirect()` intentionally accepts a plain `string`; do not pass `router.href()` into redirects inside app-entry handlers because redirect return values participate in handler return inference and can reintroduce the cycle.
