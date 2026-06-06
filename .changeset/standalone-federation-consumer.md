---
'spiceflow': minor
---

Add `spiceflow/federation-client` subpath for standalone federation consumers. Any React app (Next.js, plain SPA, etc.) can now consume federation payloads from a spiceflow remote without using the spiceflow framework.

```ts
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'

await setupFederationConsumer({
  modules: {
    'react': React,
    'react-dom': ReactDOM,
    'spiceflow/react': SpiceflowReact,
  },
})
```

`setupFederationConsumer()` auto-loads an embedded pre-built Flight client, injects a blob URL import map for bare specifiers, and patches require globals for the Flight protocol. Safe to call during SSR (no-ops on the server). Idempotent and concurrent-safe across React Strict Mode and HMR.

Also export `decodeFederationPayloadDetails`, `setFederationFlightClient`, `parseFederationPayload`, `loadFederatedClientModules`, and `resolveFederatedUrl` from `spiceflow/federation-client`.
