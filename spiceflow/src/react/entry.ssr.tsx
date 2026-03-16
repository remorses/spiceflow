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
import { getErrorContext, isNotFoundError, isRedirectError, contextHeaders, contextToHeaders, type ReactServerErrorContext } from './errors.js'
import { formatServerError } from './format-server-error.js'
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
  // Three-way split of the RSC flight stream:
  // - flightForFormState: decoded eagerly to extract formState for renderToReadableStream options
  // - flightForSsr: decoded lazily inside SsrRoot so React's preinit/preloading context is active
  // - flightStream2: injected raw into HTML as <script> tags for client hydration
  const [flightForSsrAndForm, flightStream2] = response.body!.tee()
  const [flightForFormState, flightForSsr] = flightForSsrAndForm.tee()

  let baseUrl = new URL('/', request.url).href
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const metaState = new MetaState({ baseUrl })

  const bootstrapScriptContent = await loadBootstrapScriptContent()

  // Keep the first SSR-side createFromReadableStream call inside ReactDOMServer
  // render context so React can register preinit/preload hints for client refs.
  let payloadPromise: Promise<ServerPayload> | undefined

  function SsrRoot() {
    payloadPromise ??= createFromReadableStream<ServerPayload>(flightForSsr)
    const payload = React.use(payloadPromise!)
    return (
      <MetaProvider metaState={metaState}>
        <FlightDataContext.Provider value={payloadPromise!}>
          <LayoutContent />
        </FlightDataContext.Provider>
      </MetaProvider>
    )
  }

  let htmlStream: ReadableStream & { allReady: Promise<void> }
  // Preserve the status from the flight response (e.g. 404 for not-found pages)
  let status = response.status
  // When a page throws redirect/notFound, the error flows through the RSC
  // flight stream as a digest string. During SSR, it can surface through
  // onError (inside implicit Suspense from flight lazy chunks) instead of
  // rejecting renderToReadableStream. Capture it here so both paths — the
  // catch block and the onError callback — can short-circuit the response.
  let ssrErrorCtx: ReactServerErrorContext | undefined

  function shouldReplaceCtx(next: ReactServerErrorContext) {
    if (!ssrErrorCtx) return true
    // Redirect takes priority over notFound when multiple errors fire
    return Boolean(isRedirectError(next)) && !isRedirectError(ssrErrorCtx)
  }

  function handleErrorContext(ctx: ReactServerErrorContext) {
    if (isRedirectError(ctx)) {
      const mergedHeaders = new Headers(response.headers)
      for (const [k, v] of contextToHeaders(ctx)) {
        mergedHeaders.append(k, v)
      }
      // Override content-type so fetchHandler doesn't mistake this for a
      // flight response and try to SSR-render the null body.
      mergedHeaders.set('content-type', 'text/html;charset=utf-8')
      return new Response(null, { status: ctx.status, headers: mergedHeaders })
    }
    if (isNotFoundError(ctx)) {
      status = 404
    }
  }

  try {
    const formStatePayload = await createFromReadableStream<ServerPayload>(
      flightForFormState,
    )
    htmlStream = await ReactDOMServer.renderToReadableStream(<SsrRoot />, {
      bootstrapScriptContent,
      signal: request.signal,
      formState: formStatePayload.formState,
      onError(e) {
        const ctx = getErrorContext(e)
        if (ctx) {
          if (shouldReplaceCtx(ctx)) ssrErrorCtx = ctx
        } else {
          formatServerError(e)
          console.error('[entry.ssr.tsx:renderToReadableStream]', e)
        }
        if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string') return e.digest
        if (e instanceof Error) return e.message
        return String(e)
      },
    })
    if (prerender || isbot(request.headers.get('user-agent') || '')) {
      await htmlStream.allReady
    } else {
      // Race allReady against a short timeout to catch redirect/notFound
      // errors from Suspense boundaries without blocking normal streaming.
      let timerId: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<void>((r) => { timerId = setTimeout(r, 50) })
      await Promise.race([
        htmlStream.allReady.finally(() => { if (timerId) clearTimeout(timerId) }),
        timeout,
      ])
    }

    if (ssrErrorCtx) {
      const res = handleErrorContext(ssrErrorCtx)
      if (res) return res
    }
  } catch (e) {
    // Client disconnects surface as abort errors when we race allReady.
    // Don't convert these to 500 error shells — just rethrow.
    if (e instanceof Error && e.name === 'AbortError') throw e
    if (request.signal.aborted) throw e

    status = 500
    const errCtx = getErrorContext(e)
    if (errCtx) {
      const res = handleErrorContext(errCtx)
      if (res) return res
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
