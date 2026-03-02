# @vitejs/plugin-rsc — Framework Author Guide

Comprehensive architecture reference for building RSC-based frameworks on top of
`@vitejs/plugin-rsc`. Covers philosophy, the three-environment model, build pipeline,
entry points, client-side navigation, server functions, CSS, HMR, and production deployment.

Source: https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc

## Philosophy

The plugin is **framework-agnostic** and **runtime-agnostic**. It provides the bundler
plumbing for React Server Components (reference discovery, directive transforms, multi-environment
builds, RSC runtime re-exports) but does not impose routing, data loading, or navigation patterns.
Framework authors build those on top.

The plugin's responsibilities:
- Transform `"use client"` modules into client reference proxies in the RSC environment
- Transform `"use server"` modules into server reference proxies in client/SSR environments
- Manage the multi-pass build pipeline (scan + real builds)
- Provide cross-environment module loading (`import.meta.viteRsc.loadModule`)
- Handle CSS code-splitting and injection across environments
- Provide RSC runtime APIs via `@vitejs/plugin-rsc/rsc`, `/ssr`, `/browser`
- Fire `rsc:update` HMR events when server code changes

The framework's responsibilities:
- Define the three entry points (RSC, SSR, browser)
- Implement routing and URL-based rendering
- Implement client-side navigation (link interception, RSC re-fetching)
- Handle server action dispatch (progressive enhancement, post-hydration calls)
- Handle error boundaries and loading states
- Choose SSR strategy (streaming, static, no-SSR)


## The Three Environments

Vite RSC projects run across three separate Vite environments, each with its own module
graph, transforms, and build output. They share a single Node.js process (no workers).

