# Multi-Bundler RSC Abstraction Plan

Abstract spiceflow's React Server Components implementation so it works with Vite, Parcel, and Bun (and potentially other bundlers in the future).

---

## Phase 1 Status: COMPLETE

The adapter abstraction layer is fully implemented. All entry points (`entry.ssr.tsx`, `entry.client.tsx`, `entry.rsc.tsx`, `spiceflow.tsx`) now import from `virtual:bundler-adapter/*` instead of directly from Vite packages. The Vite adapter files exist and the virtual module resolution is wired in `vite.tsx`.

**Implemented files:**
- `spiceflow/src/react/adapters/types.ts` — 3 adapter interfaces (`RscServerAdapter`, `RscSsrAdapter`, `RscClientAdapter`)
- `spiceflow/src/react/adapters/vite-server.ts` — re-exports from `@vitejs/plugin-rsc/rsc`
- `spiceflow/src/react/adapters/vite-ssr.ts` — wraps `@vitejs/plugin-rsc/ssr` + `import.meta.viteRsc` APIs
- `spiceflow/src/react/adapters/vite-client.ts` — wraps `@vitejs/plugin-rsc/browser` + Vite HMR/error overlay
- `spiceflow/src/vite.tsx:168-178` — resolves `virtual:bundler-adapter/*` to Vite adapter files
- `spiceflow/src/react/types/ambient.d.ts` — declares all `virtual:bundler-adapter/*` module types

**All entry points are bundler-agnostic.** Adding a new bundler means:
1. Write 3 adapter files (~30-50 lines each)
2. Write the bundler plugin that resolves `virtual:bundler-adapter/*` + `virtual:app-entry` + `virtual:app-styles`
3. Handle bundler-specific concerns (CSS, HMR, error overlay)

---

## What's Shared Across All Bundlers

All bundlers use the **exact same React Flight protocol**. The following are identical:

- The RSC payload format (React Flight)
- `rsc-html-stream` for injecting RSC payload into HTML
- `ReactDOMServer.renderToReadableStream` for SSR
- The overall flow: RSC render -> tee stream -> SSR to HTML + inject payload -> hydrate on client
- Server action protocol (POST with action ID, decode args, call action, return result)
- The function signatures of the RSC APIs (`renderToReadableStream`, `createFromReadableStream`, `decodeReply`, etc.)

---

## What Differs Per Bundler

| Concern | Vite | Parcel | Bun |
|---|---|---|---|
| RSC renderer package | `react-server-dom-webpack` (via `@vitejs/plugin-rsc`) | `react-server-dom-parcel` | `react-server-dom-webpack` (direct, no wrapper) |
| Bootstrap script injection | `import.meta.viteRsc.loadBootstrapScriptContent()` | `options.component.bootstrapScript` via Parcel runtime proxy | Read from `Bun.build()` manifest, construct `<script>` tag manually |
| Cross-environment imports | `import.meta.viteRsc.import('./entry.rsc', {environment: 'rsc'})` | Direct `import()` (single server target) | Direct `import()` in prod (single process). No dev-mode equivalent. |
| HMR events | `import.meta.hot.on('rsc:update', ...)` | `parcelhmrreload` browser event | None — Bun has no RSC HMR |
| CSS collection | Module graph traversal + `.vite/manifest.json` | Automatic (Parcel runtime handles it) | Read from `Bun.build()` output artifacts |
| Virtual modules | `createVirtualPlugin()` | Parcel resolvers + directives | `onResolve` + `onLoad` plugin hooks |
| Entry point config | Explicit `entries: { rsc, ssr, client }` in plugin config | Discovered from directives in source code | Explicit `entrypoints` in `Bun.build()` config |
| Error overlay | `vite-error-overlay` custom element | Parcel's own error overlay | None |
| Dev server | Full multi-environment dev (RSC + SSR + client) | `@parcel/rsc/node` + Parcel dev server | **None** — Bun has no RSC dev server |
| `"use client"` / `"use server"` handling | `@vitejs/plugin-rsc` auto-splits at boundaries | Parcel auto-detects directives | `bun build --server-components` splits via Zig bundler |

---

## Phase 2: Add Parcel Support

### Parcel adapter files

**`spiceflow/src/react/adapters/parcel-server.ts`** (RSC environment)

```ts
export {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  decodeAction,
  decodeFormState,
  loadServerAction,
} from 'react-server-dom-parcel/server.edge'
```

