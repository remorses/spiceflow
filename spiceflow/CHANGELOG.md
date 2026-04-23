# spiceflow

## 1.19.0-rsc.5

1. **Automatic `waitUntil` on Cloudflare Workers** — Spiceflow now auto-detects `waitUntil` from `cloudflare:workers` via a conditional package.json import map (`#wait-until`). No need to pass `waitUntil` in the constructor; background work scheduled via `context.waitUntil()` is forwarded to the Cloudflare execution context automatically. On Node.js and Bun, the default runs promises in the background with safe rejection handling so they don't crash the process.

2. **Resolved path type inference in `createSpiceflowFetch()`** — typed fetch calls now accept interpolated route strings like `` `/users/${id}` `` while preserving route-specific request and response inference. Previously only pattern-form paths like `/users/:id` were type-safe.

3. **Shorter Server-Timing descriptions in Chrome DevTools** — child spans no longer repeat the root request prefix on every row, making the waterfall easier to scan.

## 1.19.0-rsc.4

1. **`serverTiming: true` for Chrome DevTools** — add `serverTiming: true` alongside `tracer` to expose request spans as a `Server-Timing` response header. Includes built-in framework spans (middleware, handlers, loaders) and custom spans from `context.tracer.startActiveSpan()`, with nested paths like `GET /users/:id > handler - /users/:id > db.query` so slow queries are visible directly in the browser:

   ```ts
   import { trace } from '@opentelemetry/api'

   export const app = new Spiceflow({
     tracer: trace.getTracer('my-app'),
     serverTiming: true,
   }).get('/api/users/:id', ({ params, tracer }) => {
     return tracer.startActiveSpan('db.query', (span) => {
       span.end()
       return { id: params.id, name: 'Alice' }
     })
   })
   ```

## 1.19.0-rsc.3

1. **Type-safe `href` on `<Link>` via SpiceflowRegister** — when the app type is registered, `Link` autocompletes route paths and requires `params` for dynamic segments like `/users/:id`. Without registration, `href` stays `string` for full backwards compatibility:

   ```tsx
   <Link href="/users/:id" params={{ id: '42' }} />
   ```

2. **Client-safe export for bundler environments** — the `.` export now resolves to a lightweight client-safe subset when bundled in browser or SSR environments, preventing `import.meta.viteRsc.loadCss` from triggering Vite RSC rolldown assertions in non-RSC builds (e.g. Cloudflare with child environments)

## 1.19.0-rsc.2

1. **`parseFormData` for type-safe form validation** — `import { parseFormData } from 'spiceflow'` validates FormData against any Standard Schema (Zod, Valibot, ArkType) with automatic string→number/boolean coercion and `getAll()` support for array fields. Pair with `schema.keyof().enum` for type-safe input `name` attributes — typos become compile errors:

   ```ts
   import { parseFormData } from 'spiceflow'
   import { z } from 'zod'

   const subscribeSchema = z.object({ email: z.string().email() })

   export async function subscribe(_: any, formData: FormData) {
     const { email } = parseFormData(subscribeSchema, formData)
     // email is typed as string, invalid fields throw ValidationError
   }
   ```

2. **`SpiceflowRegister` type registry** — add a single `declare module` at the bottom of your app entry and all typed APIs (`router`, `useLoaderData`, `useRouterState`, `createSpiceflowFetch`) work without generics. No more `<typeof app>` everywhere:

   ```ts
   import { Spiceflow } from 'spiceflow'

   const app = new Spiceflow().page('/', () => <Home />)

   declare module 'spiceflow/react' {
     interface SpiceflowRegister { app: typeof app }
   }
   ```

   Without the declare module, `router` and `useLoaderData()` fall back to accepting any path — zero breaking change, opt-in type safety.

3. **`router` direct import** — `import { router } from 'spiceflow/react'` is now the primary API for type-safe navigation and URL building. `getRouter()` is deprecated in favor of the direct import:

   ```ts
   import { router } from 'spiceflow/react'

   router.push('/dashboard')
   router.href('/users/:id', { id: '42' })
   ```

4. **Absolute URLs in `router.push()`, `router.replace()`, and `Link`** — cross-origin URLs trigger full page navigation (`window.location.assign`), same-origin absolute URLs extract the pathname and continue with normal SPA navigation preserving client state:

   ```ts
   router.push('https://external.com/path') // full navigation
   router.push('https://same-origin.com/path') // SPA navigation
   ```

   `Link` detects external hrefs and lets the browser handle them natively.

5. **Synthetic `hashchange` on pushState navigations** — hash-only navigations now dispatch a real `HashChangeEvent` on the window, making TOC trackers, analytics, and scroll-to-hash libraries work correctly with client-side navigation.

6. **Fixed `useId()` hydration mismatch in production builds** — removed orphaned `PayloadCommitListener` from SSR tree that caused structural mismatch between server and client renders, fixing `useId()` output divergence in production.

## 1.19.0-rsc.1

1. **Type-safe `json()` helper with phantom brands** — `import { json } from 'spiceflow'` wraps `Response.json()` with TypedResponse phantom types so the fetch client gets full type safety for each status code. Use `throw json({ error: 'Not found' }, { status: 404 })` instead of raw `Response.json()`:

   ```ts
   import { Spiceflow, json } from 'spiceflow'

   const app = new Spiceflow().get('/user/:id', ({ params }) => {
     if (!user) throw json({ error: 'Not found' }, { status: 404 })
     return user
   })
   ```

2. **`ProgressBar.start()` and `ProgressBar.end()`** — drive the top loading bar around manual fetches, submit flows, and other non-router async work. Manual calls share the same progress state as router navigations with reference counting, so overlapping work keeps the bar visible until everything finishes.

3. **`spanContext()` on tracing spans** — handlers and middleware can now read the current `traceId` and `spanId` from `span.spanContext()` when the configured OTel tracer provides them, useful for propagating trace context to child libraries.

4. **Hide pages from OpenAPI output** — generated OpenAPI specs no longer include page, layout, and loader routes. Only API endpoints and `staticGet` routes appear in the spec.

5. **Removed deployment skew cookie mechanism** — the `spiceflow-deployment` cookie and 409 mismatch responses are gone. RSC client reference IDs are stable across deployments (hash of file path, not content) and old client chunks remain on CDN, making the cookie-based protection unnecessary. `getDeploymentId()` is still exported for analytics and cache keys.

6. **Fixed wrapped action redirects** — form-action redirects from wrapped client components now resolve correctly instead of leaving the React transition pending forever.

7. **Fixed multi-environment Vite dep optimization** — dev dependency discovery now works for SSR and RSC environments with `holdUntilCrawlEnd` forced across all environments, avoiding mid-request re-optimization on cold starts.

8. **`router.refresh()` is fire-and-forget** — removed the stale awaitable type and documented that awaitable navigation/refresh helpers must not be used inside React client form actions to avoid page deadlocks.

## 1.19.0-rsc.0

1. **Public `ErrorBoundary` for server actions** — `spiceflow/react` now exports an `ErrorBoundary` component with `ErrorBoundary.ErrorMessage` and `ErrorBoundary.ResetButton` sub-components, so forms can catch thrown action errors and render a retry UI without building custom boundary plumbing:

   ```tsx
   import { ErrorBoundary } from 'spiceflow/react'

   <ErrorBoundary
     fallback={
       <div>
         <ErrorBoundary.ErrorMessage className="text-red-500" />
         <ErrorBoundary.ResetButton>Try again</ErrorBoundary.ResetButton>
       </div>
     }
   >
     <form action={savePost}>...</form>
   </ErrorBoundary>
   ```