```
┌──────────────────────────────────────────────────────────────────┐
│                    Single Vite Process                           │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │ RSC environment     │      │ SSR environment     │           │
│  │ (react-server cond) │─────>│ (standard React)    │           │
│  │                     │ RSC  │                     │           │
│  │ renderToReadable    │stream│ createFromReadable   │           │
│  │ Stream()            │      │ Stream()            │           │
│  │                     │      │ renderToReadable     │           │
│  │ Runs server         │      │ Stream() [HTML]     │           │
│  │ components +        │      │                     │           │
│  │ server actions      │      │ Produces HTML +     │           │
│  │                     │      │ embeds flight data  │           │
│  └─────────────────────┘      └─────────────────────┘           │
│                                         │                        │
│                                         │ HTML + <script> tags   │
│                                         │ with RSC flight data   │
│                                         ▼                        │
│                              ┌─────────────────────┐            │
│                              │ Client (browser)    │            │
│                              │                     │            │
│                              │ createFromReadable   │            │
│                              │ Stream() [hydrate]  │            │
│                              │                     │            │
│                              │ Handles navigation  │            │
│                              │ + server fn calls   │            │
│                              └─────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

### Why separate environments?

React ships two versions of itself behind the `react-server` export condition:

- **react-server version**: can serialize React elements to flight streams,
  register client/server references. Cannot render to HTML or DOM. Cannot use
  `useState`, `useEffect`.
- **standard version**: can deserialize flight streams back to React elements,
  render to HTML (`react-dom/server`) or DOM (`react-dom/client`). Cannot serialize.

These are fundamentally different operations requiring different React internals.
A single module graph would load one or the other. The RSC environment loads the
`react-server` version; SSR and client load the standard version. That's the entire
reason for the split.

### Module runners (not workers)

Each environment has a "module runner" — an isolated `import()` function with its own
module cache and transform pipeline. They all execute on the same thread, same event loop,
same V8 isolate. There is no isolation boundary. Think of it as two separate `require`
caches where the same file gets different transforms applied.

In production, the concept disappears. The build outputs are just JS files in separate
directories that `import()` each other.


## Vite Config

Minimal config specifying the three entries:

```ts
import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), rsc()],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          input: { index: './src/framework/entry.rsc.tsx' },
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: { index: './src/framework/entry.ssr.tsx' },
        },
      },
    },
    client: {
      build: {
        rollupOptions: {
          input: { index: './src/framework/entry.browser.tsx' },
        },
      },
    },
  },
})
```

Or use the shorthand:

```ts
rsc({
  entries: {
    rsc: './src/framework/entry.rsc.tsx',
    ssr: './src/framework/entry.ssr.tsx',
    client: './src/framework/entry.browser.tsx',
  },
})
```

### Key plugin options

```ts
rsc({
  // Disable the built-in server handler middleware
  // (use when the framework provides its own server)
  serverHandler: false,

  // Enable fetch-based RPC for cross-runtime environments
  // (e.g., RSC in Cloudflare Worker, SSR in Node)
  loadModuleDevProxy: true,

  // Control automatic CSS injection heuristics
  rscCssTransform: { filter: (id) => id.includes('/app/') },

  // Encryption key for server action closure args
  defineEncryptionKey: 'process.env.MY_KEY',

  // Build-time validation of server-only / client-only imports
  validateImports: true,

  // Custom build orchestration (for frameworks that need control)
  customBuildApp: true,
})
```


## Build Pipeline

### 5-step build (with SSR)

```
rsc(scan) → ssr(scan) → rsc(real) → client → ssr(real)
```

| Step | Phase    | Write | Purpose                                                |
|------|----------|-------|--------------------------------------------------------|
| 1    | RSC scan | No    | Discover `"use client"` → `clientReferenceMetaMap`     |
| 2    | SSR scan | No    | Discover `"use server"` → `serverReferenceMetaMap`     |
| 3    | RSC real | Yes   | Build server components, populate `renderedExports`    |
| 4    | Client   | Yes   | Build client bundle using reference metadata           |
| 5    | SSR real | Yes   | Final SSR build with complete client asset manifest     |

### Why scan is required

> Sources:
> - [plugin-rsc/src/plugins/scan.ts](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/src/plugins/scan.ts) — `transformScanBuildStrip()` that strips code to imports
> - [plugin-rsc/src/plugin.ts](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/src/plugin.ts) — `buildApp()` orchestrates the 5-step build
> - [plugin-rsc/docs/bundler-comparison.md](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/docs/bundler-comparison.md)

The scan exists because of a circular information dependency. The RSC build needs to
know which modules have `"use client"` to generate proxy stubs. The client/SSR build
needs to know which modules have `"use server"` to generate proxy stubs. But `"use server"`
modules are often imported by `"use client"` modules, which the RSC environment doesn't
traverse.

The scan phases are fast — they strip all code to just import statements using
`es-module-lexer` and only traverse the module graph to discover directive boundaries.
No real compilation happens.

The dependency chain:
1. RSC scan walks the RSC module graph, discovers `"use client"` boundaries, records
   their export names in `clientReferenceMetaMap`
2. SSR scan imports `virtual:vite-rsc/client-references` (which re-exports all discovered
   client modules), traverses into them, discovers `"use server"` imports, records in
   `serverReferenceMetaMap`
3. Real builds use both maps to generate correct proxy modules

### 4-step build (without SSR)

```
rsc(scan) → client(scan) → rsc(real) → client(real)
```


## Entry Points — What Each Does

### entry.rsc.tsx (RSC environment)

> Source: [starter/src/framework/entry.rsc.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.rsc.tsx)

The main request handler. Runs under `react-server` condition. Default export must be
`{ fetch: handler }` or `export default handler`.

Responsibilities:
1. Parse the incoming request (differentiate RSC stream requests vs HTML requests vs actions)
2. Handle server actions if POST request
3. Render the React tree to an RSC flight stream via `renderToReadableStream`
4. For RSC-only requests (client navigation), return the raw flight stream
5. For initial page loads, delegate to the SSR environment via `loadModule`

```ts
import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
  decodeAction,
  decodeFormState,
} from '@vitejs/plugin-rsc/rsc'

export type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}

export default { fetch: handler }

