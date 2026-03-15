// SSR entry point. Receives RSC flight stream from the RSC environment,
// SSR-renders it to HTML, and injects the RSC payload inline for client hydration.
import { isbot } from 'isbot'

import React from 'react'
import ReactDOMServer from 'react-dom/server.edge'
import {
  createFromReadableStream,
  loadBootstrapScriptContent,
  importRscEnvironment,
} from 'virtual:bundler-adapter/ssr'

import { ServerPayload } from '../spiceflow.js'
import { LayoutContent } from './components.js'
import { FlightDataContext } from './context.js'
import { getErrorContext, isNotFoundError, isRedirectError } from './errors.js'
import { MetaProvider } from './head.js'
import { MetaState } from './metastate.js'
import { injectRSCPayload } from './transform.js'

export async function fetchHandler(request: Request) {
  try {
    const url = new URL(request.url)
    const rscEntry = await importRscEnvironment()
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

export async function renderHtml({
  response,
  request,
  prerender,
}: {
  prerender?: boolean
  request: Request
  response: Response
}) {
  // Two-way split of the RSC flight stream:
  // - flightForSsr: decoded once, used for both formState extraction and SSR rendering
  // - flightStream2: injected raw into HTML as <script> tags for client hydration
  const [flightForSsr, flightStream2] = response.body!.tee()

  let baseUrl = new URL('/', request.url).href
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const metaState = new MetaState({ baseUrl })

  const bootstrapScriptContent = await loadBootstrapScriptContent()

  // Single deserialization: create the payload promise once, reuse for both
  // formState extraction (awaited eagerly) and SSR rendering (React.use inside component).
  const payloadPromise = createFromReadableStream<ServerPayload>(flightForSsr)

  function SsrRoot() {
    const payload = React.use(payloadPromise)
    return (
      <MetaProvider metaState={metaState}>
        <FlightDataContext.Provider value={payloadPromise}>
          <LayoutContent />
        </FlightDataContext.Provider>
      </MetaProvider>
    )
  }

  let htmlStream: ReadableStream & { allReady: Promise<void> }
  // Preserve the status from the flight response (e.g. 404 for not-found pages)
  let status = response.status

  try {
    const payload = await payloadPromise
    htmlStream = await ReactDOMServer.renderToReadableStream(<SsrRoot />, {
      bootstrapScriptContent,
      signal: request.signal,
      formState: payload.formState,
      onError(e) {
        console.error('[entry.ssr.tsx:renderToReadableStream]', e)
        if (e && typeof e === 'object') {
          const digest = 'digest' in e ? e.digest : undefined
          if (typeof digest === 'string') return digest

          const message = 'message' in e ? e.message : undefined
          if (typeof message === 'string') return message
        }

        if (e instanceof Error) {
          return e.message
        }

        return String(e)
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
      <html>
        <head>
          <meta charSet="utf-8" />
        </head>
        <body>
          <noscript>{status} Internal Server Error</noscript>
        </body>
      </html>
    )

    // Prepend self.__NO_HYDRATE=1 so the browser entry uses createRoot instead of hydrateRoot,
    // avoiding hydration mismatch errors against this error shell HTML.
    htmlStream = await ReactDOMServer.renderToReadableStream(errorRoot, {
      bootstrapScriptContent: `self.__NO_HYDRATE=1;${bootstrapScriptContent}`,
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

export async function prerender(request: Request) {
  const reactServer = await importRscEnvironment()
  const response = await reactServer.handler(request)
  const responseClone = response.clone()
  const htmlRes = await renderHtml({ response, request, prerender: true })
  const html = await htmlRes.text()
  return { rscResponse: responseClone, response, html }
}

export async function getPrerenderRoutes() {
  let rsc = await importRscEnvironment()
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


