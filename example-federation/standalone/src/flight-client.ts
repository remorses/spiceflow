// Standalone Flight client setup for consuming spiceflow federation payloads
// outside of a Vite RSC build.
//
// This file does two things:
// 1. Registers bundled React modules on a global so that import-map wrapper
//    files can re-export them. This ensures remote federation chunks (loaded
//    via dynamic import) use the same React instance as the app.
// 2. Sets up __federation_require__ (the renamed __webpack_require__) as a
//    stub so react-server-dom-webpack doesn't crash at import time.

import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'

const g = globalThis as any

g.__FEDERATION_MODULES__ = {
  'react': React,
  'react/jsx-runtime': ReactJsxRuntime,
  'react/jsx-dev-runtime': ReactJsxRuntime,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
}

// Stub for the renamed __webpack_require__. ensureRequirePatched() in
// spiceflow will replace this with one that checks the remote registry.
if (!g.__federation_require__) {
  g.__federation_require__ = (id: string) => {
    throw new Error(`[federation] Module not found: ${id}`)
  }
}