async function handler(request: Request): Promise<Response> {
  const renderRequest = parseRenderRequest(request)

  // 1. Handle server actions
  let returnValue, formState, temporaryReferences
  if (renderRequest.isAction) {
    if (renderRequest.actionId) {
      // Post-hydration action call (via setServerCallback)
      temporaryReferences = createTemporaryReferenceSet()
      const body = await request.text()
      const args = await decodeReply(body, { temporaryReferences })
      const action = await loadServerAction(renderRequest.actionId)
      try {
        returnValue = { ok: true, data: await action.apply(null, args) }
      } catch (e) {
        returnValue = { ok: false, data: e }
      }
    } else {
      // Progressive enhancement (form POST before JS loads)
      const formData = await request.formData()
      const decodedAction = await decodeAction(formData)
      const result = await decodedAction()
      formState = await decodeFormState(result, formData)
    }
  }

  // 2. Render RSC stream (after action so render reflects mutations)
  const rscPayload: RscPayload = {
    root: <Root url={renderRequest.url} />,
    formState,
    returnValue,
  }
  const rscStream = renderToReadableStream(rscPayload, { temporaryReferences })

  // 3. RSC-only request (client-side navigation) → return raw stream
  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      headers: { 'content-type': 'text/x-component;charset=utf-8' },
    })
  }

  // 4. Initial page load → delegate to SSR
  const ssrModule = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index')
  const html = await ssrModule.renderHTML(rscStream, { formState })
  return new Response(html.stream, {
    headers: { 'content-type': 'text/html' },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
```

### entry.ssr.tsx (SSR environment)

> Source: [starter/src/framework/entry.ssr.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.ssr.tsx)

Receives the RSC flight stream and renders it to an HTML stream. Uses standard
`react-dom/server`.

Key technique: `.tee()` the RSC stream — one copy for SSR rendering, one copy
embedded in the HTML as `<script>` tags (via `rsc-html-stream`) so the browser can
hydrate without re-fetching.

```ts
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server.edge'
import { injectRSCPayload } from 'rsc-html-stream/server'

export async function renderHTML(
  rscStream: ReadableStream<Uint8Array>,
  options: { formState?: ReactFormState },
) {
  // Split stream: one for SSR, one for client hydration payload
  const [forSSR, forClient] = rscStream.tee()

  // Deserialize RSC stream to React VDOM
  let payload: Promise<RscPayload> | undefined
  function SsrRoot() {
    // Must kick off inside ReactDOMServer context for preinit/preloading
    payload ??= createFromReadableStream<RscPayload>(forSSR)
    return React.use(payload).root
  }

  // Bootstrap script loads the browser entry
  const bootstrapScriptContent =
    await import.meta.viteRsc.loadBootstrapScriptContent('index')

  // Traditional SSR render
  const htmlStream = await renderToReadableStream(<SsrRoot />, {
    bootstrapScriptContent,
    formState: options.formState,
  })

  // Inject RSC flight data into HTML as <script> tags
  const responseStream = htmlStream.pipeThrough(injectRSCPayload(forClient))

  return { stream: responseStream }
}
```

### entry.browser.tsx (client environment)

> Source: [starter/src/framework/entry.browser.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.browser.tsx)

Hydrates the page and handles all post-hydration behavior: navigation, server action
calls, HMR.

The RSC payload is stored as React state. Navigation = new fetch = new payload = re-render
via `startTransition`.

```ts
import {
  createFromReadableStream,
  createFromFetch,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser'
import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { rscStream } from 'rsc-html-stream/client'

async function main() {
  let setPayload: (v: RscPayload) => void

  // Read initial RSC payload from inline <script> tags (no network request)
  const initialPayload = await createFromReadableStream<RscPayload>(rscStream)

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)
    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v))
    }, [setPayload_])
    React.useEffect(() => listenNavigation(() => fetchRscPayload()), [])
    return payload.root
  }

  // Re-fetch RSC on navigation
  async function fetchRscPayload() {
    const req = createRscRenderRequest(window.location.href)
    const payload = await createFromFetch<RscPayload>(fetch(req))
    setPayload(payload)
  }

  // Server action handler (called by React internally after hydration)
  setServerCallback(async (id, args) => {
    const temporaryReferences = createTemporaryReferenceSet()
    const req = createRscRenderRequest(window.location.href, {
      id,
      body: await encodeReply(args, { temporaryReferences }),
    })
    const payload = await createFromFetch<RscPayload>(fetch(req), {
      temporaryReferences,
    })
    setPayload(payload)
    const { ok, data } = payload.returnValue!
    if (!ok) throw data
    return data
  })

  // Hydrate or CSR fallback
  hydrateRoot(document, <BrowserRoot />, {
    formState: initialPayload.formState,
  })

  // HMR: re-fetch RSC when server code changes
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => fetchRscPayload())
  }
}
main()
```


## Client-Side Navigation

The plugin provides no built-in router. Frameworks implement navigation by:

1. Intercepting link clicks and history changes
2. Re-fetching the RSC flight stream for the new URL
3. Updating React state to trigger a re-render via `startTransition`

### Request convention

> Source: [starter/src/framework/request.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/request.tsx)

Frameworks define a convention to distinguish RSC requests from HTML requests.
The starter example appends `_.rsc` to the URL:

```ts
const URL_POSTFIX = '_.rsc'
const HEADER_ACTION_ID = 'x-rsc-action'

