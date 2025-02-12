import { isbot } from 'isbot'
import type { IncomingMessage, ServerResponse } from 'node:http'

import ReactDOMServer from 'react-dom/server.edge'
import ReactClient from 'spiceflow/dist/react/references.ssr'
import type { ModuleRunner } from 'vite/module-runner'

import cssUrls from 'virtual:app-styles'
import { ServerPayload } from '../spiceflow.js'
import { LayoutContent } from './components.js'
import { FlightDataContext } from './context.js'
import { getErrorContext, isNotFoundError, isRedirectError } from './errors.js'
import { MetaProvider } from './head.js'
import { MetaState } from './metastate.js'
import { injectRSCPayload } from './transform.js'
import { clientReferenceManifest } from './utils/client-reference.js'
import {
  createRequest,
  fromWebToNodeReadable,
  sendResponse,
} from './utils/fetch.js'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const request = createRequest(req, res)
  const response = await fetchHandler(request)
  sendResponse(response, res)
}

export async function fetchHandler(request: Request) {
  const url = new URL(request.url)
  const rscEntry = await importRscEntry()
  const response = await rscEntry.handler(request)

  if (!response.headers.get('content-type')?.startsWith('text/x-component')) {
    return response
  }

  if (url.searchParams.has('__rsc')) {
    return response
  }

  const htmlResponse = await renderHtml({ response, request })

  return htmlResponse
}

async function renderHtml({
  response,
  request,
  prerender,
}: {
  prerender?: boolean
  request: Request
  response: Response
}) {
  const [flightStream1, flightStream2] = response.body!.tee()

  const payloadPromise = ReactClient.createFromNodeStream<ServerPayload>(
    fromWebToNodeReadable(flightStream1),
    clientReferenceManifest,
  )
  let baseUrl = new URL('/', request.url).href
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const metaState = new MetaState({ baseUrl })

  const ssrAssets = await import('virtual:ssr-assets')
  const el = (
    <MetaProvider metaState={metaState}>
      <FlightDataContext.Provider value={payloadPromise}>
        {cssUrls.map((url) => (
          // precedence to force head rendering
          // https://react.dev/reference/react-dom/components/link#special-rendering-behavior
          <link key={url} rel="stylesheet" href={url} precedence="high" />
        ))}
        <LayoutContent />
      </FlightDataContext.Provider>
    </MetaProvider>
  )

  // https://react.dev/reference/react-dom/server/renderToReadableStream
  let htmlStream: ReadableStream & { allReady: Promise<void> }
  let status = 200

  try {
    let payload = await payloadPromise
    htmlStream = await ReactDOMServer.renderToReadableStream(el, {
      bootstrapModules: ssrAssets.bootstrapModules,
      signal: request.signal,
      formState: payload.formState,
      onError(e) {
        // This also throws outside, no need to do anything here
        console.error('[entry.srr.tsx:renderToPipeableStream]', e)
        return e?.digest || e?.message
      },
    })
    if (prerender || isbot(request.headers.get('user-agent') || '')) {
      await htmlStream.allReady
    }
  } catch (e) {
    status = 500
    console.log(`error during ssr render catch`, e)
    let errCtx = getErrorContext(e)
    if (errCtx && isRedirectError(errCtx)) {
      console.log(`redirecting to ${errCtx.headers?.location}`)
      return new Response(errCtx.headers?.location, {
        status: errCtx.status,
        headers: {
          ...Object.fromEntries(response.headers),
          ...errCtx.headers,
          contentType: 'text/html',
        },
      })
    }

    if (errCtx && isNotFoundError(errCtx)) {
      status = 404
    }

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
        </body>
      </html>
    )

    htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapModules: ssrAssets.bootstrapModules,
      signal: request.signal,
    })
  }

  let appendToHead = metaState.getProcessedTags()
  return new Response(
    htmlStream.pipeThrough(
      injectRSCPayload({
        rscStream: flightStream2,
        appendToHead,
      }),
    ),
    {
      status,
      headers: {
        // copy rsc headers, so spiceflow can add its own headers via .use()
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html;charset=utf-8',
      },
    },
  )
}

declare let __rscRunner: ModuleRunner

async function importRscEntry(): Promise<typeof import('./entry.rsc.js')> {
  if (import.meta.env.DEV) {
    return await __rscRunner.import('spiceflow/dist/react/entry.rsc')
  } else {
    return await import('virtual:build-rsc-entry' as any)
  }
}

// return stream and ssr at once for prerender
export async function prerender(request: Request) {
  const reactServer = await importRscEntry()

  const response = await reactServer.handler(request)

  const responseClone = response.clone()

  const htmlRes = await renderHtml({ response, request, prerender: true })
  const html = await htmlRes.text()
  return { rscResponse: responseClone, response, html }
}

export async function getPrerenderRoutes() {
  let rsc = await importRscEntry()
  const app = rsc.app
  return app
    .getAllRoutes()
    .filter(
      (route) =>
        route.kind === 'staticPage' ||
        route.kind === 'staticPageWithoutHandler',
    )
    .filter((x) => x.method === 'GET')
}