**`spiceflow/src/react/adapters/parcel-ssr.ts`** (SSR environment)

```ts
export { createFromReadableStream } from 'react-server-dom-parcel/client.edge'

export async function loadBootstrapScriptContent(): Promise<string> {
  // Parcel handles this automatically via renderRequest options.component.
  // This function should not be called in Parcel — SSR is handled by @parcel/rsc/node.
  throw new Error('loadBootstrapScriptContent is not used with Parcel')
}

export async function importRscEnvironment(): Promise<any> {
  // Parcel builds server as a single target, direct import works.
  return import('../entry.rsc.js')
}
```

**`spiceflow/src/react/adapters/parcel-client.ts`** (browser)

```ts
export {
  createFromReadableStream,
  createFromFetch,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from 'react-server-dom-parcel/client'

export function onHmrUpdate(callback: () => void) {
  window.addEventListener('parcelhmrreload', (e: Event) => {
    e.preventDefault()
    callback()
  })
}

export function onHmrError() {
  // Parcel handles error overlay automatically
}
```

### Parcel plugin (`spiceflow/src/parcel.ts`)

This is the most complex step. Parcel's plugin system uses transformers, runtimes, and namers instead of Vite's hooks. The plugin needs to:

1. Configure Parcel targets — set `react-server` context for the server entry
2. Inject `"use server-entry"` directive into spiceflow's app entry (or create a wrapper module)
3. Inject `"use client-entry"` into spiceflow's client entry
4. Resolve `virtual:bundler-adapter/*` to the Parcel adapter files (Parcel resolvers)
5. Auto `"use client"` injection — same transform as Vite but using Parcel's transformer plugin API
6. Production build config — output dist structure matching what the Node launcher expects

Key difference: Parcel discovers boundaries from directives rather than explicit entry config. The SSR flow can either use `@parcel/rsc/node` directly (higher level) or `react-server-dom-parcel` through the adapter (lower level, keeps spiceflow in control).

**Recommended: use `react-server-dom-parcel` directly** — keeps the rendering pipeline identical across bundlers.

### CSS handling

- **Vite dev:** Collects CSS via module graph traversal (`css.tsx`)
- **Vite build:** Reads from `.vite/manifest.json`
- **Parcel:** CSS is extracted and injected automatically by the bundler. `virtual:app-styles` returns `[]`.

### Parcel example app

New directory: `example-react-parcel/` mirroring `example-react/` structure with Parcel config.

---

## Phase 3: Add Bun Support