// Browser: create a request for RSC stream
export function createRscRenderRequest(
  urlString: string,
  action?: { id: string; body: BodyInit },
): Request {
  const url = new URL(urlString)
  url.pathname += URL_POSTFIX
  const headers = new Headers()
  if (action) headers.set(HEADER_ACTION_ID, action.id)
  return new Request(url.toString(), {
    method: action ? 'POST' : 'GET',
    headers,
    body: action?.body,
  })
}

// Server: parse incoming request
export function parseRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url)
  if (url.pathname.endsWith(URL_POSTFIX)) {
    url.pathname = url.pathname.slice(0, -URL_POSTFIX.length)
    return {
      isRsc: true,
      isAction: request.method === 'POST',
      actionId: request.headers.get(HEADER_ACTION_ID) || undefined,
      request: new Request(url, request),
      url,
    }
  }
  return { isRsc: false, isAction: false, request, url }
}
```

### Navigation listener

> Source: [starter/src/framework/entry.browser.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.browser.tsx) (listenNavigation function)

The `listenNavigation` function intercepts all navigation events and triggers an
RSC re-fetch. This is the standard pattern used in all non-React-Router examples:

```ts
function listenNavigation(onNavigation: () => void) {
  // Back/forward browser buttons
  window.addEventListener('popstate', onNavigation)

  // Monkey-patch pushState to fire callback
  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    const res = oldPushState.apply(this, args)
    onNavigation()
    return res
  }

  // Same for replaceState
  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const res = oldReplaceState.apply(this, args)
    onNavigation()
    return res
  }

  // Intercept same-origin <a> clicks
  function onClick(e: MouseEvent) {
    const link = (e.target as Element).closest('a')
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 &&
      !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault()
      history.pushState(null, '', link.href)
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onNavigation)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}
```

Navigation flow:

```
click <a href="/about">
  → preventDefault()
  → history.pushState(null, '', '/about')
    → monkey-patched pushState fires onNavigation()
      → fetchRscPayload()
        → fetch('/about_.rsc')
          → RSC server renders <Root url="/about" />
          → returns flight stream
        → createFromFetch() deserializes to React VDOM
        → setPayload(newPayload) via startTransition
          → React re-renders, preserving client component state
