# Federation

Federation lets you compose multiple spiceflow apps at the React Server Component level. A **remote** app exposes components, and a **host** app embeds them — with full SSR, hydration, and client interactivity.

## Remote Components

Embed components from other spiceflow servers or load client-only components from any ESM URL (like [esm.sh](https://esm.sh) or [Framer](https://framer.com)). `RemoteComponent` is an async server component that detects the response type automatically — SSE for federation, JavaScript for ESM modules.

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

## Setting Up Federation

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
  // Dynamic: fetch data at request time, render the component, return the SSE response
  .get('/api/chart', async ({ request }) => {
    const url = new URL(request.url)
    const props = JSON.parse(url.searchParams.get('props') || '{}')
    const rows = await db.query('SELECT month, revenue FROM sales WHERE year = 2025')
    return await renderComponentPayload(<Chart data={rows} {...props} />)
  })
  // Static: pre-rendered at build time and written to disk.
  // Serve it from S3, a CDN, or any static host — no server needed at runtime.
  .staticGet('/api/table', async () => {
    const rows = await db.query('SELECT name, role, department FROM employees')
    return await renderComponentPayload(<Table rows={rows} />)
  })
```

The `.staticGet` route runs at build time and writes the response to disk. You can upload the output to S3 or any static host — the host app fetches it like any other URL, and `RemoteComponent` renders it with full SSR and hydration. No server running for the remote at runtime.

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

The remote's `renderComponentPayload` returns a `Response` in SSE (`text/event-stream`) format with these events:
- **metadata** — remoteId, client module chunk URLs, stylesheet URLs
- **ssr** — pre-rendered HTML for instant display
- **flight** (one per row) — RSC Flight stream rows (serialized React tree)
- **done** — signals end of payload

The SSE format allows future streaming support — flight events can arrive incrementally as async data resolves, without changing the wire protocol.

The host fetches this SSE response, SSR-renders the HTML via `dangerouslySetInnerHTML`, then hydrates using `hydrateRoot` to patch the existing DOM in-place (no flash).

**Import map and module deduplication.** Spiceflow automatically injects a `<script type="importmap">` into the HTML with entries for shared modules:

```
react, react-dom, react-dom/client, react/jsx-runtime, spiceflow/react
```

Each entry points to a hashed chunk built from the host app's own dependencies. When a remote component's client code does `import React from 'react'`, the browser resolves it through the import map to the **host's React chunk** — not a separate copy. This is how federation avoids duplicate React instances (which would break hooks and context). The same deduplication works for any module you add via the `importMap` plugin option: if a Framer component does `import { motion } from 'framer-motion'`, and you've mapped `framer-motion` to a local re-export file, the browser loads the host's bundled copy.

This means remote client components can use `useRouterState` from the host and read host-provided React contexts (via `useContextBridge` from [its-fine](https://github.com/pmndrs/its-fine)). External ESM components from esm.sh or Framer also benefit — as long as they externalize `react` (e.g. `https://esm.sh/some-lib?external=react`), the import map resolves the bare specifier to the host's instance and everything just works.

</details>

## External ESM Components

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
