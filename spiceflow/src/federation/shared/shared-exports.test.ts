// The import map points bare `react` specifiers at these shims. A missing export is a
// SyntaxError at module link time, so the whole host page fails to hydrate.
import { expect, test } from 'vitest'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as JsxRuntime from 'react/jsx-runtime'
import * as ReactShim from './react.ts'
import * as ReactDOMShim from './react-dom.ts'
import * as ReactDOMClientShim from './react-dom-client.ts'
import * as JsxRuntimeShim from './react-jsx-runtime.ts'

// `module.exports` is Node's CJS interop key, browsers never see it
const missing = (real: object, shim: object) =>
  Object.keys(real).filter((key) => key !== 'module.exports' && !(key in shim))

test('shared shims re-export every runtime export of the installed React', () => {
  expect({
    react: missing(React, ReactShim),
    'react-dom': missing(ReactDOM, ReactDOMShim),
    'react-dom/client': missing(ReactDOMClient, ReactDOMClientShim),
    'react/jsx-runtime': missing(JsxRuntime, JsxRuntimeShim),
  }).toMatchInlineSnapshot(`
    {
      "react": [],
      "react-dom": [],
      "react-dom/client": [],
      "react/jsx-runtime": [],
    }
  `)
})