```

### React Router integration (alternative)

> Sources:
> - [react-router/lib/rsc/server.rsc.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.rsc.ts) — `matchRSCServerRequest()`
> - [react-router/lib/rsc/server.ssr.tsx](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.ssr.tsx) — `routeRSCServerRequest()`, `RSCStaticRouter`
> - [react-router/lib/rsc/browser.tsx](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/browser.tsx) — `RSCHydratedRouter`, `createCallServer`
> - [plugin-rsc react-router example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/react-router)

When using React Router, navigation is fully delegated to React Router's experimental
RSC APIs. The `listenNavigation` pattern is unnecessary. Instead:

- RSC entry uses `matchRSCServerRequest()` from `react-router`
- SSR entry uses `routeRSCServerRequest()` from `react-router`
- Browser entry uses `RSCHydratedRouter` from `react-router/dom`
- Route config uses `unstable_RSCRouteConfigEntry[]`

React Router handles all link interception, data revalidation, and transitions internally.


## Server Actions / Server Functions

### Two calling paths

**Post-hydration (JS available):**
The browser calls `setServerCallback()` during setup. When React calls a server function,
the callback fires. The browser sends a POST with `x-rsc-action` header containing the
action ID and the encoded args as the body. The RSC entry decodes the args, executes the
action, then re-renders the component tree. The response includes both the action return
value and the fresh RSC stream.

**Progressive enhancement (before JS / no JS):**
The `<form action={serverFn}>` submits a standard POST with form data. The RSC entry uses
`decodeAction()` to extract the action, executes it, then uses `decodeFormState()` for
`useActionState` integration. The response is a full HTML page (SSR).

### Key APIs from `@vitejs/plugin-rsc/rsc`

| API                          | Purpose                                    |
|------------------------------|--------------------------------------------|
| `loadServerAction(id)`       | Load a server action by its reference ID   |
| `decodeReply(body, opts)`    | Decode args sent via `encodeReply`          |
| `decodeAction(formData)`     | Decode a form submission into an action fn  |
| `decodeFormState(result, fd)`| Decode form state for `useActionState`      |
| `createTemporaryReferenceSet()` | Track non-serializable args             |

### Key APIs from `@vitejs/plugin-rsc/browser`

| API                          | Purpose                                    |
|------------------------------|--------------------------------------------|
| `setServerCallback(fn)`      | Register the handler React calls for actions|
| `encodeReply(args, opts)`    | Serialize action args for transmission      |
| `createTemporaryReferenceSet()` | Track non-serializable args             |
| `createFromFetch(fetchPromise)` | Deserialize RSC stream from fetch response|

### CSRF protection

> Source: [react-router/lib/actions.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/actions.ts) — `throwIfPotentialCSRFAttack()`

Server actions accept POST requests from the browser. A malicious site can forge
cross-origin form submissions targeting your action endpoints. Frameworks should
validate the `Origin` header on action requests:

```ts
function throwIfCSRFAttack(request: Request, allowedOrigins?: string[]) {
  const origin = request.headers.get('Origin')
  if (!origin) return // same-origin requests may omit Origin

  const requestUrl = new URL(request.url)
  if (origin === requestUrl.origin) return

  if (allowedOrigins?.some((pattern) => origin.match(pattern))) return

  throw new Response('Forbidden: origin mismatch', { status: 403 })
}
```

React Router does this automatically via `throwIfPotentialCSRFAttack` with an
`allowedActionOrigins` option for whitelisting trusted origins.

### Action + rerender streaming

> Sources:
> - [react-router/lib/rsc/server.rsc.ts#L1073-L1093](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.rsc.ts) — server-side action+rerender payload construction
> - [react-router/lib/rsc/browser.tsx#L140-L213](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/browser.tsx) — client-side action+rerender consumption in `createCallServer`

In the basic starter example, actions are sequential: execute the action, then re-render
the entire tree, then send the response. The client waits for everything.

A more sophisticated approach (used by React Router) **streams the action result
immediately** while the revalidation renders in parallel:

```ts
// RSC entry — after executing the action
if (actionResult) {
  const payload: RSCActionPayload = {
    type: 'action',
    actionResult,                     // available to client immediately
    rerender: renderPayloadPromise(), // streams as it completes
  }
  return new Response(renderToReadableStream(payload), {
    headers: { 'content-type': 'text/x-component' },
  })
}
```

On the browser side:

```ts
const payload = await createFromFetch(fetch(actionRequest))
if (payload.type === 'action') {
  // Action result is available immediately for optimistic UI
  const result = await payload.actionResult

  // Rerender streams in the background — when it arrives,
  // update the UI with fresh server-rendered data
  const rerender = await payload.rerender
  if (rerender) {
    startTransition(() => updateRouteState(rerender))
  }
}
```

This means the user sees the action result (success/failure) before the full
re-render completes. For mutations with slow downstream effects (database writes,
cache invalidation), this significantly improves perceived performance.

The key insight: `renderToReadableStream` can serialize **promises** in the payload.
The `actionResult` promise resolves first (it's already settled), then the `rerender`
promise resolves later as the server finishes re-running loaders and rendering
components. The RSC stream sends data incrementally as promises settle.


## RSC Payload Design

The payload is the data structure serialized into the RSC flight stream. It's the
framework's main extensibility point — any serializable data can be included alongside
the rendered component tree. The RSC server serializes it with
`renderToReadableStream(payload)` and the client/SSR deserializes it with
`createFromReadableStream(stream)`.

### Minimal payload (starter example)

```ts
type RscPayload = {
  root: React.ReactNode
  returnValue?: { ok: boolean; data: unknown }
  formState?: ReactFormState
}
```

### Rich payload with typed variants (React Router pattern)

> Source: [react-router/lib/rsc/server.rsc.ts#L239-L281](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.rsc.ts) — `RSCPayload` type definitions

A production framework typically needs more than just `root`. React Router uses a
**discriminated union** with four payload types, which lets the client branch on
`payload.type` to handle each case differently:

```ts
// Discriminated union — the client switches on `type`
type RSCPayload =
  | RSCRenderPayload
  | RSCActionPayload
  | RSCRedirectPayload
  | RSCManifestPayload

