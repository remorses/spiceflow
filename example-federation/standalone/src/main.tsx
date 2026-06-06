// Library entry for a standalone federation consumer npm package.
// Built with Vite library mode; React is externalized so the host app
// provides its own copy. Everything else (spiceflow/federation-client,
// spiceflow/react) is bundled into the output.
//
// Host apps import this package then call `await federationReady`
// before rendering any federation components.

import * as React from 'react'
import * as ReactJsx from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as SpiceflowReact from 'spiceflow/react'
import { setupFederationConsumer } from 'spiceflow/federation-client'

export const federationReady = setupFederationConsumer({
  modules: {
    'react': React,
    'react/jsx-runtime': ReactJsx,
    'react/jsx-dev-runtime': ReactJsx,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'spiceflow/react': SpiceflowReact,
  },
})

export { ChatWidget } from './chat-widget'
