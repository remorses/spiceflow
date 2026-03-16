# Plan: Migrate from Custom CSS to `rscCssTransform`

## Background

Spiceflow currently disables `@vitejs/plugin-rsc`'s native CSS system (`rscCssTransform: false`) and
replaces it with a custom approach. This plan migrates to the plugin's built-in CSS injection, which
is per-component, automatic, and eliminates ~100 lines of custom code.

## How the Two Systems Work

**Spiceflow's custom system (current):**

```
entry.rsc.tsx (user app)
      ↓ imports CSS
collectStyleUrls() crawls RSC module graph  ← css.tsx
      ↓ produces flat URL list
virtual:app-styles exports string[]
      ↓ imported by
entry.ssr.tsx renders ALL CSS as global <link> tags
      ↓ production variant
spiceflow:capture-manifests reads Vite manifests → same flat list
```

All CSS is dumped globally — every page gets every stylesheet.

**Plugin's native system (`rscCssTransform: true`, the default):**

```
Server component file (e.g. root.tsx)
      ↓ has `import './styles.css'` + exports function with capital name
rsc:rsc-css-export-transform wraps export:
      function Page(props) → __vite_rsc_wrap_css__(Page, "Page")
      ↓ wrapper renders:
      <Fragment>
        {import.meta.viteRsc.loadCss()}   ← collects CSS transitively imported by THIS file
        <Page {...props} />
      </Fragment>
      ↓
rsc:importer-resources transforms loadCss() into:
  DEV:  dynamic import of virtual:vite-rsc/css?type=rsc&id=<importer>
        → collectCss() walks rsc module graph from importer → <link> tags
  BUILD: static import of virtual:vite-rsc/css?type=rsc&id=<importer>
         → reads from virtual:vite-rsc/assets-manifest → <link> tags

SSR side (ssr.tsx):
  When SSR loads a client reference, it also loads virtual:vite-rsc/css?type=ssr&id=<ref>
  → collectCss() from SSR module graph → ReactDOM.preinit() for each CSS href
  → <link> tags with precedence="vite-rsc/client-reference"

DEV deduplication:
  RemoveDuplicateServerCss client component removes <link> tags with
  precedence="vite-rsc/client-reference" after hydration (because Vite's
  client env also inlines <style> tags for the same CSS).
```

Each component gets only its own transitively imported CSS. No manual collection needed.

## Key Insight: Spiceflow's App Structure

In spiceflow, the user's app entry (e.g. `integration-tests/src/main.tsx`) is a **server module** that:

1. Imports CSS at the top level: `import "./styles.css"`
2. Exports `default app` (a Spiceflow instance, **not** a React component)
3. Defines inline page handlers as arrow functions: `.page("/", async () => { ... })`

The `rscCssTransform` auto-detection has specific heuristics (line 2244-2268 of plugin.ts):

- Only applies to files with CSS import statements (regex: `/\.(css|less|sass|...)\b/`)
- Only applies to `.ts`/`.tsx`/`.js`/`.jsx` files
- Only wraps **function exports with capital-letter names** (e.g. `export function Page()`)
- **Skips** files with `"use client"` directive

The user's `main.tsx` **does** import CSS and is a `.tsx` file, but its default export is
`export default app` — a Spiceflow instance, not a capitalized function. So `rscCssTransform`
**will not auto-wrap it**. The inline page handlers (`.page("/", async () => { ... })`) are
not module exports — they're method call arguments, so they also won't be wrapped.

However, separately imported server component files that export capitalized functions
(e.g. a hypothetical `ServerPage.tsx` with `export function ServerPage()` and CSS imports)
**would** be auto-wrapped correctly.

**This means we need a fallback for CSS imported at the app entry level.** The plugin provides
exactly this: `import.meta.viteRsc.loadCss()` can be called manually to inject CSS for a
specific file (or the current file when called with no args).

## Migration Steps

### Step 1: Remove `rscCssTransform: false` from vite.tsx

**File:** `spiceflow/src/vite.tsx` line 36

```diff
  rsc({
    entries: { ... },
    serverHandler: false,
-   rscCssTransform: false,
    defineEncryptionKey: 'process.env.RSC_ENCRYPTION_KEY',
    validateImports: true,
  }),
```

This enables the plugin's `rsc:rsc-css-export-transform` and `rsc:importer-resources` plugins.