type RSCRenderPayload = {
  type: 'render'
  basename: string | undefined
  location: Location
  matches: RSCRouteMatch[]       // per-route rendered elements + metadata
  loaderData: Record<string, any>
  actionData: Record<string, any> | null
  errors: Record<string, any> | null
  formState?: unknown             // for useActionState progressive enhancement
  patches?: RSCRouteManifest[]    // additional routes for lazy discovery
  nonce?: string
}

type RSCActionPayload = {
  type: 'action'
  actionResult: Promise<unknown>            // streams immediately
  rerender?: Promise<RSCRenderPayload>      // streams after revalidation
}

type RSCRedirectPayload = {
  type: 'redirect'
  status: number
  location: string
  replace: boolean              // should the browser replace history entry
  reload: boolean               // should the browser do a full page reload
  actionResult?: Promise<unknown>
}

type RSCManifestPayload = {
  type: 'manifest'
  patches: RSCRouteManifest[]   // route metadata for lazy discovery
}
```

The key idea: the payload is where the framework communicates **control flow** to the
client — not just rendered UI. Redirects, action results, error states, and route
metadata all travel through the same RSC stream. The client deserializes the payload,
checks `type`, and handles each case:

- `render` → update route state, render elements
- `action` → consume action result, wait for rerender
- `redirect` → navigate or reload
- `manifest` → patch route tree for lazy discovery

This avoids needing separate HTTP response mechanisms for different scenarios. Everything
goes through one RSC stream.


## CSS Handling

The plugin auto-injects CSS for server components. When it detects a server component
(function export with capital letter) that imports CSS, it wraps the component to include
`import.meta.viteRsc.loadCss()`.

For manual control or framework-level CSS management:

```tsx
// Collect CSS for specific modules
export function Assets() {
  return (
    <>
      {import.meta.viteRsc.loadCss('/routes/home.tsx')}
      {import.meta.viteRsc.loadCss('/routes/about.tsx')}
    </>
  )
}
```

Disable auto-injection if the framework handles CSS itself:

```ts
rsc({ rscCssTransform: false })
```


## Server vs Client Component Data Passing

> Sources:
> - [react-router/lib/rsc/server.rsc.ts#L1193-L1211](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.rsc.ts) — `isClientReference` check and `WithComponentProps` usage in `getRSCRouteMatch`
> - [react-router/lib/components.tsx#L1941-L1948](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/components.tsx) — `WithComponentProps` implementation

When a framework passes route data (loader results, params, etc.) to components, **server
components and client components receive data differently**.

**Server components** execute during RSC rendering on the server. The framework can pass
data as direct props:

```tsx
// RSC server can call this function, so props work directly
createElement(ServerPage, { loaderData, actionData, params })
```

**Client components** are `"use client"` modules. During RSC rendering they are **not
executed** — React emits a client reference marker instead. The framework can still pass
serializable props through the RSC stream, but for data that lives in framework-level
context (like a router's data store), client components must read it via hooks on the
client side.

React Router's approach (for reference):

```tsx
function renderRouteMatch(match, Component) {
  if (isClientReference(Component)) {
    // Client component: wrap with a client-side provider that
    // reads loaderData/params from router context via hooks,
    // then injects them as props via cloneElement
    return createElement(WithComponentProps, {
      children: createElement(Component),
    })
  }

  // Server component: pass data as props directly
  return createElement(Component, {
    loaderData: match.loaderData,
    actionData: match.actionData,
    params: match.params,
  })
}
```

You can detect client references at render time:

```ts
function isClientReference(component: any): boolean {
  try {
    return component.$$typeof === Symbol.for('react.client.reference')
  } catch {
    return false
  }
}
```

For simpler frameworks without a data router, this distinction matters less. If a server
component renders `<ClientButton label={data.label} />`, React automatically serializes
the `label` prop into the flight stream. The split only matters when data lives in
framework-owned context rather than the component tree.


## Cross-Environment Module Loading

### import.meta.viteRsc.loadModule

Load a module from a different environment. Dev: in-process function call via module runner.
Build: rewritten to a static `import()` between output directories.

```ts
// In RSC entry — load the SSR entry
const ssrModule = await import.meta.viteRsc.loadModule<
  typeof import('./entry.ssr.tsx')
