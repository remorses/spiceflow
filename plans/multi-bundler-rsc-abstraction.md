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

### Background: What Bun Already Has

Bun's bundler (`src/bundler/bundle_v2.zig`) has **production RSC support** at the Zig level:

- **`"use client"` / `"use server"` parsing** — `UseDirective` enum in `src/js_ast.zig:7823` parses directives from file contents
- **Graph splitting** — `react_server_component_boundary` bitset in `bundle_v2.zig` tracks component boundaries and splits the module graph
- **Client component manifest** — `bundle_v2.zig:9155` generates a manifest mapping source files to their bundled chunk paths + named exports
- **CLI flag** — `bun build --server-components` enables RSC mode
- **JS API** — `Bun.build()` accepts `serverComponents` config via `bun-plugin-server-components` (published as `0.0.1-alpha.0`)
- **Feature flag** — `react_server_components = true` in `feature_flags.zig`

The bundler uses `react-server-dom-webpack` (same as Vite's `@vitejs/plugin-rsc`), so the Flight protocol is identical.

### What Bun is Missing

| Capability | Status | Impact |
|---|---|---|
| **Dev server RSC** | Not implemented | **Blocker for dev mode.** No multi-environment dev, no RSC HMR, no flight stream handling in dev. |
| **Cross-environment imports (dev)** | Not implemented | Tied to dev server gap. Prod works via direct `import()`. |
| **Bootstrap script injection** | Not implemented | Must read from `Bun.build()` output manifest and construct `<script>` tag. Solvable in adapter. |
| **RSC HMR** | Not implemented | `HotReloader` in `javascript.zig` handles React Fast Refresh but has no RSC invalidation. |
| **Virtual module support** | Partial — `onResolve` + `onLoad` exist | Works but less ergonomic than Vite's `createVirtualPlugin`. |
| **CSS module graph API** | Not exposed to JS | No dev-time CSS collection. Prod CSS comes from build output. |
| **Test coverage** | None | `expectBundled.ts` has `serverComponents` option but zero test cases use it. |

### Approach: Production-Only Initially, Vite for Dev

Since Bun's dev server has no RSC support, the pragmatic approach is:

1. **Dev mode:** Use Vite (existing adapter) for the dev experience — HMR, error overlay, multi-environment
2. **Production build:** Use `Bun.build()` with `bun-plugin-server-components` — faster builds, native RSC splitting
3. **Production runtime:** Use `Bun.serve()` or standard Node server to serve the built output

This mirrors how many frameworks use one tool for dev and another for prod (e.g., Next.js uses Turbopack for dev, webpack for prod).

### Bun adapter files

**`spiceflow/src/react/adapters/bun-server.ts`** (RSC environment)

```ts
// Bun uses react-server-dom-webpack directly (same as Vite does under the hood,
// but without the @vitejs/plugin-rsc wrapper).
export {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  decodeAction,
  decodeFormState,
} from 'react-server-dom-webpack/server.edge'

// loadServerAction is bundler-specific — Bun's bundler generates a manifest
// that maps action IDs to module paths + export names.
export async function loadServerAction(id: string): Promise<Function> {
  // The action ID format from react-server-dom-webpack is "filepath#exportName".
  // Bun's build manifest maps these to the bundled chunk paths.
  const [modulePath, exportName] = id.split('#')
  const mod = await import(modulePath)
  return mod[exportName || 'default']
}
```

**`spiceflow/src/react/adapters/bun-ssr.ts`** (SSR environment)

```ts
export { createFromReadableStream } from 'react-server-dom-webpack/client.edge'

// In production, read the client entry chunk path from the build manifest
// and construct the bootstrap script that loads it.
let _cachedBootstrapScript: string | undefined
export async function loadBootstrapScriptContent(): Promise<string> {
  if (_cachedBootstrapScript) return _cachedBootstrapScript
  // The Bun build plugin writes a manifest.json mapping entry names to output paths.
  // Read it at startup and cache the bootstrap script.
  const manifest = await import('./bun-manifest.json', { with: { type: 'json' } })
  const clientEntry = manifest.default?.client?.entryPoint
  if (!clientEntry) throw new Error('Bun build manifest missing client entry')
  _cachedBootstrapScript = `import(${JSON.stringify(clientEntry)})`
  return _cachedBootstrapScript
}

// In production, single process — direct import works.
export async function importRscEnvironment(): Promise<typeof import('../entry.rsc.js')> {
  return import('../entry.rsc.js')
}
```

**`spiceflow/src/react/adapters/bun-client.ts`** (browser)

```ts
export {
  createFromReadableStream,
  createFromFetch,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from 'react-server-dom-webpack/client.browser'

export function onHmrUpdate(_callback: () => void) {
  // Bun has no RSC HMR — noop in production.
  // In dev, Vite adapter is used instead.
}

export function onHmrError() {
  // Bun has no error overlay — noop in production.
}
```

### Bun build plugin (`spiceflow/src/bun-build.ts`)

Unlike `vite.tsx` which handles both dev and prod, the Bun plugin is **production-build-only**:

```ts
import ServerComponentsPlugin from 'bun-plugin-server-components'

export async function buildWithBun(options: {
  entry: string          // path to user's app entry (main.tsx)
  outdir: string         // output directory
  minify?: boolean
}) {
  // Step 1: Build server components (RSC environment)
  // This discovers "use client" files and generates the client manifest.
  const serverResult = await Bun.build({
    entrypoints: [options.entry],
    outdir: `${options.outdir}/server`,
    target: 'bun',
    splitting: true,
    plugins: [
      ServerComponentsPlugin({
        client: {
          outdir: `${options.outdir}/client`,
          target: 'browser',
        },
        ssr: {
          outdir: `${options.outdir}/ssr`,
          target: 'bun',
        },
      }),
      // Resolve virtual:bundler-adapter/* to Bun adapter files
      {
        name: 'spiceflow-bun-adapters',
        setup(build) {
          build.onResolve({ filter: /^virtual:bundler-adapter\// }, (args) => {
            const adapter = args.path.replace('virtual:bundler-adapter/', '')
            return {
              path: require.resolve(`spiceflow/dist/react/adapters/bun-${adapter}`),
            }
          })
          build.onResolve({ filter: /^virtual:app-entry$/ }, () => ({
            path: require.resolve(options.entry),
          }))
          build.onResolve({ filter: /^virtual:app-styles$/ }, () => ({
            path: 'virtual:app-styles',
            namespace: 'spiceflow-virtual',
          }))
          build.onLoad({ filter: /^virtual:app-styles$/, namespace: 'spiceflow-virtual' }, () => ({
            contents: `export default []`, // CSS extracted by bundler
            loader: 'js',
          }))
        },
      },
    ],
    minify: options.minify,
  })

  // Step 2: Write manifest for the SSR adapter to read at runtime
  const clientEntry = serverResult.outputs.find(
    (o) => o.kind === 'entry-point' && o.loader !== 'css',
  )
  await Bun.write(
    `${options.outdir}/bun-manifest.json`,
    JSON.stringify({
      client: { entryPoint: `/client/${clientEntry?.path}` },
    }),
  )

  return serverResult
}
```

### Key differences from Parcel approach

| Aspect | Parcel | Bun |
|---|---|---|
| React Flight package | `react-server-dom-parcel` (Parcel-specific) | `react-server-dom-webpack` (same as Vite) |
| `loadServerAction` | Parcel wires this automatically via `@parcel/rsc` | Must implement manually — parse action ID, resolve from manifest |
| Bootstrap script | Parcel injects via runtime proxy, adapter throws | Must read from build manifest, construct `<script>` tag |
| `importRscEnvironment` | Direct `import()` (single target) | Direct `import()` in prod (single process) |
| Dev server | Parcel has its own dev server + HMR | **None** — fall back to Vite for dev |
| Plugin complexity | High — Parcel's transformer/runtime/resolver system | Medium — `Bun.build()` API is simpler, but less framework integration |
| CSS | Parcel handles automatically | Extracted by bundler, `virtual:app-styles` returns `[]` |
| Virtual modules | Parcel resolvers | `onResolve` + `onLoad` hooks |

### `loadServerAction` deep dive

This is the trickiest part of the Bun adapter. In Vite, `@vitejs/plugin-rsc/rsc` handles this by maintaining a mapping from action IDs to modules. In Bun, we need to:

1. During `Bun.build()`, generate a server action manifest that maps action IDs to output chunk paths + export names
2. At runtime, `loadServerAction` reads this manifest and dynamically imports the correct chunk

Bun's bundler already generates a `react_client_components_manifest` (in `bundle_v2.zig:9155`). A similar manifest for server actions may need to be extracted or generated via a plugin.

If the existing `clientManifest` / `ssrManifest` from `bun-plugin-server-components` doesn't expose action IDs, we may need to:
- Parse the RSC output chunks for `$$ACTION_` references
- Or extend `bun-plugin-server-components` to emit a server action manifest

### CSS handling

- **Bun build:** CSS is extracted as separate `BuildArtifact` entries with `loader: 'css'`. The build plugin collects their output paths and includes them in `bun-manifest.json`.
- **`virtual:app-styles`** returns `[]` in the Bun adapter because CSS paths are resolved from the manifest at runtime, not at build time via virtual modules.
- Alternative: the Bun build plugin could generate `virtual:app-styles` with the actual CSS paths baked in.

### Testing strategy

1. **Unit tests** for the Bun adapter — verify `loadServerAction` correctly parses IDs and resolves modules
2. **Build integration test** — run `buildWithBun()` on `example-react/` and verify output structure matches expectations
3. **E2e tests** — serve the Bun-built output with `Bun.serve()` and run the existing Playwright tests against it (same tests, different port/build)
4. **Regression** — all existing Vite e2e tests must still pass

### Future: Bun dev server with RSC

If Bun adds multi-environment dev support (tracked as a potential feature), the Bun adapter can be updated to support dev mode:

- `onHmrUpdate` would listen on a Bun-specific HMR channel
- `loadBootstrapScriptContent` would return a dev-mode script pointing to the Bun dev server
- `importRscEnvironment` would use Bun's module runner (analogous to `import.meta.viteRsc.import()`)

Until then, the recommended workflow is:
- `vite dev` for development (full HMR, error overlay, multi-environment)
- `bun-build` for production (faster builds, native RSC splitting)

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

### Phase 3: Bun

| File | Purpose |
|---|---|
| `spiceflow/src/react/adapters/bun-server.ts` | Bun RSC environment adapter (re-exports `react-server-dom-webpack` + custom `loadServerAction`) |
| `spiceflow/src/react/adapters/bun-ssr.ts` | Bun SSR environment adapter (manifest-based bootstrap script, direct `import()`) |
| `spiceflow/src/react/adapters/bun-client.ts` | Bun browser adapter (re-exports `react-server-dom-webpack/client.browser`, noop HMR) |
| `spiceflow/src/bun-build.ts` | Bun build orchestration using `Bun.build()` + `bun-plugin-server-components` |
| `example-react/` (updated) | Add `bun-build` script to existing example for testing |

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
| **Phase 3: Bun** | | |
| Bun adapters (3 files) | Low-Medium | `bun-server.ts` needs custom `loadServerAction`. Others are simple re-exports. |
| Bun build plugin (`bun-build.ts`) | Medium | `Bun.build()` API is simpler than Parcel's, but manifest generation and virtual module resolution via `onResolve`/`onLoad` need careful wiring. |
| `loadServerAction` implementation | **Medium-High** | Depends on what `bun-plugin-server-components` manifest contains. May need to extend the plugin or parse output chunks. |
| Bootstrap script from manifest | Medium | Read `Bun.build()` output, write manifest JSON, adapter reads it at runtime. |
| Dev server | **Not feasible** | Bun has no multi-environment dev or RSC HMR. Use Vite for dev. |
| CSS handling | Low | Same as Parcel — `virtual:app-styles` returns `[]`, CSS extracted by bundler. |
| Testing | Medium | Need build integration test + serve built output for e2e. |

---

## Execution Order

**Phase 1: Decouple core from Vite** — COMPLETE

**Phase 2: Add Parcel support** (follow-up PR)
- Create Parcel adapters (3 files)
- Create Parcel plugin (`parcel.ts`)
- Handle CSS differences
- Add `example-react-parcel/` + e2e tests

**Phase 3: Add Bun support** (follow-up PR)
- Create Bun adapters (3 files)
- Create Bun build plugin (`bun-build.ts`)
- Solve `loadServerAction` manifest mapping
- Generate bootstrap script manifest
- Add `bun-build` script to `example-react/` + e2e tests against built output
- Document the hybrid workflow (Vite dev + Bun prod)

**Phase 2 and 3 are independent** — they can be done in either order or in parallel. Bun is arguably simpler because:
- It uses `react-server-dom-webpack` (same as Vite), so the adapter is nearly identical
- `Bun.build()` API is simpler than Parcel's plugin system
- No dev server to worry about (prod-only)

But Parcel is more complete (has dev server support) making it a better second-bundler demo.