### Step 2: Add manual `loadCss()` in entry.rsc.tsx for the app entry

Since the user's app entry (`main.tsx`) exports a non-function default, it won't be auto-wrapped.
We need to manually call `loadCss()` targeting the app entry module in the RSC flight stream.

**File:** `spiceflow/src/react/entry.rsc.tsx`

The RSC entry point renders the app's response. We need to include the app entry's CSS
in the rendered output. The approach: call `import.meta.viteRsc.loadCss()` pointing at the
app entry module.

```diff
  import app from 'virtual:app-entry'
+ // Inject CSS transitively imported by the user's app entry module.
+ // rscCssTransform's auto-wrapping only handles exported React components with capital names,
+ // but the app entry exports a Spiceflow instance. This manual call covers that gap.
+ const appEntryCss = import.meta.viteRsc.loadCss('virtual:app-entry')

  export async function handler(request: Request) {
    const response = await app.handle(request)
    return response
  }
```

**But wait** — `loadCss()` returns a React element (it gets transformed into
`React.createElement(Resources)`). We can't just assign it to a variable and use it later;
it needs to be rendered inside a React tree. The question is **where** to render it.

Looking at how spiceflow works: `entry.rsc.tsx` calls `app.handle(request)` which returns
a Response with a flight stream. The React tree is rendered inside the Spiceflow handler
(in `spiceflow.tsx`), not here. So we need a different approach.

**Better approach:** Include CSS in the RSC payload itself. In spiceflow, the server renders
the page components inside `renderToReadableStream()`. The CSS `<link>` elements need to
appear somewhere in the React tree that gets serialized into the flight stream.

Looking at the spiceflow handler (in `spiceflow.tsx`), it renders a `ServerPayload` that includes
the page element. The CSS links need to be part of this tree. The cleanest integration point is
inside the Layout component or the page wrapper that spiceflow renders.

**Revised approach:** Since the user's `main.tsx` is the RSC entry that imports CSS and defines
all routes, and `rscCssTransform` auto-wraps server component exports... we should consider
whether spiceflow could restructure so the page handlers are exported functions. But that's a
deeper refactor.

**Practical approach for the app entry CSS:** Use `import.meta.viteRsc.loadCss('virtual:app-entry')`
inside the component tree rendered by the RSC handler. This means modifying the spiceflow core
(where it calls `renderToReadableStream` with the page payload) to include the CSS element.

**File:** `spiceflow/src/spiceflow.tsx` (or wherever the RSC payload tree is assembled)

We need to find where the server renders pages and wrap/prepend with the loadCss element.

**Alternative simpler approach:** Render it in `entry.ssr.tsx` as we do now, but with `loadCss()`
instead of `virtual:app-styles`. But this would bypass the per-component scoping benefit and
still be "global." However, the SSR entry is the right place for *global* CSS (like a global
`styles.css`), while per-component CSS is handled automatically by the transform.

### Step 3: Handle global CSS in entry.ssr.tsx

For CSS imported at the top level of the app entry (global styles, resets, etc.), we need
an SSR-side mechanism to inject these styles. The plugin handles client-reference CSS
automatically via `ssr.tsx`'s `wrapResourceProxy`, but server-component CSS is injected
into the RSC flight stream.

**The cleanest approach:** Instead of trying to hack loadCss into the SSR entry,
leverage the fact that `rscCssTransform` already handles server component CSS via the
flight stream. For the app entry's global CSS specifically, we have two options:

**Option A: Move global CSS import to a wrapper server component**

Create a thin server component that imports the global CSS and wraps the page content:

```tsx
// integration-tests/src/app-wrapper.tsx (user-land)
import '../styles.css'

export function AppWrapper({ children }) {
  return <>{children}</>
}
```

Since `AppWrapper` is an exported function with a capital name that imports CSS,
`rscCssTransform` will auto-wrap it. Then use it in the layout:

```tsx
.layout("/*", async ({ children }) => {
  return <AppWrapper><Layout>{children}</Layout></AppWrapper>
})
```

This is the most natural approach but requires user code changes.

**Option B: Manual `loadCss()` in the RSC render tree (framework-level)**

Add `import.meta.viteRsc.loadCss()` inside spiceflow's internal layout/page wrapper that
gets rendered in the RSC environment. This is what we'll implement in spiceflow itself,
so users don't have to change anything.