2. **Every server action call now refreshes the page automatically** — form submissions, direct imported action calls, and client wrappers all apply the new RSC payload immediately after the action finishes, so loaders and server components stay in sync without `await router.refresh()`.

3. **Path-scoped middleware with `.use(path, handler)`** — middleware can now be limited to a specific exact path or wildcard prefix instead of running globally:

   ```ts
   new Spiceflow()
     .use('/api/*', async ({ request }, next) => {
       console.log('only API routes hit this middleware')
       return next()
     })
   ```

4. **React pages and layouts can return raw HTTP responses** — non-404 `Response` values returned from `.page()` and `.layout()` now short-circuit as normal document responses, while 404 responses still flow through the existing not-found rendering path.

5. **Fixed locked request bodies inside server actions** — calling `getActionRequest()` and then reading or forwarding the request body no longer crashes with `ReadableStream has been locked to a reader`.

6. **Fixed several RSC correctness bugs** — dev-mode API errors now stay JSON instead of falling through to Vite's HTML overlay, and `useId()` output now stays consistent between SSR and hydration.

## 1.18.0-rsc.29

1. **Fix React page/layout handlers returning `Response`** — redirects from `.page()` and `.layout()` now short-circuit correctly via SPA navigation, and `notFound()` responses render through the 404 flow instead of crashing RSC serialization with `Only plain objects` errors during browser navigation.

2. **Improved prerender build error messages** — static page build failures now include the failing response body in the error output, surfacing the original error message instead of only a generic `500`.

3. **Fix duplicate spiceflow instances under pnpm strict isolation** — added `spiceflow` and `spiceflow/react` to `resolve.dedupe` in the Vite plugin. This prevents silent breakage from split module-level singletons (`AsyncLocalStorage` stores, router state) when pnpm resolves a nested copy of spiceflow from a subdirectory's `node_modules`.

## 1.18.0-rsc.28

1. **Fix `router.push()` follows `.get()` 302 redirects via SPA navigation** — when navigating to a path handled by a `.get()` route that returns a redirect, the client router now performs a client-side navigation to the redirect target instead of triggering a full page reload. Layout state, scroll position, and client component state are all preserved across the redirect.

   ```ts
   const app = new Spiceflow()
     .get('/projects/:id', ({ params, request }) => {
       return new Response(null, {
         status: 302,
         headers: { Location: `/projects/${params.id}/envs/default` },
       })
     })
     .page('/projects/:id/envs/:envId', async ({ params }) => {
       return <ProjectEnvPage id={params.id} env={params.envId} />
     })

   // clicking the button now lands on /projects/123/envs/default via SPA nav
   router.push('/projects/123')
   ```

## 1.18.0-rsc.27

1. **Revert Cloudflare linked entry resolution** — reverted the linked-spiceflow dev entry override from rsc.26 that was causing issues.

## 1.18.0-rsc.26

1. **Template literal paths in `href()`** — wildcard routes now accept resolved template literal paths directly, without needing to pass params as an object:

   ```ts
   const orgId = 'abc'

   // existing object form still works
   app.href('/orgs/:orgId/*', { orgId: 'abc', '*': 'projects' })

   // new: pass a resolved path directly
   app.href(`/orgs/${orgId}/projects`)
   ```

2. **`router.refresh()` now returns a promise** — `await router.refresh()` resolves after the fresh RSC payload commits, making it easy to sequence UI work after a server action mutates state:

   ```ts
   await action()
   await router.refresh()
   // server components and loader data are now up to date
   ```

3. **Fix `throw redirect()` in server actions** — redirects thrown inside server actions are now encoded in the RSC flight payload instead of returned as raw HTTP 307 responses. This fixes redirect handling on Cloudflare Workers (where `fetch` follows 307s and breaks) and direct action calls (non-form). All server action calls now automatically re-render the page with fresh data while preserving client component `useState` via React reconciliation. The `allowedActionOrigins` option is now documented for CSRF protection with reverse proxies.

4. **Fix `router.refresh()` stale data** — two related bugs fixed: RSC flight responses now include `Cache-Control: no-store` and the client fetch uses `cache: 'no-store'` so the browser never serves a cached flight payload. Also fixed a race where a refresh in flight could return stale same-location loader data, and each refresh promise now resolves for the correct request instead of being completed by an unrelated later commit.

5. **`onError` fires exactly once per server action error** — server action failures no longer trigger duplicate `onError` calls from repeated route-handler collection or later passes in the same request. Errors still reach the client error boundary.

6. **Default export for `spiceflow/vite`** — `import spiceflow from 'spiceflow/vite'` now works. The named export `spiceflowPlugin` still exists but is deprecated:

   ```ts
   import spiceflow from 'spiceflow/vite' // new default
   // import { spiceflowPlugin } from 'spiceflow/vite' // deprecated
   ```

7. **Gate RSC/SSR debug logs behind `SPICEFLOW_VERBOSE=1`** — the low-level RSC and SSR render logs are no longer emitted in normal runs. Set `SPICEFLOW_VERBOSE=1` to re-enable them for debugging.

8. **Fix Cloudflare local dev with linked spiceflow** — when `spiceflow` is symlinked from another repo, the dev-only RSC/SSR/client entry inputs now resolve to the app-local `node_modules/spiceflow/dist/react/*` files, keeping `@cloudflare/vite-plugin` happy without absolute realpaths that workerd cannot import.

9. **Dedicated OpenAPI guide** — a new [`docs/openapi.md`](./docs/openapi.md) covers status-code response maps, centralized error responses with `onError`, reusable Zod schemas, hiding routes from the document, generating a local `openapi.json`, and preserving fetch client type safety.

## 1.18.0-rsc.25

1. **Same-process federation with explicit `Response` rendering** — local federation now goes through the same `RenderFederatedPayload` and `decodeFederationPayload(response)` APIs as remote responses, so same-app flows can call `app.handle(new Request(...))` directly without a network round-trip:

   ```tsx
   import { Suspense } from 'react'
   import { RenderFederatedPayload } from 'spiceflow/react'

   const response = await app.handle(
     new Request('http://local/api/local-widget'),
   )

   <Suspense fallback={<div>Loading...</div>}>
     <RenderFederatedPayload response={response} />
   </Suspense>
   ```

2. **`document.title` updates on client-side navigation** — `<Head.Title>` changes now update the browser tab title after each RSC navigation. Previously the title only took effect in the initial SSR HTML and stayed stale after route transitions.

3. **Layout-based 404 handling** — all matched layout handlers now receive `children` as `null` when no page route matches. Any layout can detect the not-found state and render a custom 404 UI with `{children ?? <NotFound />}`:

   ```tsx
   export default function Layout({ children }) {
     return <main>{children ?? <NotFound />}</main>
   }
   ```

4. **Loader response status and headers propagated** — `response.status` and `response.headers` set inside a loader are now forwarded to the flight and HTML responses. Previously status codes like 404 were silently discarded and responses always returned 200.

5. **Loader route isolation** — loaders now only run when the request also matches a React page or layout. Previously a standalone `fetch("/loader-path")` could trigger loader logic unintentionally.

6. **Generic federated Flight payload APIs** — added `encodeFederationPayload(...)`, `RenderFederatedPayload`, and `decodeFederationPayload(response)` so routes can return plain objects, JSX, or objects containing JSX (including async iterables inside fields) over the federation wire format. `decodeFederationPayload(response)` now returns the decoded value directly instead of transport metadata.

7. **`getRouter()` / `useLoaderData()` / `useRouterState()`** — redesigned router API with `getRouter()` as the main entry point. `href()` and `getLoaderData()` live on the returned router object. `useLoaderData()` and `useRouterState()` are now exported directly from `spiceflow/react` and work during SSR through request-scoped context.

