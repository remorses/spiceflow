---
'spiceflow': minor
---

Add `spiceflow/federation-client` subpath for standalone federation consumers. Any React app (Next.js, plain SPA, etc.) can now consume federation payloads from a spiceflow remote without using the spiceflow framework.

```ts
import * as SpiceflowReact from 'spiceflow/react'
import ReactClient from 'react-server-dom-webpack/client.browser'
import { setupFederationConsumer } from 'spiceflow/federation-client'

setupFederationConsumer({
  reactServerDomWebpack: ReactClient,
  modules: { 'spiceflow/react': SpiceflowReact },
})
```

`setupFederationConsumer()` wires up the Flight client, injects a blob URL import map for modules not already in the page's import map, and patches require globals for the Flight protocol. Safe to call during SSR (no-ops on the server, skips DOM APIs). Idempotent across React Strict Mode and HMR.

`federationPatchWebpack()` is a Vite plugin that stubs `__webpack_require__` for environments where `react-server-dom-webpack` is loaded from esm.sh or other CDNs.

Also export `decodeFederationPayloadDetails`, `setFederationFlightClient`, `parseFederationPayload`, `loadFederatedClientModules`, and `resolveFederatedUrl` from `spiceflow/federation-client`.
