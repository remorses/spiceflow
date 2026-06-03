// Standalone federation consumer: a plain React SPA (no spiceflow, no RSC)
// that consumes federation payloads from a remote spiceflow server.
// This proves federation decode works outside the spiceflow framework.

// Must be imported first to set up __webpack_require__ shim before
// react-server-dom-webpack is evaluated (its CJS accesses __webpack_require__.u
// at the top level).
import './flight-client'

import ReactClient from 'react-server-dom-webpack/client.browser'
import { setFederationFlightClient } from 'spiceflow/federation-client'
import { createRoot } from 'react-dom/client'
import { ChatWidget } from './chat-widget'

setFederationFlightClient({
  createFromReadableStream<T>(stream: ReadableStream<Uint8Array>) {
    return ReactClient.createFromReadableStream(stream, {
      callServer() {
        throw new Error('Server actions are not supported in standalone federation consumers')
      },
    })
  },
  createFromFetch<T>(response: Promise<Response>) {
    return ReactClient.createFromFetch(response, {
      callServer() {
        throw new Error('Server actions are not supported in standalone federation consumers')
      },
    })
  },
})

const root = document.getElementById('root')!
createRoot(root).render(<ChatWidget />)