8. **Fixed `React.cache()` deduplication in server components** — adding `resolve.dedupe` for React packages ensures a single shared React instance across RSC and SSR environments under pnpm's strict module isolation. This fixes `Head.Title`, `Head.Meta`, and other tag collection that relies on `React.cache()`.

9. **Fixed `<Head.Title>` layout override bug** — a page's `<Head.Title>` was being replaced by the layout's title immediately after hydration. `CollectedHead` now derives the title from the deduplicated tag map, so `document.title` matches the server-rendered `<title>` element.

10. **Fixed `<Head.Link>` deduplication with `media` attribute** — `rel="icon"` tags with different `media` attributes (e.g. `media="(prefers-color-scheme: light)"` vs `dark`) are no longer collapsed into a single tag. Color-scheme-aware favicons and media-scoped alternates are preserved.

11. **Fixed Vite 8 dev-server crash under pnpm scoped packages** — reverted `optimizeDeps.include` entries to the `'spiceflow > dep'` nested-id syntax, avoiding the `+` character that pnpm injects into paths and that triggers a key mismatch in Vite's optimizer. Wrapper plugins that nest spiceflow should prefix entries as `'@yourpkg/vite > spiceflow > ...'`.

12. **Fixed federation stream cancellation** — canceled or failed federated RSC decodes now stop reading the underlying SSE and Flight streams promptly, preventing stalled readers from hanging after browser-side failures.

13. **`AnySpiceflow` type fallbacks** — `createSpiceflowFetch`, `createSpiceflowClient`, `createRouter`, and `createHref` now degrade to ergonomic `any` types instead of leaking `unknown` or `never` when used with runtime-defined apps.

14. **Standalone build improvements** — switched standalone dependency tracing to `nf3` so native runtime packages (including platform-specific optional deps) resolve from the built output without relying on pnpm-specific layout details. Fixed output directory resolution for prerender and Vercel builds.

15. **Cloudflare Workers build support** — Cloudflare server environments are now bundled correctly, and local builds stay incremental.

## 1.18.0-rsc.24

1. **Import map in dev mode** — `virtual:spiceflow-import-map` now generates a real import map during Vite dev using `?url` imports. Previously it returned an empty string in dev, which meant ESM components from external URLs (like Framer) couldn't resolve bare specifiers like `react` or `react/jsx-runtime`. Shared federation entries (`react`, `react-dom`, `react/jsx-runtime`, `spiceflow/react`) are now included with their dev-server URLs. User `importMap` entries are also included — external URLs pass through as-is, local files use `?url`.

2. **`signal` prop on `RemoteComponent`** — forwarded to the federation `fetch()` call so the request cancels when the browser disconnects. Pass `request.signal` from the route handler to avoid Node process crashes from orphaned requests:

   ```tsx
   export async function Page({ request }: { request: Request }) {
     return (
       <RemoteComponent
         src="https://remote.example.com/api/widget"
         signal={request.signal}
       />
     )
   }
   ```

