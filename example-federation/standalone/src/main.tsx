// Standalone federation consumer: a plain React SPA (no spiceflow, no RSC)
// that consumes federation payloads from a remote spiceflow server.
// This proves federation decode works outside the spiceflow framework.
//
// React and ReactDOM are externalized and resolved via import map in
// index.html (esm.sh). This means both the app and remote federation
// chunks share the same React instance without blob URLs.

import * as SpiceflowReact from 'spiceflow/react'
import ReactClient from 'react-server-dom-webpack/client.browser'
import { setupFederationConsumer } from 'spiceflow/federation-client'
import { createRoot } from 'react-dom/client'
import { ChatWidget } from './chat-widget'

setupFederationConsumer({
  reactServerDomWebpack: ReactClient,
  modules: {
    // Only spiceflow/react needs a blob URL mapping — React itself is
    // already in the HTML import map so remote chunks resolve it directly.
    'spiceflow/react': SpiceflowReact,
  },
})

const root = document.getElementById('root')!
createRoot(root).render(<ChatWidget />)
