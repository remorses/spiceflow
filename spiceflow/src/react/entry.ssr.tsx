// SSR entry point. Receives RSC flight stream from the RSC environment,
// SSR-renders it to HTML, and injects the RSC payload inline for client hydration.
import { isbot } from 'isbot'
import type { IncomingMessage, ServerResponse } from 'node:http'

import ReactDOMServer from 'react-dom/server.edge'
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'

import cssUrls from 'virtual:app-styles'
import { ServerPayload } from '../spiceflow.js'
import { LayoutContent } from './components.js'
import { FlightDataContext } from './context.js'
import { getErrorContext, isNotFoundError, isRedirectError } from './errors.js'
import { MetaProvider } from './head.js'
import { MetaState } from './metastate.js'
import { injectRSCPayload } from './transform.js'
import {
  createRequest,
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
  try {
    const url = new URL(request.url)
    const rscEntry = await importRscEntry()
    const response = await rscEntry.handler(request)

    if (
      !response.headers.get('content-type')?.startsWith('text/x-component')
    ) {
      return response
    }

    if (url.searchParams.has('__rsc')) {
      return response
    }

    const htmlResponse = await renderHtml({ response, request })

    return htmlResponse
  } catch (err) {
    console.error('[fetchHandler] unexpected error', err)
    return new Response('', { status: 500 })
  }
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

  const payloadPromise = createFromReadableStream<ServerPayload>(flightStream1)

  let baseUrl = new URL('/', request.url).href
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const metaState = new MetaState({ baseUrl })

  const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent(
    'index',
  )

  const el = (
    <MetaProvider metaState={metaState}>
      <FlightDataContext.Provider value={payloadPromise}>
        {cssUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} precedence="high" />
        ))}
        <LayoutContent />
      </FlightDataContext.Provider>
    </MetaProvider>
  )

  let htmlStream: ReadableStream & { allReady: Promise<void> }
  let status = 200

  try {
    let payload = await payloadPromise
    htmlStream = await ReactDOMServer.renderToReadableStream(el, {
      bootstrapScriptContent,
      signal: request.signal,
      formState: payload.formState,
      onError(e) {
        console.error('[entry.ssr.tsx:renderToReadableStream]', e)
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
          'content-type': 'text/html;charset=utf-8',
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
            <link key={url} rel="stylesheet" href={url} precedence="high" />
          ))}
        </head>
        <body>
          <noscript>{status} Internal Server Error</noscript>
        </body>
      </html>
    )

    htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapScriptContent,
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
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html;charset=utf-8',
      },
    },
  )
}

async function importRscEntry(): Promise<typeof import('./entry.rsc.js')> {
  return await import.meta.viteRsc.loadModule<typeof import('./entry.rsc.js')>(
    'rsc',
    'index',
  )
}

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
    .filter((x) => x.method === 'GET' && !x.path.endsWith('.rsc'))
}