3. **Skip SSR fetch for ESM URLs** — added `isLikelyEsmUrl()` heuristic that detects URLs with `.js`, `.mjs`, `.jsx`, `.ts`, `.tsx` extensions (including Framer's `.js@hash` pattern) and returns `<EsmIsland>` immediately without a server-side `fetch()`. This prevents the Node process crash caused by slow external fetches when the browser disconnects mid-stream (`ERR_INVALID_STATE: Unable to enqueue`).

4. **Fixed React unmount warning on `RemoteIsland` cleanup** — deferred `root.unmount()` to `queueMicrotask` to avoid `Attempted to synchronously unmount a root while React was already rendering`. The cleanup runs during React's commit phase — unmounting synchronously conflicted with the ongoing render.

## 1.18.0-rsc.23

1. **`isolateStyles` prop on `RemoteComponent` for Shadow DOM style isolation** — remote content renders inside a shadow root using Declarative Shadow DOM for SSR, preventing CSS from leaking between host and remote apps. CSS links are injected inside the shadow root instead of `document.head`, and host page styles cannot penetrate the shadow boundary. CSS custom properties (variables) still work across the boundary for theming:

   ```tsx
   <RemoteComponent
     src="https://remote.example.com/api/widget"
     props={{ theme: 'dark' }}
     isolateStyles
   />
   ```

2. **Federation response format changed from JSON to SSE** — `renderComponentPayload()` now returns a `Response` with `text/event-stream` content-type instead of a plain JSON object. Remote handlers simplify to just returning the response directly:

   ```ts
   // before
   const payload = await renderComponentPayload(<Chart />)
   return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })

   // after
   return await renderComponentPayload(<Chart />)
   ```

   The SSE wire format emits `metadata`, `ssr`, `flight` (one event per Flight row), and `done` events. This is a preparatory change — streaming support can be added later by emitting `flight` events incrementally as async components resolve, without changing the protocol.

## 1.18.0-rsc.22

1. **Added `publicDir` and `distDir` exports for RSC apps** -- server components can now locate the built `public/` and `dist/` directories without guessing from `import.meta.dirname`, which breaks on platforms like Vercel where the runtime directory differs from the build directory. Available from both `spiceflow` and `spiceflow/react`:

   ```ts
   import { publicDir, distDir } from 'spiceflow'
   import { readFile, writeFile } from 'node:fs/promises'
   import path from 'node:path'

   const template = await readFile(path.join(publicDir, 'og-template.png'))
   await writeFile(path.join(distDir, 'cache', 'post-1.png'), template)
   ```

   In development these resolve to `<cwd>/public` and `<cwd>`. In production they resolve to the built Vite output so the same code works after deployment.

2. **Fixed `publicDir` and `distDir` resolution for code-split builds and Cloudflare Workers** -- the virtual module now resolves the correct parent directory even when Vite emits it under `dist/rsc/assets/`, and Cloudflare Workers fall back cleanly instead of trying to read filesystem paths that do not exist.

## 1.18.0-rsc.21

1. **Fixed build silently succeeding when a server component throws during static page prerendering** — previously the prerender step checked the RSC flight response status (which is always 200, even on error) but not the HTML SSR response status (which is 500 when a component throws). The build would complete with broken prerendered files and no error. Now the HTML response status is also checked and the build fails with exit code 1 and shows the full stack trace.

## 1.18.0-rsc.20

1. **`.staticGet()` — pre-render API routes at build time** — works like `.get()` but the handler runs once during `vite build` and the response body is written to `dist/client/` as a static file. Useful for federation component payloads, manifests, sitemaps, or any endpoint that can be fully resolved at build time and served from S3 or a CDN with no server running:

   ```ts
   import { renderComponentPayload } from 'spiceflow/federation'

   export const app = new Spiceflow()
     .staticGet('/api/table', async () => {
       const rows = await db.query('SELECT name, role FROM employees')
       const payload = await renderComponentPayload(<Table rows={rows} />)
       return Response.json(payload)
     })
   ```

   In development the handler runs normally on every request. At build time the output file is written to `dist/client/api/table` and served as a static asset.

## 1.18.0-rsc.18

1. **Restored `.rsc` path extension for client-side RSC navigation fetches** — the client now appends `.rsc` to the pathname when fetching RSC Flight data (e.g. `/about.rsc?__rsc=`). This gives each RSC payload a distinct URL from its HTML page, enabling CDN-friendly caching of Flight data separately from HTML responses. The root `/` page uses `/index.rsc`. The `__rsc` query param is still included for backwards compatibility. Server-side route matching strips the `.rsc` suffix before matching so dynamic params work correctly.

2. **`staticPage()` now writes `.html` files to disk at build time** — prerendering no longer only produces `.rsc` Flight data files. The build now also writes a fully SSR-rendered `.html` file for each static route, making them suitable for direct CDN hosting. The prerender manifest (`__prerender.json`) now includes both `html` and `data` paths per entry. The root `/` route writes `index.rsc` and `index.html`.

3. **`vite build` now builds all environments without `--app`** — the spiceflow Vite plugin sets `builder: {}` automatically, so `vite build` builds all environments (client + SSR + RSC) without needing the `--app` CLI flag. Update your build scripts from `vite build --app` to `vite build`.

## 1.18.0-rsc.17

1. **Self-contained Node.js build output** — after `pnpm build`, the `dist/` folder now includes all runtime dependencies in `dist/node_modules/` traced by `@vercel/nft`. You can copy just `dist/` into a Docker container and run it with no install step:

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

   Skipped automatically for Vercel and Cloudflare which have their own bundling.

2. **Vercel deployment via Build Output API v3** — when `VERCEL=1` is set during build, spiceflow automatically generates `.vercel/output/` with static assets on CDN and a single serverless function for SSR/RSC. No config needed — just connect your repo to Vercel and deploy. Also exports `spiceflow/vercel` for manual plugin usage.

## 1.18.0-rsc.16

1. **Auto-coerce query parameters to schema types** — `z.number()`, `z.boolean()`, and `z.array(z.string())` now work directly without `z.coerce.number()` or `z.preprocess()`. Single values are automatically wrapped into arrays when the schema expects an array, and string values are coerced to numbers or booleans when declared as such. Works with any Standard Schema-compatible library (Zod, Valibot, ArkType):

   ```ts
   .get('/search', ({ query }) => query, {
     query: z.object({
       page: z.number().optional(),   // "42" → 42
       active: z.boolean().optional(), // "true" → true
       tag: z.array(z.string()),       // "react" → ["react"]
     }),
   })
   ```

2. **Server action error messages preserved in production** — thrown errors inside server actions now show the actual message in production builds instead of a generic "Application Error". Error messages are forwarded via the flight payload so error boundaries receive `error.digest` with the real message.

3. **Named exports from entry file are preserved in Cloudflare Workers builds** — Durable Objects, Workflows, Queue consumers, and any other named class/function exports from your entry file now survive the Vite RSC build. Previously only `default` and `app` were kept; everything else was tree-shaken away. Define non-React exports in a separate file (without CSS imports) and re-export them from your entry:

   ```ts
   // durable-object.ts — no CSS imports here
   export class MyDurableObject implements DurableObject {
     constructor(private state: DurableObjectState) {}
     async fetch(request: Request) { ... }
   }

   // main.tsx
   export { MyDurableObject } from './durable-object'
   export const app = new Spiceflow().page('/', () => <Home />)
   export default { fetch: (req) => app.handle(req) }
   ```

## 1.18.0-rsc.15

1. **Fixed `Head.Title` and `Head.Meta` rendering** — metadata is now correctly emitted in the document head and stays available after hydration. Duplicate tags inside a single `Head` subtree are deduplicated, matching expected behavior for layouts and pages.

2. **Fixed route priority for child apps** — specific routes in child apps now correctly take priority over parent wildcard routes. Previously a parent `/*` would incorrectly shadow more specific child routes. Thanks @johnpyp for #42!

## 1.18.0-rsc.14

### Minor Changes

1. **Built-in OpenTelemetry tracing** — pass a `tracer` to the Spiceflow constructor and every request automatically gets spans for middleware, handlers, loaders, layouts, pages, and RSC serialization. No monkey-patching or plugins required. The tracer interface is structurally compatible with `@opentelemetry/api` so there's zero runtime dependency:

   ```ts
   import './tracing' // OTel SDK setup, must run first
   import { trace } from '@opentelemetry/api'
   import { Spiceflow } from 'spiceflow'

   const app = new Spiceflow({ tracer: trace.getTracer('my-app') }).get(
     '/api/users/:id',
     ({ params }) => {
       return { id: params.id, name: 'Alice' }
     },
   )
   ```

   For API routes you get:

   ```
   GET /api/users/:id [server]
   ├── middleware - cors
   └── handler - /api/users/:id
   ```

   For React routes with loaders and layouts:

   ```
   GET /dashboard [server]
   ├── middleware - auth
   ├── loader - /dashboard
   ├── layout - /
   ├── page - /dashboard
   └── rsc.serialize
   ```

   Each span includes standard HTTP attributes following OTel semantic conventions. Errors are recorded with `recordException` and set the span status to ERROR. When no tracer is passed, all instrumentation points are skipped with zero overhead.

2. **`span` and `tracer` on handler context** — all route types (API routes, pages, layouts, loaders, middleware) now receive `span` and `tracer` on their context object. Add custom attributes, record caught exceptions, and create child spans directly from handlers without any conditional checks. When no tracer is configured, both are no-op implementations that V8 inlines away:

   ```ts
   // add attributes to the current handler span
   .get('/api/users/:id', ({ params, span }) => {
     const user = db.findUser(params.id)
     span.setAttribute('user.plan', user.plan)
     return user
   })

   // record a caught exception without re-throwing
   .post('/api/webhook', async ({ request, span }) => {
     const body = await request.json()
     try {
       await processWebhook(body)
     } catch (err) {
       span.recordException(err)
     }
     return { ok: true }
   })

   // create child spans for DB calls or external APIs
   .get('/api/data', async ({ tracer, params }) => {
     return tracer.startActiveSpan('db.query', async (dbSpan) => {
       const data = await db.query(params.id)
       dbSpan.setAttribute('db.rows', data.length)
       dbSpan.end()
       return data
     })
   })
   ```

   Also exports `withSpan`, `noopSpan`, and `noopTracer` as public utilities.

### Patch Changes

3. **Native Deno runtime support** — `app.listen()` now uses `Deno.serve()` with web standard Request/Response directly when running under Deno, bypassing the `node:http` adapter. Same approach as Bun's native `Bun.serve()` integration.

4. **Stable `stop()` method on `app.listen()` return** — the object returned by `app.listen()` now has a consistent `stop()` method across all runtimes (Node, Bun, Deno) including no-op cases like Vite dev and prerender. Cleanup code can shut down listeners without server-specific type assertions.

5. **`.server.ts` file boundary guard** — files ending in `.server.ts`, `.server.tsx`, etc. (or inside a `.server/` directory) now produce a clear error when imported from a client component during development. The error shows the exact import path and the offending file, similar to how React Router handles this convention.

## 1.18.0-rsc.13

### Patch Changes

1. **Fixed hydration crash on initial page load** — `createFromReadableStream` and `createFromFetch` from `@vitejs/plugin-rsc/browser` return thenables rather than native Promises. Calling `.then().catch()` on a thenable caused a `TypeError` that crashed the browser entry before `hydrateRoot` could run, leaving every page stuck unhydrated. All client interactivity (navigation, server actions, HMR) was broken as a result.

## 1.18.0-rsc.12

### Minor Changes

1. **`.loader()` route kind for server-side data loading** — loaders run before page and layout handlers, with their return values merged by path specificity and passed to handlers via `ctx.loaderData`. Wildcard patterns like `/*` match all routes for global data (e.g. auth):

   ```ts
   const app = new Spiceflow()
     .loader('/*', async () => ({ user: await getUser() }))
     .page('/dashboard', (ctx) => <Dashboard user={ctx.loaderData.user} />)
   ```

2. **`createRouter<App>()` factory for typed client utilities** — returns `router`, `useLoaderData`, `useRouterState`, and `href` all in one call. Paths and loader data types are fully inferred:

   ```ts
   import { createRouter } from 'spiceflow/react'
   export const { router, useLoaderData, href } = createRouter<typeof app>()

   router.push('/dashboard') // typed paths + params
   const { user } = useLoaderData('/dashboard') // typed, path inferred
   href('/users/:id', { id: '123' }) // type-safe URL builder
   ```

3. **`safePath` renamed to `href`** — `app.href()` and `createHref()` replace the old `safePath` API. The deprecated `createSafePath` and `buildSafePath` exports are removed.

### Patch Changes

4. **`useRouterState` hook and `router.searchParams` getter** — `useRouterState()` subscribes to navigation changes via `useSyncExternalStore` and returns the current location with a parsed `searchParams` property typed as `ReadonlyURLSearchParams`. `router.searchParams` provides the same read-only access outside React:

   ```ts
   import { createRouter } from 'spiceflow/react'
   const { useRouterState, router } = createRouter<typeof app>()

   // inside a component
   const { pathname, searchParams } = useRouterState()

   // outside React
   const q = router.searchParams.get('q')
   ```

5. **`getLoaderData()` for non-React access** — resolves loader data from the RSC flight payload outside of React components via a Promise-based API with navigation versioning.

## 1.18.0-rsc.11

### Patch Changes

1. **Removed Link prefetch** — the `prefetch` prop and hover/focus/touch prefetching have been removed from the `Link` component. `prefetchRoute` is no longer exported from `spiceflow/react`. Links now navigate directly without prefetching:

   ```tsx
   import { Link } from 'spiceflow/react'

   // prefetch prop is no longer accepted
   ;<Link href="/dashboard">Dashboard</Link>
   ```

2. **More reliable dev mode detection** — switched from `import.meta.env.PROD/DEV` to `import.meta.hot` throughout the framework (`getDeploymentId`, `ErrorBoundary`, `entry.client`, `entry.ssr`). `import.meta.hot` is defined by Vite in dev/HMR mode and is always `undefined` in production builds, making it a more accurate and portable check.

## 1.18.0-rsc.10

### Patch Changes

1. **Link prefetch on hover** — the `Link` component now fetches the RSC payload when the user hovers (with 80ms debounce), focuses, or touches a link. Cached responses are consumed on navigation, making client-side page transitions feel instant. Prefetch is enabled by default and opt-out per link:

   ```tsx
   import { Link } from 'spiceflow/react'

   // prefetch on hover (default)
   <Link href="/dashboard">Dashboard</Link>

   // disable prefetch for this link
   <Link href="/dashboard" prefetch={false}>Dashboard</Link>
   ```

   `prefetchRoute(href)` is also exported from `spiceflow/react` for programmatic prefetching.

2. **Removed `.rsc` URL extension from client navigations** — RSC data fetches now use only the `?__rsc` query parameter to signal the server, producing cleaner URLs (e.g. `/about?__rsc=` instead of `/about.rsc?__rsc=`). Prerendered `.rsc` Flight data files on disk are still served correctly via `serveStatic`.

3. **Prerendering enabled by default for `staticPage()` routes** — prerendering no longer requires the `SPICEFLOW_ENABLE_BUILD_PRERENDER` env var. It now runs automatically during `vite build --app`, generating `.rsc` Flight data files so client-side navigations to prerendered pages are served from disk rather than re-rendered dynamically.

4. **`getDeploymentId` exported from main entry** — returns the build-time deployment identifier (a base-36 timestamp), useful for cache keys and logging. Returns `''` in dev mode:

   ```ts
   import { getDeploymentId } from 'spiceflow'
   const id = getDeploymentId() // e.g. "lk3m2p9"
   ```

5. **Consistent response status across all route types** — `context.response` is now a mutable plain object `{ headers, status }`. Handler-provided status codes are applied consistently for API routes, React pages, and layouts, while explicit statuses from returned or thrown `Response` objects are still preserved.

6. **Optimized `SpiceflowRequest.parsedUrl`** — URL parsing is now lazy and cached on first access, removing manual `parsedUrl` assignments from `handle()` and `nodeToWebRequest()`.

## 1.18.0-rsc.9

### Patch Changes

1. **HTTP response headers for page, layout, and API handlers** — set response headers via `props.response` in any handler. Headers are forwarded on both document requests and client-side RSC navigations:

   ```tsx
   app.page('/dashboard', async (props) => {
     props.response.headers.set(
       'cache-control',
       's-maxage=60, stale-while-revalidate=300',
     )
     props.response.headers.set('set-cookie', 'session=abc; Path=/')
     return <Dashboard />
   })
   ```

   Works the same way in layout handlers and API routes.

2. **Typed `Head` sub-components** — `Head.Meta`, `Head.Title`, `Head.Link`, `Head.Script`, `Head.Style`, and `Head.Base` each provide IDE autocomplete for their attributes. Known attribute values appear in completions; arbitrary strings are still accepted. Always wrap head tags inside `<Head>` for proper deduplication across layouts and pages:

   ```tsx
   import { Head } from 'spiceflow/react'

   ;<Head>
     <Head.Title>My App</Head.Title>
     <Head.Meta name="description" content="My page" />
     <Head.Meta property="og:title" content="My page" />
     <Head.Link rel="stylesheet" href="/styles.css" />
     <Head.Script src="/analytics.js" type="module" />
   </Head>
   ```

3. **Moved `zod` to peer dependency** — fixes potential `instanceof` check failures when npm or pnpm installs a duplicate copy of zod alongside spiceflow's own copy. Users already install zod separately (`npm install spiceflow zod`), so this is a non-breaking change.

4. **Fixed `optimizeDeps` resolution under pnpm strict isolation** — pnpm does not hoist transitive dependencies, so bare package names like `superjson`, `isbot`, and `history` in `optimizeDeps.include` failed to resolve from the user's project root in the RSC and SSR environments. They now use the `spiceflow > pkg` prefix (matching the client environment) so Vite resolves them through spiceflow's own `node_modules`.

5. **Removed `react-server-dom-webpack` dependency** — `@vitejs/plugin-rsc` vendors its own copy of the React Flight protocol internally, so spiceflow no longer needs to pin its own copy. Lighter install.

## 1.18.0-rsc.8

### Patch Changes

1. **Auto-configure `optimizeDeps.entries` per Vite environment** — the Vite plugin now automatically sets `optimizeDeps.entries` for the client, rsc, and ssr environments to point at your app entry file. Vite crawls the full import graph upfront during dev, preventing late dependency discovery that triggers re-optimization rounds and page reloads on fresh installs. Apps no longer need manual `optimizeDeps.include` lists for spiceflow's transitive dependencies.

2. **Improved React SSR performance** — document GET/HEAD requests skip the extra Flight decode pass, bootstrap script content is cached in production, the default page payload shape is smaller, and `injectRSCPayload()` does less HTML stream work. These changes improve throughput for normal RSC page renders in the `example-nodejs` benchmark.

3. **Fixed `@tailwindcss/vite` triggering full page reloads during RSC HMR** — the plugin now intercepts `hotUpdate` events for CSS files before `@tailwindcss/vite` can escalate them to a full reload, keeping RSC HMR fast without a browser refresh.

4. **Improved Node.js adapter** — the Node adapter now handles backpressure correctly using `write()` return value and `drain` events, forwards `Set-Cookie` arrays as separate headers, passes raw header arrays through for multi-value headers, and uses `pipeline()` for static file streaming to avoid memory leaks.

5. **Fixed per-URL abort controllers** — RSC and non-RSC requests no longer share abort controllers, preventing in-flight RSC streams from being cancelled when an unrelated request for the same URL is aborted.

6. **Fixed SSE streaming backpressure** — replaced the eager `start()` loop with a pull-based approach so SSE generators are only consumed when the client is ready, preventing unbounded buffering.

7. **Fixed Cloudflare Workers hung requests during HMR** — mitigated an error where Cloudflare's runtime hangs a request when the RSC worker is reloaded mid-flight.

8. **Fixed flight script content escaping** — the full RSC flight script content including prefix and suffix is now properly escaped, preventing script injection edge cases.

## 1.18.0-rsc.7

### Patch Changes

1. **Fixed API routes being shadowed by layout-only React route matches** — when a path like `/api/hello` matched both a `layout('/*')` and a `.get('/api/hello')` handler, the framework incorrectly entered the React rendering path and returned 404. The route matching logic now checks whether `reactRoutes` contains an actual page or staticPage match before taking priority over API route handlers.

2. **Actionable errors for client-only React APIs in Server Components** — cryptic `TypeError: X is not a function` messages are now rewritten when `useState`, `useEffect`, `createContext`, or class components are accidentally used in Server Components. For example, `TypeError: useState is not a function` becomes `useState only works in Client Components. Add the "use client" directive at the top of the file to use it.`

3. **React 404 page for unmatched browser routes** — browser requests hitting unmatched routes in apps with React pages registered now render the `DefaultNotFoundPage` component through the full RSC → SSR pipeline, wrapped in layouts, with correct HTTP 404 status. Non-browser requests (API clients, curl, fetch without `Accept: text/html`) still get plain text `"Not Found"`.

4. **Fixed SSR client reference resource hints** — moving Flight deserialization back inside the React DOM SSR render context restores stylesheet and preload injection for client components during document rendering, so pages hydrate with the expected early resource hints.

5. **Hardened SSR redirect race** — abort guard, timer cleanup, and error priority fixes prevent redirect responses from racing with in-flight SSR renders.

6. **Fixed `throw redirect()` inside page handlers** — redirecting inside a page handler now correctly returns HTTP 307 instead of 200.

## 1.18.0-rsc.6

### Patch Changes

1. **Fixed `app.listen()` running in Vite dev** — calling `app.listen(3000)` in your entry file no longer starts a real HTTP server during `vite dev`. Vite owns the server in dev mode; `listen()` is now a noop when `import.meta.hot` is defined and only starts the server in production.

## 1.18.0-rsc.5

### Patch Changes

1. **Fixed duplicate React context crash** — in dev mode, Vite's dep optimizer was bundling spiceflow's `context.js` and `components.js` into `.vite/deps/` while RSC client references loaded the same files raw from `node_modules`, creating two separate `FlightDataContext` instances. The Provider used one copy and `LayoutContent` used the other, so `useContext` returned `undefined` and React threw `An unsupported type was passed to use(): undefined`. Fixed by excluding `spiceflow` from `optimizeDeps` in the client environment.

2. **Clearer error when RSC context is missing** — instead of the cryptic React error, `useFlightData` now throws a descriptive message pointing to the module duplication root cause.

## 1.18.0-rsc.4

### Patch Changes

1. **Export `router` from `spiceflow/react`** — client-side navigation singleton with `push`, `replace`, `back`, `forward`, `refresh`, `pathname`, and `subscribe`. No hooks needed:

   ```ts
   import { router } from 'spiceflow/react'

   router.push('/dashboard')
   router.refresh()
   console.log(router.pathname)

   const unsub = router.subscribe(() => {
     console.log('navigated to', router.pathname)
   })
   ```

2. **Object-style `.page()` with query schema support** — pass options as an object and declare typed query params via a Zod schema. Unknown keys are rejected by TypeScript when a schema is present:

   ```ts
   app.page({
     path: '/search',
     query: z.object({ q: z.string(), page: z.number().optional() }),
     handler: ({ query }) => <SearchPage q={query.q} />,
   })
   ```

3. **`safePath` for `.page()` and `.staticPage()` routes** — path params and query params merge into a single flat object. Path param keys are substituted, remaining keys become query string parameters:

   ```ts
   app.safePath('/users/:id', { id: '42', fields: 'name' })
   // '/users/42?fields=name'
   ```

4. **Deployment skew protection** — RSC navigations and server actions now detect stale tabs hitting newer deployments. The deployment ID is derived from the Vite client bootstrap and stored in a secure cookie; stale tabs trigger a hard document navigation instead of a broken RSC fetch.

5. **Fixed Cloudflare Vite RSC dev and deploy** — `app.handle()` now owns the Flight→HTML bridge, so Cloudflare can run `rsc` and `ssr` workers in the same worker graph during dev while user-defined Worker default exports just call `app.handle(request)`. `spiceflowCloudflareViteConfig()` still places the SSR build in `dist/rsc/ssr` for preview and deploy.

6. **Fixed `Head` SSR metadata override rules** — nested pages now override layout defaults by metadata identity instead of only removing exact duplicates. Absolute URL rewriting is narrowed to URL-valued social metadata (`og:image`, `og:url`, `twitter:image`). Nested `Head` children such as fragments continue to work during SSR.

7. **Fixed `serveStatic()` on Node** — directory requests no longer throw `EISDIR`. Exact file matches are served before directory indexes. Concrete routes win over static assets, while static assets still beat root `/*` fallback routes.

8. **Refactored `ScrollRestoration`** — navigation and scroll state are now derived from a bounded router event log instead of mirrored module globals, making refresh detection and scroll position restoration reproducible across RSC navigations.

## 1.18.0-rsc.3

### Patch Changes

1. **Fixed route matching specificity** — regex-constrained params and more specific wildcard routes now win over generic catch-alls. Wildcard param extraction for patterns like `/layout/*/page` now correctly captures only the wildcard segment. React layout rendering now receives each layout route's own `params` instead of reusing the page params, fixing nested layout trees that depend on dynamic segments.

2. **Updated Vite integration to Vite 8** — the React plugin dependency is bumped to the matching major, keeping Spiceflow aligned with the current Vite toolchain.

3. **Fixed `HEAD` handling, query param preservation, and CORS body reuse** — `HEAD` routes now reuse `GET` route metadata while returning an empty body. Repeated empty query values like `?tag=&tag=two` are preserved correctly. Request bodies are reusable across middleware and handlers for JSON routes. CORS middleware now mutates response headers in place instead of rebuilding responses from consumed bodies.

4. **Cleaned up RSC migration artifacts** — removed unused framework-only types and stale exports (e.g. `RscHandlerResult`). Server redirects now emit a correct `content-type` header. Client action refresh handling is safer, with payload updates set before awaiting action results.

## 1.6.2-rsc.2

### Patch Changes

- initial rsc release
- Updated dependencies
  - spiceflow@1.6.2-rsc.2

## 1.6.2-rsc.1

### Patch Changes

- initial rsc release
- Updated dependencies
  - spiceflow@1.6.2-rsc.1

## 1.6.2-rsc.0

### Patch Changes

- initial rsc release
- Updated dependencies
  - spiceflow@1.6.2-rsc.0

## 1.18.0

### Minor Changes

1. **New `createSpiceflowFetch` client** — a type-safe `fetch(path, options)` alternative to the proxy-based `createSpiceflowClient`. Export `type App = typeof app` on the server, import it on the client, and get full type safety for paths, path params, query params, request bodies, and responses without importing any server code:

   ```ts
   // server.ts
   export type App = typeof app

   // client.ts
   import { createSpiceflowFetch } from 'spiceflow/client'
   import type { App } from './server'

   const f = createSpiceflowFetch<App>('http://localhost:3000')

   const user = await f('/users/:id', { params: { id: '123' } })
   if (user instanceof Error) return user
   console.log(user.id) // fully typed
   ```

   Supports streaming routes (returns `AsyncGenerator`), retries, custom headers, and onRequest/onResponse hooks.

2. **`createSpiceflowFetch` returns `Error | Data`** — following the [errore](https://errore.org) convention. Use `instanceof Error` for Go-style early returns — no more `{ data, error }` destructuring or null checks. TypeScript narrows the type automatically after the check. On error, the `SpiceflowFetchError` has `status`, `value` (parsed error body), and `response` (raw `Response`) properties:

   ```ts
   const result = await f('/users/:id', { params: { id: '123' } })
   if (result instanceof Error) return result // SpiceflowFetchError with .status, .value
   console.log(result.name) // TypeScript knows this is the success type
   ```

3. **`safePath` query params support** — path params and query params are now passed as a single flat object. Path param keys (`:param` segments and `*`) are substituted into the URL, remaining keys become query string parameters. Works with both `app.safePath()` and `createSafePath()`:

   ```ts
   app.safePath('/users/:id', { id: '42', fields: 'name' })
   // '/users/42?fields=name'

   app.safePath('/search', { q: 'hello', page: 1 })
   // '/search?q=hello&page=1'
   ```

   Unknown keys are rejected by TypeScript when a query schema is defined on the route.

4. **Standalone `createSafePath<App>()`** — build type-safe paths without the app instance, useful in client-side code where you can't import server modules:

   ```ts
   import { createSafePath } from 'spiceflow'
   import type { App } from './server'

   const safePath = createSafePath<App>()
   safePath('/users/:id', { id: '123' })
   ```

## 1.17.12

### Patch Changes

- Add `retries` option to client config to automatically retry requests on server errors (status >= 500) with exponential backoff. For async generator streaming responses, the client will retry the request and continue from the same generator after a connection failure.

## 1.17.11

### Patch Changes

- Add `content-encoding: none` header to async generator streaming responses to fix streaming issues on fly.io and similar platforms that may apply automatic compression

## 1.17.10

### Patch Changes

- Fix CORS middleware immutable headers error in Cloudflare Workers by properly handling Vary header updates on response headers instead of attempting to modify request headers

## 1.17.9

### Patch Changes

- Fix CORS middleware for Cloudflare Workers by properly handling immutable headers. The middleware now always creates a new Response with cloned headers instead of trying to mutate the original response headers, which prevents the "cannot mutate immutable headers" error in Cloudflare Workers environments.

## 1.17.8

### Patch Changes

- 0e7ac1d: Fix SSE streaming to gracefully handle abort errors without throwing. Previously, when a streaming request was aborted (e.g., user navigates away or cancels the request), the async generator would throw errors like "BodyStreamBuffer was aborted". Now these abort-related errors are caught and the generator simply stops without throwing, making the client more resilient to common abort scenarios.

<!-- When updating the changelog, also update the version in spiceflow/package.json -->

## 1.17.7

### Patch Changes

- Fix types for `preventProcessExitIfBusy` middleware

## 1.17.6

### Patch Changes

- Add `preventProcessExitIfBusy` middleware for graceful shutdown handling. This middleware tracks in-flight requests and prevents the process from exiting while requests are being processed. It handles SIGINT and SIGTERM signals, waiting for active requests to complete before allowing process exit. The middleware is created with `scoped: false` to ensure it applies globally across all mounted apps.

  ```ts
  import { preventProcessExitIfBusy } from 'spiceflow'

  const app = new Spiceflow()
    .use(
      preventProcessExitIfBusy({
        maxWaitSeconds: 300, // Max time to wait for requests (default: 300)
        checkIntervalMs: 250, // Check interval in ms (default: 250)
      }),
    )
    .get('/', () => ({ hello: 'world' }))
  ```

  Particularly useful for platforms like Fly.io that support graceful shutdown periods (up to 5 minutes) during deployments, ensuring long-running requests like AI workloads complete successfully.

## 1.17.5

### Patch Changes

- Internal improvements

## 1.17.4

### Patch Changes

- Softer type for handler return type, allow Cloudflare Response

## 1.17.3

### Patch Changes

- 268ba47: Add x-spiceflow-agent header to client requests to identify requests coming from the Spiceflow client. This header is set to 'spiceflow-client' for all requests made through the createSpiceflowClient function.

  Add `disableSuperJsonUnlessRpc` option to Spiceflow constructor. When set to `true`, superjson serialization is only applied to responses when the request includes the `x-spiceflow-agent: spiceflow-client` header. This allows you to disable superjson for regular HTTP requests while keeping it enabled for RPC clients. In a future major version, this will become the default behavior. When a parent app has this flag set to `true`, all child apps mounted with `.use()` will inherit this setting.

  Convert `superjsonSerialize` and `turnHandlerResultIntoResponse` from standalone functions to private methods of the Spiceflow class. This improves encapsulation and allows these methods to access instance properties like the `disableSuperJsonUnlessRpc` flag.

## 1.17.2

### Patch Changes

- Add resources to the server

## 1.17.1

### Patch Changes

- Fix safePath not working for .route

## 1.17.0

### Minor Changes

- Remove `path` parameter from `addMcpTools()` function and make `ignorePaths` required. Users should now pass an array of paths to ignore directly instead of a single path. Example usage:

  ```ts
  await addMcpTools({
    mcpServer,
    app,
    ignorePaths: ['/sse', '/mcp'],
  })
  ```

## 1.16.1

### Patch Changes

- Improve MCP server initialization by adding explicit capabilities registration and cleaning up code formatting. The `mcpServer.server.registerCapabilities()` call ensures proper MCP server setup with tools and resources capabilities.

## 1.16.0

### Minor Changes

- 4e2a0e6: Make route method field optional with `*` as default. Routes without an explicit `method` field now listen on all HTTP methods instead of requiring a method to be specified. This change simplifies route creation for catch-all handlers.

  **Before:**

  ```typescript
  app.route({
    method: 'GET', // required
    path: '/api/users',
    handler: () => 'users',
  })
  ```

  **After:**

  ```typescript
  // Method is now optional, defaults to '*' (all methods)
  app.route({
    path: '/api/users',
    handler: () => 'users',
  })

  // Explicit method still works
  app.route({
    method: 'GET',
    path: '/api/users',
    handler: () => 'users',
  })
  ```

## 1.15.1

### Patch Changes

- Add support for `*` wildcard in route method field to listen on all HTTP methods. When using `method: '*'` in the route configuration, the route will respond to all HTTP methods (GET, POST, PUT, DELETE, etc.). This provides a convenient way to create catch-all routes without having to specify each method individually.

  ```typescript
  app.route({
    method: '*',
    path: '/api/*',
    handler: ({ request }) => ({ method: request.method }),
  })
  ```

## 1.15.0

### Minor Changes

- Simplify addMcpTools API and make path parameter required. The addMcpTools function now always adds the OpenAPI route without checking if it exists, uses parameters directly instead of fetching from \_mcp_config route, and requires the path parameter to be explicitly provided. This makes the API more predictable and straightforward to use.

- Enable addMcpTools to work without mcp() plugin. The addMcpTools function now automatically adds the required OpenAPI and config routes (`/_mcp_openapi` and `/_mcp_config`) if they don't already exist, allowing it to work with any Spiceflow app even without the mcp() plugin. This makes it easier to integrate MCP tools into existing applications.

## 1.14.2

### Patch Changes

- Fix McpServer API usage by accessing setRequestHandler through the server property. The McpServer class changed its API and no longer exposes setRequestHandler directly - it must be accessed via mcpServer.server.setRequestHandler().
- Add test for addMcpTools function and update types. The addMcpTools function now properly types its parameters with McpServer from @modelcontextprotocol/sdk, ensuring better type safety when integrating external MCP servers with Spiceflow applications.

## 1.14.1

### Patch Changes

- Add `addMcpTools` helper function that configures MCP tools for an existing server and Spiceflow app. This provides a convenient way to add Spiceflow route tools to an existing MCP server instance.

  ```ts
  const mcpServer = await addMcpTools({ mcpServer, app })
  ```

## 1.14.0

### Minor Changes

- The `listen` and `listenForNode` methods now return an object with `{port, server}` instead of just the server instance. The port field contains the actual listening port, which is especially useful when using port 0 for random port assignment.

  ```ts
  // Before
  const server = await app.listen(3000)

  // After
  const { port, server } = await app.listen(3000)
  console.log(`Server listening on port ${port}`)

  // Useful with port 0 for random port
  const { port, server } = await app.listen(0)
  console.log(`Server assigned random port ${port}`)
  ```

### Patch Changes

- 37c3f7b: Add path parameter to onError handler and validate error status codes. The onError handler now receives the request path where the error occurred, making it easier to debug and log errors with context. Additionally, error status codes are now validated to ensure they are valid HTTP status codes (100-599), defaulting to 500 for invalid values. The error status resolution now also supports `statusCode` as a fallback when `status` is not present.

  ```typescript
  // Before
  app.onError(({ error, request }) => {
    console.log('Error occurred', error)
    return new Response('Error', { status: 500 })
  })

  // After
  app.onError(({ error, request, path }) => {
    console.log(`Error occurred at ${path}`, error)
    return new Response('Error', { status: 500 })
  })
  ```

- d4f555c: Fix duplicate base path handling in nested Spiceflow apps. The `joinBasePaths` method now properly handles cases where parent paths are prefixes of child paths, preventing duplicate path segments from being concatenated. This ensures that nested Spiceflow instances with overlapping base paths generate correct URLs.

## 1.13.3

### Patch Changes

- Add path parameter to onError handler and validate error status codes. The onError handler now receives the request path where the error occurred, making it easier to debug and log errors with context. Additionally, error status codes are now validated to ensure they are valid HTTP status codes (100-599), defaulting to 500 for invalid values.

  ```typescript
  // Before
  app.onError(({ error, request }) => {
    console.log('Error occurred', error)
    return new Response('Error', { status: 500 })
  })

  // After
  app.onError(({ error, request, path }) => {
    console.log(`Error occurred at ${path}`, error)
    return new Response('Error', { status: 500 })
  })
  ```

## 1.13.2

### Patch Changes

- move the request check at runtime instead of type

## 1.13.1

### Patch Changes

- Fix types because of an issue with array method params

## 1.13.0

### Minor Changes

- Add waitUntil

## 1.12.3

### Patch Changes

- .request is not allowed for GET routes

## 1.12.2

### Patch Changes

- 915f7d9: query type has values always defined, no optional keys

## 1.12.1

### Patch Changes

- app.safePath('/posts/_', { '_': 'some/key' }) support

## 1.12.0

### Minor Changes

- Add this type inside handlers to reference the app

## 1.11.3

### Patch Changes

- Fix type safety for .route and methods on client

## 1.11.2

### Patch Changes

- Fix support for Cloudflare without node, fix ./\_node-server exports

## 1.11.1

### Patch Changes

- Fix support for request to pass schema

## 1.11.0

### Minor Changes

- 7da7fb9: Deprecate body, use request instead. It aligns better with request reponse
- fe3c152: Added .route

### Patch Changes

- fe3c152: Fix missing package.json package

## 1.10.1

### Patch Changes

- Disable exposeHeaders in cors by default

## 1.10.0

### Minor Changes

- add support for zod v4

## 1.9.1

### Patch Changes

- return parsed schema value if defined

## 1.9.0

### Minor Changes

- Use @standard-schema/spec, remove ajv, works on Cloudflare workers

## 1.8.0

### Minor Changes

- Allow passing state as second arg to handle.

## 1.7.2

### Patch Changes

- Fix Next.js usage, Next.js is so retarded it manages to fuck up Readable.toWeb somehow

## 1.7.1

### Patch Changes

- Use writeHead in handleNode

## 1.7.0

### Minor Changes

- Add handleNode method

## 1.6.2

### Patch Changes

- 4874fc4: Async generator always return a sse stream, even if they have only one return

## 1.6.1

### Patch Changes

- Disable credentials include by default, casues many issues with CORS

## 1.6.0

### Minor Changes

- Pass credentials include by default in spiceflow client

### Patch Changes

- Fix isAsyncIterable

## 1.5.1

### Patch Changes

- df08dbe: Changed json schema additional strategy to strict

## 1.5.0

### Minor Changes

- Add superjson support

## 1.4.1

### Patch Changes

- ef7eae5: handle case where createClient returns a promise and await calls .then on it

## 1.4.0

### Minor Changes

- 22e6320: stop async generators on abort, ping the client with \n every 10 seconds

## 1.3.0

### Minor Changes

- 82a9598: Cache cors OPTIONS responses

## 1.2.0

### Minor Changes

- Errors are now JSON object responses, added mcp plugin to add model context protocol support, added x-fern types for openapi, added support for response schema in async generator routes

## 1.1.18

### Patch Changes

- Fix type inference when nothing is returned from route

## 1.1.17

### Patch Changes

- Fix ReplaceBlobWithFiles

## 1.1.16

### Patch Changes

- Removed bun types references, fix type inference

## 1.1.15

### Patch Changes

- Fix trailing slashes problems, fix index route with base path

## 1.1.14

### Patch Changes

- Run middleware on errors

## 1.1.13

### Patch Changes

- Changed some client type names

## 1.1.12

### Patch Changes

- handle promises responses correctly

## 1.1.11

### Patch Changes

- FIx instanceof Response again for all cases

## 1.1.10

### Patch Changes

- Fix case where response is not instance of Response, in cases where stupid Remix polyfills response because they are retarded

## 1.1.9

### Patch Changes

- Fix URL invalid in Remix

## 1.1.8

### Patch Changes

- Fix request getting always aborted in Nodejs, fix Nodejs listener for POST requests, fix middleware not setting result Response in some cases

## 1.1.7

### Patch Changes

- Fix type for middleware

## 1.1.6

### Patch Changes

- b73eb5a: fix middleware

## 1.1.5

### Patch Changes

- fix params and query being stale after validation

## 1.1.4

### Patch Changes

- Fix middleware calling handler many times

## 1.1.3

### Patch Changes

- Run middleware for 404, handle HEAD and OPTIONS
- Added package.json exports

## 1.1.2

### Patch Changes

- maybe fix bun

## 1.1.1

### Patch Changes

- add listen()

## 1.1.0

### Minor Changes

- Replce onRequest with use

## 1.0.8

### Patch Changes

- Fix url

## 1.0.7

### Patch Changes

- Fix openapi, fix types for use

## 1.0.6

### Patch Changes

- Fix types without intsalling bun types

## 1.0.5

### Patch Changes

- Use nodejs es module support

## 1.0.4

### Patch Changes

- Better client config

## 1.0.3

### Patch Changes

- Updates

## 1.0.2

### Patch Changes

- Fixes onRequest ordering and many other issues

## 1.0.1

### Patch Changes

- Fix poublished package

## 1.0.0

### Major Changes

- Init

## 0.0.7

### Patch Changes

- remove the .js extension in the dynamic import

## 0.0.6

### Patch Changes

- Deduplicate the server methodsMap

## 0.0.5

### Patch Changes

- 3afb252: Fix tsc error on server entry file
- Output typescript files and not js files

## 0.0.4

### Patch Changes

- Fix \_\_dirname
- Removed big dep ts-json-schema-generator

## 0.0.3

### Patch Changes

- Fix \_\_dirname

## 0.0.2

### Patch Changes

- Added experimental --openapi

## 0.0.1

### Patch Changes

- 0eef621: Initial release
