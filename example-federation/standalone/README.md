# Standalone Federation Consumer

Use Spiceflow federation in **any React app** (Next.js, Remix, plain SPA). The consumer fetches RSC payloads from a remote Spiceflow server and renders them as interactive React components, with streaming, CSS injection, and client component hydration.

The typical use case: build a Spiceflow remote that exposes components via federation endpoints, then ship an **npm package** whose Vite-built output can be imported by Next.js or any other framework. The host app doesn't need Spiceflow; it just imports your package and renders the federated components.

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

Call `setupFederationConsumer` before any federation decode, and **externalize React** so the host and remote chunks share the same instance.

```ts
import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'

await setupFederationConsumer({
  modules: {
    'react': React,
    'react/jsx-runtime': ReactJsx,
    'react/jsx-dev-runtime': ReactJsx,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'spiceflow/react': SpiceflowReact,
  },
})
```

Spiceflow remotes externalize React when building client component chunks, so the built JS files contain bare `import "react"` specifiers instead of bundling their own copy. This keeps chunks small and prevents duplicate React instances. When the standalone consumer dynamically imports those chunks at runtime, the browser needs an import map to resolve the bare specifiers.

`setupFederationConsumer` handles this automatically: it creates blob URL wrapper modules for each entry in `modules` and injects a `<script type="importmap">` so the browser resolves `"react"` (and other bare specifiers) to the host app's copies. It also sets up the Flight client for decoding RSC payloads (no need to install `react-server-dom-webpack`).

The import map only affects remote chunks loaded via dynamic `import()` from another origin. It does **not** interfere with the host app's own module resolution. In Next.js, webpack/turbopack resolves imports at build time and ignores browser import maps entirely.

### Vite config

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
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

## Consuming federation payloads

```ts
import {
  decodeFederationPayloadDetails,
  resolveFederatedUrl,
} from 'spiceflow/federation-client'

const response = await fetch('https://remote.example.com/api/chart')
const decoded = await decodeFederationPayloadDetails<ReactNode>(response)

// Inject remote CSS
for (const href of decoded.metadata.cssLinks) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = resolveFederatedUrl(href, decoded.remoteOrigin)
  document.head.appendChild(link)
}

// Render the decoded React element
setChartNode(decoded.value)
```

### Streaming with async iterables

Federation endpoints can return async generators. The consumer receives parts incrementally:

```ts
const response = await fetch(`${remoteOrigin}/api/chat?message=${message}`)
const decoded = await decodeFederationPayloadDetails<{
  stream: AsyncIterable<{ type: string; content: ReactNode }>
}>(response)

for await (const part of decoded.value.stream) {
  // Each part arrives as it's generated on the server.
  // part.content is a React element that may include client components.
  appendPart(part.content)
}
```

## Shipping as an npm package

Build the consumer with Vite and publish the output as an npm package. The host app (Next.js, etc.) installs your package and renders the components. Since React is externalized, the host's React instance is shared automatically.

```
your-federation-package/
  dist/
    index.js        # Vite-built ESM, React externalized
  package.json      # "main": "dist/index.js", peerDependencies: { react, react-dom }
```

The host app just imports your package:

```tsx
// In a Next.js page
import { ChatWidget } from 'your-federation-package'

export default function Page() {
  return <ChatWidget />
}
```

## Running this example

```bash
# 1. Build the remote
cd example-federation/remote && pnpm build

# 2. Start the remote server
PORT=3051 node dist/rsc/index.js

# 3. In another terminal, start the standalone consumer
cd example-federation/standalone && pnpm dev
```

The consumer runs at `http://localhost:5173` and fetches federation payloads from the remote at `http://localhost:3051`.