The right file is wherever spiceflow assembles the React element tree for RSC rendering.

### Step 4: Delete custom CSS infrastructure

**Files to delete:**

1. **`spiceflow/src/react/css.tsx`** — `collectStyleUrls()` function (28 lines)

**Code to remove from `spiceflow/src/vite.tsx`:**

2. **`virtual:app-styles` virtual plugin** (lines 149-168) — the entire `createVirtualPlugin('app-styles', ...)` block
3. **`spiceflow:capture-manifests` plugin** (lines 170-181) — the entire plugin that captures build manifests
4. **`import { collectStyleUrls }` import** (line 16)
5. **`let browserManifest: Manifest` and `let rscManifest: Manifest`** declarations (lines 25-26)

**Code to remove from `spiceflow/src/react/entry.ssr.tsx`:**

6. **`import cssUrls from 'virtual:app-styles'`** (line 14)
7. **CSS link rendering in `SsrRoot`** (lines 94-96):
   ```tsx
   {cssUrls.map((url) => (
     <link key={url} rel="stylesheet" href={url} precedence="high" />
   ))}
   ```
8. **CSS link rendering in error fallback** (lines 145-147):
   ```tsx
   {cssUrls.map((url) => (
     <link key={url} rel="stylesheet" href={url} precedence="high" />
   ))}
   ```

**Type declarations to remove from `spiceflow/src/react/types/ambient.d.ts`:**

9. **`declare module 'virtual:app-styles'`** block (lines 4-7)

### Step 5: Ensure per-component CSS works for server components

When `rscCssTransform` is enabled, any server component file that:
- Imports CSS (`.css`, `.scss`, etc.)
- Exports a function with a capital-letter name (e.g. `export function Page()`)

...will be auto-wrapped to include its CSS as `<link>` tags in the flight stream.

**For spiceflow's inline page handlers** (`.page("/", async () => <div>...</div>)`):
These are anonymous arrow functions passed as method arguments — they're **not** module exports.
The auto-transform won't touch them. However, if these inline handlers don't import CSS
themselves, this is fine. CSS imported at the top of `main.tsx` needs the manual `loadCss()` fallback.

**For imported server components** (e.g. `import { IndexPage } from "./app/index"`):
If `IndexPage` is exported from `app/index.tsx` as a capitalized function and that file imports CSS,
the transform will auto-wrap it. This works correctly with spiceflow's architecture.

### Step 6: Handle the app entry CSS gap

Since the app entry (`main.tsx`) exports `app` (not a React component), we need to inject
its CSS somewhere in the RSC render tree. The best integration point is in spiceflow's
internal page/layout rendering.

**Implementation approach:**

In `entry.rsc.tsx` or wherever spiceflow assembles the RSC payload, we can use
`import.meta.viteRsc.loadCss('virtual:app-entry')` as a React element in the tree.
This needs to be rendered inside the React tree that goes into `renderToReadableStream`.

Looking at `spiceflow.tsx`, we need to find where the `ServerPayload` is assembled and
rendered. The CSS element should be included alongside the page content.

**Concrete location:** This needs investigation during implementation. The key file to
examine is wherever `renderToReadableStream` is called with the page/layout tree.

## Interaction with Bundler Adapter Layer

The bundler adapter layer (commit `4e7d8f9`) is **not affected** by this migration:

- **`virtual:bundler-adapter/server`** re-exports `renderToReadableStream` etc. from
  `@vitejs/plugin-rsc/rsc` — CSS injection happens in the RSC transform layer before rendering,
  not in the stream serialization. No changes needed.

- **`virtual:bundler-adapter/ssr`** re-exports `createFromReadableStream` from
  `@vitejs/plugin-rsc/ssr` — the plugin's SSR module (`ssr.tsx`) already handles client-reference
  CSS via `wrapResourceProxy` + `ReactDOM.preinit()`. This works independently. No changes needed.

- **`virtual:bundler-adapter/client`** — browser-side, unrelated to CSS injection. No changes.

- **`adapters/types.ts`** — the adapter interfaces don't mention CSS at all. No changes.

The CSS migration is orthogonal to the adapter layer. The adapter abstracts *how* RSC primitives
are loaded; the CSS system is about *what* gets rendered in the component tree.

## Risks and Edge Cases

