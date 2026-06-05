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

Two things are needed: **call `setupFederationConsumer`** before any federation decode, and **externalize React** so the host and remote chunks share the same instance.

```ts
// entry.ts
import * as SpiceflowReact from 'spiceflow/react'
import ReactClient from 'react-server-dom-webpack/client.browser'
import { setupFederationConsumer } from 'spiceflow/federation-client'

setupFederationConsumer({
  reactServerDomWebpack: ReactClient,
  modules: {
    'spiceflow/react': SpiceflowReact,
  },
})
```

React must be externalized in your build so remote federation chunks (loaded via dynamic `import()`) resolve `react` to the host's copy. In a real app like Next.js, React is already a peer dependency provided by the framework. The import map in this example's `index.html` is just a development convenience; in production you'd rely on your bundler's externalization.

### Vite config

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federationPatchWebpack } from 'spiceflow/federation-client'

export default defineConfig({
  plugins: [react(), federationPatchWebpack()],
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

`federationPatchWebpack()` does two things:
- Converts CJS `require("react-dom")` calls inside `react-server-dom-webpack` to ESM imports, so externalized React packages resolve via import maps instead of failing with `require is not defined`
- Injects a `__webpack_require__` stub into the HTML for the Flight protocol's module resolution

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
