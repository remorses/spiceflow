import type { IncomingMessage, ServerResponse } from 'node:http'
import ReactDOMServer from 'react-dom/server.edge'
import ReactClient from 'spiceflow/dist/react/server-dom-client-optimized'
import type { ModuleRunner } from 'vite/module-runner'

import { injectRSCPayload } from 'rsc-html-stream/server'
import cssUrls from 'virtual:app-styles'
import { ServerPayload } from '../spiceflow.js'
import { DefaultNotFoundPage, LayoutContent } from './components.js'
import { clientReferenceManifest } from './utils/client-reference.js'
import {
  createRequest,
  fromWebToNodeReadable,
  sendResponse,
} from './utils/fetch.js'
import { getErrorContext, isNotFoundError, isRedirectError } from './errors.js'
import { FlightDataContext } from './context.js'

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

  const payloadPromise = ReactClient.createFromNodeStream<ServerPayload>(
    fromWebToNodeReadable(flightStream1),
    clientReferenceManifest,
  )
  const ssrAssets = await import('virtual:ssr-assets')
  const el = (
    <FlightDataContext.Provider value={payloadPromise}>
      {cssUrls.map((url) => (
        // precedence to force head rendering
        // https://react.dev/reference/react-dom/components/link#special-rendering-behavior
        <link key={url} rel="stylesheet" href={url} precedence="high" />
      ))}
      <LayoutContent />
    </FlightDataContext.Provider>
  )

  let htmlStream: ReadableStream
  let status = 200

  try {
    let payload = await payloadPromise
    htmlStream = await ReactDOMServer.renderToReadableStream(el, {
      bootstrapModules: ssrAssets.bootstrapModules,
      formState: payload.formState,
      onError(e) {
        // This also throws outside, no need to do anything here
        console.error('[entry.srr.tsx:renderToPipeableStream]', e)
        return e?.digest || e?.message
      },
    })
  } catch (e) {
    status = 500
    console.log(`error during ssr render catch`, e)
    let errCtx = getErrorContext(e)
    if (errCtx && isRedirectError(errCtx)) {
      console.log(`redirecting to ${errCtx.headers?.location}`)
      sendResponse(
        new Response(errCtx.headers?.location, {
          status: errCtx.status,
          headers: {
            ...Object.fromEntries(response.headers),
            ...errCtx.headers,
            contentType: 'text/html',
          },
        }),
        res,
      )
      return
    }
    let content: any = null
    if (errCtx && isNotFoundError(errCtx)) {
      status = 404
      return
    }
    // https://bsky.app/profile/ebey.bsky.social/post/3lev4lqr2ak2j

    const errorRoot = (
      <html data-no-hydrate>
        <head>
          <meta charSet="utf-8" />
          {cssUrls.map((url) => (
            // precedence to force head rendering
            // https://react.dev/reference/react-dom/components/link#special-rendering-behavior
            <link key={url} rel="stylesheet" href={url} precedence="high" />
          ))}
        </head>
        <body>
          <noscript>{status} Internal Server Error</noscript>
          {content}
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
        // copy rsc headers, so spiceflow can add its own headers via .use()
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html;charset=utf-8',
      },
    },
  )

  console.log(`sending response`)
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