>('ssr', 'index')
```

### import.meta.viteRsc.import (newer API)

Auto-discovers entries without manual `rollupOptions.input` config:

```ts
const ssrModule = await import.meta.viteRsc.import<
  typeof import('./entry.ssr.tsx')
>('./entry.ssr.tsx', { environment: 'ssr' })
```

### import.meta.viteRsc.loadBootstrapScriptContent

Returns the raw JS code that loads the browser entry. Used with `renderToReadableStream`:

```ts
const bootstrapScriptContent =
  await import.meta.viteRsc.loadBootstrapScriptContent('index')
const htmlStream = await renderToReadableStream(reactNode, {
  bootstrapScriptContent,
})
```


## HMR

The plugin fires `rsc:update` on the client HMR channel when server code changes.
Frameworks listen for this and trigger an RSC re-fetch:

```ts
if (import.meta.hot) {
  import.meta.hot.on('rsc:update', () => {
    fetchRscPayload()  // same function used for navigation
  })
}
```

The RSC entry should self-accept to enable efficient hot updates without full reload:

```ts
if (import.meta.hot) {
  import.meta.hot.accept()
}
```


## SSR Error Recovery

> Source: [starter/src/framework/entry.ssr.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.ssr.tsx) and [entry.browser.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.browser.tsx) (`__NO_HYDRATE` flag)

The starter example demonstrates CSR fallback on SSR failure:

```tsx
try {
  htmlStream = await renderToReadableStream(<SsrRoot />, { bootstrapScriptContent })
} catch (e) {
  // Render empty shell, let browser do pure CSR
  htmlStream = await renderToReadableStream(
    <html><body><noscript>SSR failed</noscript></body></html>,
    { bootstrapScriptContent: `self.__NO_HYDRATE=1;` + bootstrapScriptContent },
  )
}
```

Browser entry checks for the flag:

```ts
if ('__NO_HYDRATE' in globalThis) {
  createRoot(document).render(browserRoot)    // CSR from scratch
} else {
  hydrateRoot(document, browserRoot, { ... }) // normal hydration
}
```


## No-SSR Mode

> Source: [plugin-rsc/examples/no-ssr](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/no-ssr)

For SPA-style apps, skip the SSR environment entirely. The RSC entry returns raw flight
streams for all requests. The browser uses `createRoot` instead of `hydrateRoot`.

Config differences:
- No SSR entry in vite config
- RSC entry always returns `text/x-component` responses
- A static `index.html` serves as the SPA shell
- Browser entry fetches RSC stream on mount via `fetch(window.location.href)`

Build is 4 steps instead of 5:
```
rsc(scan) → client(scan) → rsc(real) → client(real)
```


## Browser-Only RSC (No Server at Runtime)

> Source: [plugin-rsc/examples/browser](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/browser)

The `browser` example runs the RSC environment inside the browser itself using Vite's
browser module runner. No server at runtime — the "RSC fetch" is a local function call:

```ts
async function fetchRsc(request: Request): Promise<Response> {
  const module = await loadEntryRsc()  // loads RSC bundle in browser
  return module.default.fetch(request)
}
```

This is an experimental mode. The RSC bundle is built as a browser-compatible module.
Config uses `appType: 'spa'` and `serverHandler: false`.


## Production Deployment

The build produces three directories:

```
dist/
  rsc/         RSC server code (entry point for your server)
  ssr/         SSR rendering code (loaded by RSC via static import)
  client/      Static assets (JS, CSS, images — serve publicly)