> **Source files referenced in this section** (all paths relative to [`oven-sh/bun`](https://github.com/oven-sh/bun) repo):
>
> - `src/bake/bun-framework-react/client.tsx` — browser entry (hydration, navigation, CSS, HMR)
> - `src/bake/bun-framework-react/server.tsx` — RSC server entry (rendering, actions, SSG)
> - `src/bake/bun-framework-react/ssr.tsx` — SSR entry (HTML generation, RSC payload injection)
> - `src/bake/bun-framework-react/index.ts` — `Bake.Framework` config definition
> - `src/bake/bake.d.ts` — full TypeScript types for `Bake.Framework`, `Bake.RouteMetadata`, `bun:bake/server`, `bun:bake/client`
> - `src/bake/bake.private.d.ts` — internal types including `react-server-dom-bun` module declarations
> - `src/bake/DevServer.zig` — Zig-native RSC dev server
> - `src/bake/production.zig` — production build
> - `src/bake/hmr-runtime-client.ts` — client HMR runtime (websocket, module replacement, CSS reload)
> - `src/bake/hmr-runtime-server.ts` — server HMR runtime (request handling, module loading, manifests)
> - `src/bake/client/overlay.ts` — error overlay UI
> - `src/bake/client/css-reloader.ts` — CSS hot reload logic
> - `test/bake/` — test fixtures and harness (`bake-harness.ts`, `dev/react-spa.test.ts`, etc.)
> - `src/bundler/bundle_v2.zig` — bundler RSC graph splitting, boundary detection, manifest generation
> - `src/js_ast.zig:7823` — `UseDirective` enum and parser
> - `src/bun.js/api/JSBundler.zig:489` — `ServerComponents` config struct

### Background: What Bun Actually Has

Bun has a **full RSC framework system called "Bake"** (formerly "Kit"), located in `src/bake/`. This is far more complete than the old `bun-plugin-server-components` npm package — it includes a multi-environment dev server with HMR, production builds, SSG, and a built-in React framework (`bun-framework-react`).

The reference implementation at `src/bake/bun-framework-react/` consists of 4 files:

| File | Role | React package used |
|---|---|---|
| `client.tsx` (470 lines) | Browser entry, hydration, client-side navigation, CSS management | `react-server-dom-bun/client.browser` |
| `server.tsx` (240 lines) | RSC rendering, server actions, prerendering/SSG | `react-server-dom-bun/server.node.unbundled.js` |
| `ssr.tsx` (416 lines) | SSR-to-HTML with RSC payload injection via custom `RscInjectionStream` | `react-server-dom-bun/client.node.unbundled.js` + `react-dom/server.node` |
| `index.ts` (42 lines) | Framework config — registers routes, entries, server components options | `Bake.Framework` type |

**Key finding: Bun uses `react-server-dom-bun`** — its own React Flight package, not `react-server-dom-webpack`. This is different from what the old `bun-plugin-server-components` suggested.

### Bun-Specific APIs Used by `bun-framework-react`

#### `bun:bake/server` — Server-side manifests

```ts
import { serverManifest } from 'bun:bake/server'
import { ssrManifest } from 'bun:bake/server'
```

- **`serverManifest: ServerManifest`** — Maps combined component IDs (`"components/Navbar.tsx#default"`) to `{ id, name, chunks }`. Passed to `renderToPipeableStream()` as the webpack map argument. This is what React uses to resolve `"use client"` references.
- **`ssrManifest: SSRManifest`** — Maps client-side file IDs to `{ specifier, name }` for SSR imports. Passed to `createFromNodeStream()` so React can resolve client components during SSR.
- **`actionManifest`** — Declared but not yet implemented (`never` type). Reserved for server actions.

```ts
// ServerManifest shape:
interface ServerManifest {
  [combinedComponentId: string]: {
    id: string      // correlates to filename
    name: string    // correlates to export name
    chunks: []      // always empty currently
  }
}

// SSRManifest shape:
interface SSRManifest {
  [id: string]: {
    [name: string]: {
      specifier: string  // valid import specifier
      name: string       // export name
    }
  }
}
```

#### `bun:bake/client` — Client-side HMR hook

```ts
import { onServerSideReload } from 'bun:bake/client'
```

- **`onServerSideReload(cb: () => void | Promise<void>): Promise<void>`** — Registers a callback invoked when server-side code changes. The framework uses this to refetch the RSC payload without a full page reload. Only one callback can be active. This is Bun's equivalent of Vite's `import.meta.hot.on('rsc:update', ...)`.

#### `react-server-dom-bun` — Bun-specific React Flight

Three subpackages used:

```ts
// Server (RSC environment, react-server conditions):
import { renderToPipeableStream } from 'react-server-dom-bun/server.node.unbundled.js'
// Returns { pipe, abort }. Uses Node.js streams (PassThrough), not web ReadableStream.

// SSR environment:
import { createFromNodeStream } from 'react-server-dom-bun/client.node.unbundled.js'
// Takes a Node.js Readable + manifest options { moduleMap, moduleLoading }

// Browser:
import { createFromReadableStream } from 'react-server-dom-bun/client.browser'
// Takes a web ReadableStream, returns Promise<T>
```

**Critical difference from Vite/Parcel:** Bun's server-side RSC uses **Node.js streams** (`renderToPipeableStream` + `PassThrough`), not web `ReadableStream`. Vite uses `renderToReadableStream` (web streams). This affects the adapter signatures.

#### `Bun.serve({ app })` — Bake integration point

```ts
Bun.serve({
  app: {
    framework: 'react',  // or a Bake.Framework config object
    bundlerOptions: { ... },
    plugins: [ ... ],
  }
})
```

This is the user-facing API. Bake is configured via `Bun.serve()` options, not a separate build command. The dev server, production build, and SSG are all driven from this single entry point.

#### `Bake.Framework` — Framework registration

```ts
const framework: Bake.Framework = {
  fileSystemRouterTypes: [{
    root: 'pages',
    clientEntryPoint: 'bun-framework-react/client.tsx',
    serverEntryPoint: 'bun-framework-react/server.tsx',
    extensions: ['jsx', 'tsx'],
    style: 'nextjs-pages',
    layouts: true,
    ignoreUnderscores: true,
  }],
  staticRouters: ['public'],
  reactFastRefresh: {
    importSource: 'react-refresh/runtime',
  },
  serverComponents: {
    separateSSRGraph: true,
    serverRegisterClientReferenceExport: 'registerClientReference',
    serverRuntimeImportSource: 'react-server-dom-webpack/server',
  },
  builtInModules: [
    { import: 'bun-framework-react/client.tsx', path: require.resolve('./client.tsx') },
    { import: 'bun-framework-react/server.tsx', path: require.resolve('./server.tsx') },
    { import: 'bun-framework-react/ssr.tsx', path: require.resolve('./ssr.tsx') },
  ],
  bundlerOptions: {
    ssr: { conditions: ['react-server'] },
  },
}
```

Key fields:
- **`serverComponents.separateSSRGraph: boolean`** — When `true`, client components get a separate SSR bundling graph without `react-server` condition. This is what enables server components and client components to use different React runtimes in the same process.
- **`serverComponents.serverRuntimeImportSource`** — Package that exports `registerClientReference`. Bun generates stub modules at `"use client"` boundaries that call this function.
- **`serverComponents.serverRegisterClientReferenceExport`** — Export name to use from the runtime source (default `"registerClientReference"`).
- **`fileSystemRouterTypes[].style`** — `"nextjs-pages"` | `"nextjs-app-ui"` | `"nextjs-app-routes"` | custom function.

#### `Bake.RouteMetadata` — Route info passed to server entry

```ts
interface RouteMetadata {
  readonly pageModule: any         // the loaded route module
  readonly layouts: ReadonlyArray<any>  // layout chain, inner-first
  readonly params: Record<string, string | string[]> | null
  readonly modules: ReadonlyArray<string>      // JS files needed for interactivity
  readonly modulepreload: ReadonlyArray<string> // JS files to preload
  readonly styles: ReadonlyArray<string>        // CSS files for the route
}
```

The framework's `server.tsx` receives this and builds the React tree:
```ts
export async function render(request: Request, meta: Bake.RouteMetadata): Promise<Response>
```

#### `import ... with { bunBakeGraph: 'ssr' }` — Cross-graph imports

```ts
import { renderToHtml } from 'bun-framework-react/ssr.tsx' with { bunBakeGraph: 'ssr' }
```

This is how `server.tsx` (running in the RSC/react-server graph) imports code from the SSR graph. It's Bun's equivalent of Vite's `import.meta.viteRsc.import('./entry.rsc', { environment: 'rsc' })` but going the other direction (server -> SSR rather than SSR -> server).

#### RSC payload streaming via `__bun_f`

The client reads the initial RSC payload from inline `<script>` tags:

```ts
// Server injects: <script>(self.__bun_f ??= []).push(chunk)</script>
// Client converts to ReadableStream:
const rscPayload = createFromReadableStream(
  new ReadableStream({
    start(controller) {
      (self.__bun_f ||= []).forEach((__bun_f.push = handleChunk))
      document.addEventListener('DOMContentLoaded', () => controller.close())
    },
  }),
)
```

This is similar to spiceflow's `rsc-html-stream` approach but with a different encoding — Bun uses `__bun_f` array with single-quoted string escaping, while spiceflow uses `rsc-html-stream/client` with `<script>` tag injection via `injectRSCPayload()`.

#### CSS metadata in RSC response

For client-side navigation, Bun prepends a 4-byte length header + CSS file list to the RSC response:

```ts
// Server side (server.tsx):
const int = Buffer.allocUnsafe(4)
const str = meta.styles.join('\n')
int.writeUInt32LE(str.length, 0)
rscPayload.write(int)
rscPayload.write(str)

// Client side (client.tsx):
const header = (await reader.read(new Uint32Array(1))).value
const cssRaw = (await reader.read(new Uint8Array(header[0]))).value
currentCssList = td.decode(cssRaw).split('\n')
```

This is a binary framing protocol specific to Bun's implementation. Spiceflow doesn't need this — it handles CSS via `virtual:app-styles`.

### Approach: Two integration paths

Unlike the earlier assumption that Bun had no dev server, Bake provides both dev and production. There are two ways to integrate:

**Path A: Bake adapter (deep integration)**
Write a spiceflow adapter that maps to Bake's `Bake.Framework` API. Spiceflow becomes a Bake framework, similar to how `bun-framework-react` works. This gives us both dev and prod via `Bun.serve({ app: { framework: spiceflowFramework } })`.

**Challenges:**
- Bake uses `react-server-dom-bun` (Node.js streams: `renderToPipeableStream`), while spiceflow's entry points use web `ReadableStream` APIs (`renderToReadableStream`). The adapter would need to bridge between stream types.
- Bake's routing is filesystem-based (`Bake.FrameworkFileSystemRouterType`), while spiceflow uses programmatic `.page()` / `.route()` definitions. Would need a custom `style` function or a virtual filesystem.
- Bake provides `RouteMetadata` with `pageModule`, `layouts`, `styles`, `modules` — spiceflow would need to map its own route/layout system to this shape.
- The `bun:bake/server` manifests (`serverManifest`, `ssrManifest`) are generated by Bake's bundler. The adapter would use these instead of building its own.

**Path B: Standalone build (shallow integration)**
Use `Bun.build()` with the lower-level bundler APIs (`--server-components` flag, `UseDirective` parsing, graph splitting) for production builds only. Dev stays on Vite. This is simpler but doesn't leverage Bake's dev server.

**Recommendation: Path A** — Bake already solves the hard problems (multi-environment dev, RSC HMR, manifest generation, CSS tracking). Fighting against it would be duplicating work.

### Bun adapter files (Path A)

**`spiceflow/src/react/adapters/bun-server.ts`** (RSC environment)

```ts
// Bun uses react-server-dom-bun with Node.js streams, not web ReadableStream.
// The adapter bridges between Bake's pipeable streams and spiceflow's
// RscServerAdapter interface which expects web ReadableStream.
import {
  renderToPipeableStream as _renderToPipeableStream,
} from 'react-server-dom-bun/server.node.unbundled.js'
import { serverManifest } from 'bun:bake/server'
import { PassThrough } from 'node:stream'

export function renderToReadableStream(
  model: any,
  options?: { temporaryReferences?: any; onError?: (error: any) => string | void; signal?: AbortSignal },
): ReadableStream {
  const passThrough = new PassThrough()
  const { pipe, abort } = _renderToPipeableStream(model, serverManifest, {
    onError: options?.onError,
    temporaryReferences: options?.temporaryReferences,
  })
  pipe(passThrough)
  if (options?.signal) {
    options.signal.addEventListener('abort', () => abort())
  }
  // Convert Node.js Readable to web ReadableStream
  return Readable.toWeb(passThrough) as ReadableStream
}

export { createTemporaryReferenceSet } from 'react-server-dom-bun/server.node.unbundled.js'

// Server actions: action manifest is not yet implemented in Bake (declared as `never`).
// For now, use the same pattern as bun-framework-react: action IDs encode
// the module path and export name.
export async function loadServerAction(id: string): Promise<Function> {
  const [modulePath, exportName] = id.split('#')
  const mod = await import(modulePath)
  return mod[exportName || 'default']
}

// These may need custom implementations or stubs depending on
// whether react-server-dom-bun exposes them:
export async function decodeReply(body: string | FormData, options?: any): Promise<any[]> {
  const { decodeReply } = await import('react-server-dom-bun/server.node.unbundled.js')
  return decodeReply(body, serverManifest, options)
}

export async function decodeAction(formData: FormData): Promise<() => Promise<any>> {
  const { decodeAction } = await import('react-server-dom-bun/server.node.unbundled.js')
  return decodeAction(formData, serverManifest)
}

export async function decodeFormState(result: any, formData: FormData): Promise<any> {
  const { decodeFormState } = await import('react-server-dom-bun/server.node.unbundled.js')
  return decodeFormState(result, formData)
}
```

**`spiceflow/src/react/adapters/bun-ssr.ts`** (SSR environment)

```ts
import { createFromNodeStream } from 'react-server-dom-bun/client.node.unbundled.js'
import { ssrManifest } from 'bun:bake/server'
import { Readable } from 'node:stream'

// Bridge: spiceflow passes web ReadableStream, but Bun's createFromNodeStream
// expects a Node.js Readable.
export async function createFromReadableStream<T>(stream: ReadableStream): Promise<T> {
  const nodeStream = Readable.fromWeb(stream)
  return createFromNodeStream<T>(nodeStream, {
    moduleMap: ssrManifest,
    moduleLoading: { prefix: '/' },
  })
}

// Bake injects bootstrap modules via RouteMetadata.modules, which are passed
// to react-dom's renderToPipeableStream as `bootstrapModules`.
// The adapter reads these from the route context.
export async function loadBootstrapScriptContent(): Promise<string> {
  // In Bake, bootstrap scripts are handled differently — they're passed as
  // `bootstrapModules` to react-dom's renderToPipeableStream, not as inline
  // script content. This function returns a minimal bootstrap that loads
  // the client entry.
  // The actual client entry URL comes from Bake's build system.
  throw new Error(
    'loadBootstrapScriptContent is not used with Bake — ' +
    'use bootstrapModules from RouteMetadata.modules instead'
  )
}

// In Bake, cross-graph imports use `with { bunBakeGraph: 'ssr' }` attribute.
// The SSR -> RSC direction uses direct import since both run in the same process.
export async function importRscEnvironment(): Promise<typeof import('../entry.rsc.js')> {
  return import('../entry.rsc.js')
}
```

**`spiceflow/src/react/adapters/bun-client.ts`** (browser)

```ts
export { createFromReadableStream } from 'react-server-dom-bun/client.browser'

// createFromFetch may not exist in react-server-dom-bun — implement via createFromReadableStream
import { createFromReadableStream as _createFromReadableStream } from 'react-server-dom-bun/client.browser'

export async function createFromFetch<T>(
  responsePromise: Promise<Response>,
  opts?: { temporaryReferences?: any },
): Promise<T> {
  const response = await responsePromise
  return _createFromReadableStream<T>(response.body!)
}

// These may or may not be exported by react-server-dom-bun/client.browser.
// Need to verify — if not, provide stubs or import from the right subpath.
export function createTemporaryReferenceSet(): any {
  // TODO: check if react-server-dom-bun exports this
  return new Set()
}

export async function encodeReply(args: any[], opts?: { temporaryReferences?: any }): Promise<any> {
  // TODO: check if react-server-dom-bun exports this
  const { encodeReply } = await import('react-server-dom-bun/client.browser')
  return encodeReply(args, opts)
}

export function setServerCallback(cb: (id: string, args: any[]) => Promise<any>): void {
  // TODO: check if react-server-dom-bun exports this or if it's handled differently
}

export function onHmrUpdate(callback: () => void) {
  // Use Bake's HMR hook
  import('bun:bake/client').then(({ onServerSideReload }) => {
    onServerSideReload(() => {
      console.log('[bun:bake] server-side reload')
      callback()
    })
  })
}

export function onHmrError() {
  // Bake has its own error overlay (src/bake/client/overlay.ts)
  // No additional setup needed — it's injected by the HMR runtime automatically.
}
```

### Stream bridging challenge

The biggest technical challenge is the **stream type mismatch**:

| Layer | Spiceflow (Vite) | Bun Bake |
|---|---|---|
| RSC render | `renderToReadableStream()` → web `ReadableStream` | `renderToPipeableStream()` → Node.js `{ pipe, abort }` |
| SSR consume | `createFromReadableStream()` ← web `ReadableStream` | `createFromNodeStream()` ← Node.js `Readable` |
| SSR render | `ReactDOMServer.renderToReadableStream()` → web `ReadableStream` | `react-dom/server.node` `renderToPipeableStream()` → Node.js `{ pipe }` |
| Client consume | `createFromReadableStream()` ← web `ReadableStream` | `createFromReadableStream()` ← web `ReadableStream` |

The server-side adapters need to convert between Node.js streams and web streams. Bun has built-in `Readable.toWeb()` and `Readable.fromWeb()` which makes this feasible but adds overhead.

**Alternative approach:** Modify spiceflow's entry points to detect the stream type and branch accordingly. Or accept that the Bun adapter will have slightly different performance characteristics due to stream conversion.

### What Bake handles that spiceflow currently does itself

| Concern | Spiceflow does it in | Bake handles it in |
|---|---|---|
| RSC payload injection into HTML | `transform.ts` (`injectRSCPayload`) | `ssr.tsx` (`RscInjectionStream`) — custom class that intercepts `</script>` and `</body>` boundaries |
| Client-side RSC hydration | `entry.client.tsx` via `rsc-html-stream/client` | `client.tsx` via `self.__bun_f` array pattern |
| Client-side navigation | `entry.client.tsx` + `router.ts` | `client.tsx` — global click listener + `goto()` + history API |
| CSS injection during SSR | `virtual:app-styles` module | `RouteMetadata.styles` + `<link data-bake-ssr>` tags |
| CSS management during navigation | Not implemented (full page) | `client.tsx` — binary CSS metadata header + `link.disabled` toggle |
| Error handling | `ssr-error-fallback` + `__NO_HYDRATE` | `client/overlay.ts` — dedicated error overlay UI |
| Bootstrap script | `loadBootstrapScriptContent()` → inline `<script>` | `RouteMetadata.modules` → `<script type="module">` via `bootstrapModules` |

### Integration strategy

Rather than fighting Bake's architecture, the integration should **let Bake be the framework layer** and map spiceflow's API surface onto it:

1. **Spiceflow as a Bake framework** — Create a `Bake.Framework` config that points Bake at spiceflow's entry points
2. **Route mapping** — Implement a custom `style` function for `fileSystemRouterTypes` that reads spiceflow's programmatic routes instead of filesystem
3. **Server entry** — Write a `bake-server.tsx` that wraps spiceflow's `app.handle()` and maps `Bake.RouteMetadata` to spiceflow's route system
4. **SSR entry** — Can reuse most of spiceflow's `entry.ssr.tsx` logic but adapted for Node.js streams
5. **Client entry** — Can reuse most of spiceflow's `entry.client.tsx` but use `bun:bake/client` for HMR

### Open questions

1. **Does `react-server-dom-bun` export `createFromFetch`, `encodeReply`, `createTemporaryReferenceSet`, `setServerCallback`?** These are used by spiceflow's client entry. Need to check the actual package exports. If not, server actions may need a different approach.

2. **Can Bake work with programmatic routes?** The `fileSystemRouterTypes[].style` field accepts a custom function, but all examples use filesystem routing. Spiceflow's `.page()` API builds routes in code. May need to generate a virtual filesystem or use a different Bake API.

3. **Is `actionManifest` coming soon?** Currently `never` type. Server actions in spiceflow rely on `loadServerAction` which needs a manifest. If Bake doesn't provide one, we need to build our own action resolution.

4. **How does Bake handle `Bun.serve()` in production?** The dev server is Zig-native (`DevServer.zig`). Production uses `production.zig`. Need to understand if there's a JS-level production API or if it's all handled by `Bun.serve({ app })`.

### Testing strategy

1. **Unit tests** — Verify stream bridging (web ↔ Node.js) works correctly in both directions
2. **Build integration** — Create a `bake-example/` that uses spiceflow as a Bake framework, verify dev server starts and serves pages
3. **E2e tests** — Run the existing Playwright test suite against the Bake-served app (same tests, Bun runtime)
4. **HMR tests** — Verify that `onServerSideReload` triggers RSC re-render on file changes
5. **Regression** — All existing Vite e2e tests must still pass

---

## File Changes Summary

### Phase 1 (COMPLETE)

| File | Status |
|---|---|
| `spiceflow/src/react/adapters/types.ts` | Done |
| `spiceflow/src/react/adapters/vite-server.ts` | Done |
| `spiceflow/src/react/adapters/vite-ssr.ts` | Done |
| `spiceflow/src/react/adapters/vite-client.ts` | Done |
| `spiceflow/src/vite.tsx` (virtual module resolution) | Done |
| `spiceflow/src/react/entry.ssr.tsx` (adapter imports) | Done |
| `spiceflow/src/react/entry.client.tsx` (adapter imports) | Done |
| `spiceflow/src/spiceflow.tsx` (adapter imports) | Done |
| `spiceflow/src/react/types/ambient.d.ts` (module declarations) | Done |

### Phase 2: Parcel

| File | Purpose |
|---|---|
| `spiceflow/src/react/adapters/parcel-server.ts` | Parcel RSC environment adapter |
| `spiceflow/src/react/adapters/parcel-ssr.ts` | Parcel SSR environment adapter |
| `spiceflow/src/react/adapters/parcel-client.ts` | Parcel browser adapter |
| `spiceflow/src/parcel.ts` | Parcel plugin (transformers, resolvers, runtimes) |
| `example-react-parcel/` | Parcel example app |

### Phase 3: Bun (via Bake)

| File | Purpose |
|---|---|
| `spiceflow/src/react/adapters/bun-server.ts` | Bun RSC environment adapter — bridges `react-server-dom-bun` (Node.js streams) to spiceflow's web `ReadableStream` interface. Uses `bun:bake/server` manifests. |
| `spiceflow/src/react/adapters/bun-ssr.ts` | Bun SSR environment adapter — wraps `createFromNodeStream` with web-to-Node stream conversion. Uses `ssrManifest` from `bun:bake/server`. |
| `spiceflow/src/react/adapters/bun-client.ts` | Bun browser adapter — uses `react-server-dom-bun/client.browser` + `bun:bake/client` for HMR via `onServerSideReload`. |
| `spiceflow/src/bake-framework.ts` | `Bake.Framework` config — registers spiceflow as a Bake framework with custom route style, entry points, and server components options. |
| `spiceflow/src/react/bake-server.tsx` | Bake server entry — wraps spiceflow's `app.handle()` and maps `Bake.RouteMetadata` to spiceflow's route system. |
| `bake-example/` | Example app using `Bun.serve({ app: { framework: spiceflowBakeFramework } })` |

---

## Complexity Assessment

| Component | Difficulty | Notes |
|---|---|---|
| **Phase 1** | | |
| Adapter interface + types | Low | Done |
| Vite adapters (3 files) | Low | Done |
| Entry point refactors | Medium | Done |
| Virtual module resolution in vite.tsx | Low | Done |
| **Phase 2: Parcel** | | |
| Parcel adapters (3 files) | Medium | Bootstrap script injection works differently |
| Parcel plugin (`parcel.ts`) | **High** | Fundamentally different plugin system (transformers, runtimes, namers, resolvers) |
| CSS handling | Medium | Different mental model (automatic vs explicit) |
| Parcel example app | Medium | Wiring up the plugin end-to-end |
| **Phase 3: Bun (via Bake)** | | |
| Bun adapters (3 files) | **Medium-High** | Stream type bridging (Node.js ↔ web) is the main challenge. `bun-server.ts` must wrap `renderToPipeableStream` to return web `ReadableStream`. Need to verify which APIs `react-server-dom-bun` actually exports. |
| Bake framework config (`bake-framework.ts`) | Medium | Map spiceflow's programmatic routes to Bake's `FrameworkFileSystemRouterType`. May need custom `style` function. |
| Bake server entry (`bake-server.tsx`) | Medium | Bridge between `Bake.RouteMetadata` and spiceflow's `app.handle()`. Need to map layouts, params, modules, styles. |
| `loadServerAction` | Medium | `actionManifest` is not yet implemented in Bake. Must parse action IDs manually (`path#export` format). |
| Stream bridging | **High** | Core challenge. Spiceflow uses web `ReadableStream` everywhere. Bake uses Node.js streams for RSC/SSR. Adapters must convert in both directions without losing streaming benefits. |
| Dev server | **Available** | Bake provides RSC dev server with HMR via `bun:bake/client`. Major improvement over earlier assessment. |
| HMR integration | Low | `onServerSideReload` from `bun:bake/client` maps directly to `onHmrUpdate` in the adapter. |
| Testing | Medium | Need Bake-specific example + e2e tests against `Bun.serve({ app })`. |

---

## Execution Order

**Phase 1: Decouple core from Vite** — COMPLETE

**Phase 2: Add Parcel support** (follow-up PR)
- Create Parcel adapters (3 files)
- Create Parcel plugin (`parcel.ts`)
- Handle CSS differences
- Add `example-react-parcel/` + e2e tests

**Phase 3: Add Bun support via Bake** (follow-up PR)
- Create Bun adapters (3 files) with Node.js ↔ web stream bridging
- Create `bake-framework.ts` — spiceflow as a `Bake.Framework`
- Create `bake-server.tsx` — bridge `Bake.RouteMetadata` to spiceflow's route handling
- Verify `react-server-dom-bun` API surface (which functions are exported from each subpath)
- Solve `loadServerAction` without `actionManifest` (parse `path#export` IDs)
- Add `bake-example/` + e2e tests against `Bun.serve({ app })`

**Phase 2 and 3 are independent** — they can be done in either order or in parallel.

Bun (via Bake) is more challenging than initially assumed because:
- It uses `react-server-dom-bun` (its own Flight package), not `react-server-dom-webpack`
- Server-side uses Node.js streams, not web streams — requires bridging
- Bake has its own opinionated architecture (filesystem routing, `RouteMetadata`, `__bun_f` payload format) that differs from spiceflow's

But Bake provides the most complete experience (both dev + prod, built-in RSC HMR, error overlay, CSS management). Once the stream bridging and route mapping are solved, the integration is solid.
