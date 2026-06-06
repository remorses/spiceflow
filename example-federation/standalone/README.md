# Standalone Federation Consumer

Use Spiceflow federation in **any React app** (Next.js, Remix, plain SPA). The consumer fetches RSC payloads from a remote Spiceflow server and renders them as interactive React components, with streaming, CSS injection, and client component hydration.

The typical use case: build a Spiceflow remote that exposes components via federation endpoints, then ship an **npm package** whose Vite library mode output can be imported by Next.js, a plain `index.html`, or any other framework. The host app doesn't need Spiceflow installed; it just imports your package and renders the federated components.

```
┌─────────────────────┐         SSE (Flight payload)         ┌────────────────────────┐
│   Host Application   │ ◄──────────────────────────────────  │  Spiceflow Remote       │
│   (Next.js, SPA)     │         fetch /api/chart             │  federation: 'remote'   │
│                      │                                      │                         │
│  setupFederation     │  ──  dynamic import() ──────────►    │  /api/chart             │
│  Consumer()          │      remote client chunks             │  /api/chat              │
│                      │                                      │                         │
└─────────────────────┘                                      └────────────────────────┘
```

## Setup

Build the federation consumer as a **Vite library**. React is externalized so the host app provides its own copy; everything else (`spiceflow/federation-client`, `spiceflow/react`) is bundled into the output.

### Vite config (library mode)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      formats: ['es'],
      fileName: 'federation-standalone',
    },
    rolldownOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
      ],
    },
  },
})
```

### Library entry

Call `setupFederationConsumer` at the top level and export the setup promise along with your components. The `modules` map tells the consumer how to resolve bare specifiers that remote client chunks use.

```ts
import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactJsxDev from 'react/jsx-dev-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'

export const federationReady = setupFederationConsumer({
  modules: {
    'react': React,
    'react/jsx-runtime': ReactJsx,
    'react/jsx-dev-runtime': ReactJsxDev,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'spiceflow/react': SpiceflowReact,
  },
})

export { ChatWidget } from './chat-widget'
```

`setupFederationConsumer` creates blob URL wrapper modules for each entry in `modules` and injects a `<script type="importmap">` so the browser resolves `"react"` (and other bare specifiers) to the host app's copies. It also sets up the Flight client for decoding RSC payloads.

The import map is only needed for remote chunks loaded via dynamic `import()` from another origin. It does **not** interfere with the host app's bundled module resolution. In Next.js, webpack/turbopack resolves imports at build time and ignores browser import maps entirely.

## Consuming federation payloads

```ts
import { decodeFederationPayload } from 'spiceflow/federation-client'

const response = await fetch('https://remote.example.com/api/chart')
const chart = await decodeFederationPayload<ReactNode>(response)
// CSS is auto-injected, client components are hydrated
setChartNode(chart)
```

### Streaming with async iterables

Federation endpoints can return async generators. The consumer receives parts incrementally:

```ts
const response = await fetch(`${remoteOrigin}/api/chat?message=${message}`)
const decoded = await decodeFederationPayload<{
  stream: AsyncIterable<{ type: string; content: ReactNode }>
}>(response)

for await (const part of decoded.stream) {
  // Each part arrives as it's generated on the server.
  // part.content is a React element that may include client components.
  appendPart(part.content)
}
```

## Shipping as an npm package

The Vite library build produces ESM output with React externalized. Publish the whole `dist/` folder as an npm package with `peerDependencies` on React, including any generated chunks.

```
your-federation-package/
  dist/
    federation-standalone.js   # Vite library mode output
    *.js                       # generated chunks used by the library
  package.json                 # "main": "dist/federation-standalone.js"
```

The host app just imports your package:

```tsx
import { federationReady, ChatWidget } from 'your-federation-package'

await federationReady

// In a Next.js page or plain HTML
export default function Page() {
  return <ChatWidget />
}
```

## Using from a plain HTML file

The built library can be loaded directly from a static HTML page using browser import maps to provide React:

```html
<script type="importmap">
  { "imports": {
    "react": "https://esm.sh/react@19",
    "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime",
    "react-dom": "https://esm.sh/react-dom@19?external=react",
    "react-dom/client": "https://esm.sh/react-dom@19/client?external=react"
  }}
</script>
<script type="module">
  import { federationReady, ChatWidget } from './dist/federation-standalone.js'
  import { createElement } from 'react'
  import { createRoot } from 'react-dom/client'

  await federationReady
  createRoot(document.getElementById('root')).render(createElement(ChatWidget))
</script>
```

## Running this example

```bash
# 1. Build the remote
cd example-federation/remote && pnpm build

# 2. Build the standalone library
cd example-federation/standalone && pnpm build

# 3. Start the remote server
cd example-federation/remote && PORT=3051 node dist/rsc/index.js

# 4. Serve the standalone directory with any static server
cd example-federation/standalone && npx serve . -l 3053
```

Open `http://localhost:3053` to see the consumer loading federation payloads from the remote at `http://localhost:3051`.

## Running e2e tests

```bash
cd example-federation/standalone
pnpm test-e2e
```

This builds the remote and standalone, then starts both servers (remote on port 3051, static server on port 3053) and runs Playwright tests.