```

The RSC entry is the server's request handler. It `import()`s the SSR module directly
(the `loadModule` call gets compiled to a relative `import('../ssr/index.js')`).

Asset manifest is written to both `rsc/` and `ssr/` directories so either can be
deployed independently (e.g., on Cloudflare Workers).


## Cloudflare / Custom Runtime Support

For runtimes where RSC and SSR run in separate isolates (e.g., Cloudflare Workers
with service bindings), enable `loadModuleDevProxy: true`. This makes `loadModule`
use fetch-based RPC with turbo-stream serialization instead of in-process function calls.

You can also override the global for custom module loading:

```ts
globalThis.__VITE_ENVIRONMENT_RUNNER_IMPORT__ = async (envName, id) => {
  return myWorkerRunners[envName].import(id)
}
```


## Known Architectural Constraints

1. **Multi-pass build is inherent to Vite's environment API.** Each environment has its
   own module graph. Unlike Parcel/Turbopack's unified graph with transitions, Vite requires
   sequential scan phases. This cannot be optimized without architectural changes to Vite.

2. **No tree-shaking of unused server functions.** Tracked as a TODO in the source.

3. **CSS from lazy client components may not be present during SSR** (FOUC risk).
   Client components loaded via `React.lazy()` or dynamic imports don't have their CSS
   available at SSR time.

4. **Shared module HMR can cause temporary inconsistency.** When a module is imported by
   both server and client environments, an HMR update triggers both independently, causing
   a brief period where they're out of sync.

5. **The plugin auto-detects server components for CSS injection using heuristics** (capital
   letter function exports). This can miss edge cases. Use manual `loadCss()` or
   `rscCssTransform.filter` for fine-grained control.


## Dependencies

| Package                | Purpose                                         |
|------------------------|-------------------------------------------------|
| `@vitejs/plugin-rsc`   | The RSC bundler plugin                          |
| `@vitejs/plugin-react` | React refresh + JSX transform                   |
| `rsc-html-stream`      | Inject RSC flight data into HTML stream          |
| `react-dom`            | SSR (`server.edge`) and client (`client`)        |
| `react`                | Core React                                       |

The plugin vendors `react-server-dom-webpack` internally. If you install
`react-server-dom-webpack` in your project, the plugin uses yours instead.


## TypeScript

Add to `tsconfig.json` for `import.meta.viteRsc` types:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "@vitejs/plugin-rsc/types"]
  }
}
```

## Reference Links

### @vitejs/plugin-rsc

- [Plugin source](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc)
- [plugin.ts](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/src/plugin.ts) — main plugin, `buildApp()`, reference maps
- [plugins/scan.ts](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/src/plugins/scan.ts) — scan build strip transform
- [Architecture docs](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/docs/architecture.md)
- [Bundler comparison](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/docs/bundler-comparison.md)
- [README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/README.md)

### Examples

- [Starter example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/starter) — canonical framework skeleton with SSR, navigation, actions
  - [entry.rsc.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.rsc.tsx)
  - [entry.ssr.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.ssr.tsx)
  - [entry.browser.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/entry.browser.tsx)
  - [request.tsx](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/starter/src/framework/request.tsx) — `_.rsc` request convention, `listenNavigation`
- [Basic example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/basic) — file-based routing with `use cache`
- [React Router example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/react-router) — React Router RSC integration
- [No-SSR example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/no-ssr)
- [Browser-only example](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/browser) — RSC in the browser, no server at runtime

### React Router RSC implementation

- [lib/rsc/server.rsc.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.rsc.ts) — `matchRSCServerRequest()`, payload types, `AsyncLocalStorage` context, action processing, `isClientReference` check
- [lib/rsc/server.ssr.tsx](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/server.ssr.tsx) — `routeRSCServerRequest()`, `RSCStaticRouter`, redirect detection, `injectRSCPayload`
- [lib/rsc/browser.tsx](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/rsc/browser.tsx) — `RSCHydratedRouter`, `createCallServer`, action+rerender streaming, lazy route discovery via `.manifest`
- [lib/components.tsx](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/components.tsx) — `WithComponentProps`, `WithErrorBoundaryProps` (client-side data injection wrappers)
- [lib/actions.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router/lib/actions.ts) — `throwIfPotentialCSRFAttack()`
- [react-router-dev/vite/rsc/plugin.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router-dev/vite/rsc/plugin.ts) — Vite plugin for React Router RSC
- [react-router-dev/vite/rsc/virtual-route-modules.ts](https://github.com/remix-run/react-router/blob/dev/packages/react-router-dev/vite/rsc/virtual-route-modules.ts) — route module splitting into server/client virtual modules

### Other references

- [rsc-html-stream](https://github.com/devongovett/rsc-html-stream) — inject RSC flight data into HTML stream
- [hono-rsc-template](https://github.com/yoshikouki/hono-rsc-template) — Hono + RSC with `/__rsc/` prefix pattern
- [Dan Abramov: Why Does RSC Integrate with a Bundler?](https://overreacted.io/why-does-rsc-integrate-with-a-bundler/)
- [Devon Govett: How Parcel bundles RSC](https://devongovett.me/blog/parcel-rsc.html)