### 1. Flash of Unstyled Content (FOUC)

**Risk: LOW.** The plugin uses React 19's `<link precedence="...">` which ensures stylesheets
are loaded before content is painted. During SSR, the plugin's `ssr.tsx` calls
`ReactDOM.preinit()` for client-reference CSS, which inserts `<link>` tags early in the HTML.
Server-component CSS comes through the flight stream as `<link>` elements with `precedence`.

In dev mode, there's a deduplication mechanism (`RemoveDuplicateServerCss`) that removes
redundant `<link>` tags after hydration (since Vite's client env also injects inline `<style>` tags).

### 2. CSS Ordering Changes

**Risk: MEDIUM.** The current system dumps ALL CSS in a flat array, maintaining a consistent
(if incorrect) order. Switching to per-component CSS means:
- Each component's CSS arrives when that component renders
- CSS `precedence` groups may differ from the current flat ordering
- If user CSS relies on specificity from import order, it could break

**Mitigation:** Test with the integration-tests app and inspect CSS order in dev tools.

### 3. CSS in Layouts

**Risk: LOW-MEDIUM.** Spiceflow layouts are defined as inline functions:
```tsx
.layout("/*", async ({ children }) => { return <Layout>{children}</Layout> })
```

The `Layout` component is imported from `./app/layout` — if it imports CSS and is exported
with a capital name, `rscCssTransform` will auto-wrap it. The inline arrow function in
`.layout()` won't be wrapped, but that's fine because it's just a thin wrapper.

### 4. Global CSS from App Entry

**Risk: HIGH.** This is the biggest gap. `main.tsx` imports `./styles.css` at the top level,
but its default export isn't a React component function. We **must** solve this with either:
- Manual `loadCss('virtual:app-entry')` in the RSC render tree (framework-level fix)
- Having users move global CSS imports to a wrapper component (user-level fix)

The framework-level fix is strongly preferred to avoid breaking existing apps.

### 5. Third-Party CSS (e.g. Chakra UI)

**Risk: LOW.** Third-party libraries imported via client components will have their CSS
handled by the plugin's client-reference CSS system (via `ssr.tsx`'s `wrapResourceProxy`).
The integration-tests app already uses Chakra UI — this should work as-is.

### 6. CSS Modules

**Risk: LOW.** CSS modules are standard CSS requests and are handled by both systems.
The plugin's `collectCss()` respects CSS modules the same as plain CSS imports.
The `hasSpecialCssQuery()` filter correctly skips `?url`, `?inline`, and `?raw` variants.

### 7. Production Build

**Risk: LOW.** In production, the plugin reads from `virtual:vite-rsc/assets-manifest` which
is populated during the multi-phase build (rsc→ssr→client→ssr). Server-component CSS uses
`serverResources` in the manifest, and client-reference CSS uses `clientReferenceDeps`.
Both are built into the manifest automatically. The custom `spiceflow:capture-manifests`
plugin becomes unnecessary.

## Summary: Files Changed

| File | Action |
|------|--------|
| `spiceflow/src/vite.tsx` | Remove `rscCssTransform: false`, delete `virtual:app-styles` plugin, delete `capture-manifests` plugin, remove manifest variables and `collectStyleUrls` import |
| `spiceflow/src/react/css.tsx` | **DELETE** entire file |
| `spiceflow/src/react/entry.ssr.tsx` | Remove `virtual:app-styles` import, remove `cssUrls.map(...)` in both SsrRoot and error fallback |
| `spiceflow/src/react/types/ambient.d.ts` | Remove `declare module 'virtual:app-styles'` |
| `spiceflow/src/react/entry.rsc.tsx` (or spiceflow.tsx) | Add `import.meta.viteRsc.loadCss('virtual:app-entry')` in RSC render tree for global CSS |

## Verification Plan

1. Run `pnpm tsc --noCheck` in `spiceflow/` to rebuild dist
2. Run `pnpm test-e2e` in `integration-tests/` — all existing tests should pass
3. Manually inspect browser dev tools to verify:
   - CSS is loaded per-component (not all global)
   - No FOUC on page load
   - CSS HMR works (edit a CSS file → styles update without reload)
4. Run `pnpm test-e2e-start` to verify production build CSS works
5. Inspect the HTML source to verify `<link>` tags use `precedence` attributes
