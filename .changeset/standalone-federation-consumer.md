---
'spiceflow': minor
---

Add `spiceflow/federation-client` subpath for standalone federation consumers. Any React app (Next.js, plain SPA, etc.) can now consume federation payloads from a spiceflow remote without using the spiceflow framework.

```ts
import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactJsxDev from 'react/jsx-dev-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'

await setupFederationConsumer({
  modules: {
    'react': React,
    'react/jsx-runtime': ReactJsx,
    'react/jsx-dev-runtime': ReactJsxDev,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'spiceflow/react': SpiceflowReact,
  },
})
```

`setupFederationConsumer()` auto-loads an embedded pre-built Flight client, injects a blob URL import map for bare specifiers, and patches require globals for the Flight protocol. Safe to call during SSR (no-ops on the server). Idempotent and concurrent-safe across React Strict Mode and HMR.

Also export `decodeFederationPayload`, `decodeFederationPayloadDetails`, `injectFederationCss`, and `setupFederationConsumer` from `spiceflow/federation-client`.
