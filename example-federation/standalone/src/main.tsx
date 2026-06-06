// Standalone federation consumer: a plain React SPA (no spiceflow, no RSC)
// that consumes federation payloads from a remote spiceflow server.
// This proves federation decode works outside the spiceflow framework.
//
// React and ReactDOM are externalized and resolved via import map in
// index.html (esm.sh). This means both the app and remote federation
// chunks share the same React instance without blob URLs.

import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'
import { ChatWidget } from './chat-widget'

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

const root = document.getElementById('root')!
ReactDOMClient.createRoot(root).render(<ChatWidget />)
