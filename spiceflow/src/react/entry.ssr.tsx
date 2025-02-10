import type { IncomingMessage, ServerResponse } from 'node:http'
import ReactDOMServer from 'react-dom/server.edge'
import ReactClient from 'spiceflow/dist/react/server-dom-client-optimized'
import type { ModuleRunner } from 'vite/module-runner'

import {
  createRequest,
  fromPipeableToWebReadable,
  fromWebToNodeReadable,
  sendResponse,
} from './utils/fetch.js'
import { injectRSCPayload } from 'rsc-html-stream/server'
import {
  DefaultGlobalErrorPage,
  ErrorBoundary,
  FlightDataContext,
} from './components.js'
import { bootstrapModules } from 'virtual:ssr-assets'
import { clientReferenceManifest } from './utils/client-reference.js'
import cssUrls from 'virtual:app-styles'
import { ServerPayload } from '../spiceflow.js'
import { Suspense } from 'react'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const request = createRequest(req, res)
  const url = new URL(request.url)
  const rscEntry = await importRscEntry()
  const response = await rscEntry.handler(url, request)

  if (!response.headers.get('content-type')?.startsWith('text/x-component')) {
    sendResponse(response, res)
    return
  }

  if (url.searchParams.has('__rsc')) {
    sendResponse(response, res)
    return
  }

  const [flightStream1, flightStream2] = response.body!.tee()

  const payload = await ReactClient.createFromNodeStream<ServerPayload>(
    fromWebToNodeReadable(flightStream1),
    clientReferenceManifest,
  )
  const ssrAssets = await import('virtual:ssr-assets')
  const el = (
    <FlightDataContext.Provider value={payload.root}>
      {cssUrls.map((url) => (
        // precedence to force head rendering
        // https://react.dev/reference/react-dom/components/link#special-rendering-behavior
        <link key={url} rel="stylesheet" href={url} precedence="high" />
      ))}
      {payload.root?.layouts?.[0]?.element ?? payload.root.page}
    </FlightDataContext.Provider>
  )

  let htmlStream: ReadableStream
  let status = 200

  try {
    htmlStream = await ReactDOMServer.renderToReadableStream(el, {
      bootstrapModules: ssrAssets.bootstrapModules,
      formState: payload.formState,
      onError(error) {
		// This also throws outside, no need to do anything here
        // console.error('[react-dom:renderToPipeableStream]', error)
        // status = 500
      },
    })
  } catch (e) {
    console.log(`error during ssr render catch`, e)
    // On error, render minimal HTML shell
    // Client will do full CSR render and show error boundary
    status = 500
    const errorRoot = (
      <html data-no-hydrate>
        <head>
          <meta charSet="utf-8" />
        </head>
        <body>
          <noscript>{status} Internal Server Error</noscript>
        </body>
      </html>
    )

    htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapModules: ssrAssets.bootstrapModules,
    })
  }

  const htmlResponse = new Response(
    htmlStream.pipeThrough(injectRSCPayload(flightStream2)),
    {
      status,
      headers: {
        'content-type': 'text/html;charset=utf-8',
      },
    },
  )
  sendResponse(htmlResponse, res)
}

declare let __rscRunner: ModuleRunner

async function importRscEntry(): Promise<typeof import('./entry.rsc.js')> {
  if (import.meta.env.DEV) {
    return await __rscRunner.import('spiceflow/dist/react/entry.rsc')
  } else {
    return await import('virtual:build-rsc-entry' as any)
  }
}
