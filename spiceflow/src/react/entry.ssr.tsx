// SSR entry point. Receives RSC flight stream from the RSC environment,
// SSR-renders it to HTML, and injects the RSC payload inline for client hydration.
import { isbot } from 'isbot'

import React from 'react'
import ReactDOMServer from 'react-dom/server.edge'
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'

import { ServerPayload } from '../spiceflow.js'
import { LayoutContent } from './components.js'
import { FlightDataContext } from './context.js'
import { getErrorContext, isNotFoundError, isRedirectError, contextHeaders, contextToHeaders, type ReactServerErrorContext } from './errors.js'
import { formatServerError } from './format-server-error.js'
import { MetaProvider } from './head.js'
import { MetaState } from './metastate.js'
import { ssrCache, createHashTransform, collectStream, getSsrCacheMode, hasUncacheableHeaders, prehashFlightStream } from './ssr-cache.js'
import { injectRSCPayload } from './transform.js'

let bootstrapScriptContentPromise: Promise<string> | undefined

function getBootstrapScriptContent() {
  const load = () => import.meta.viteRsc.loadBootstrapScriptContent('index')
  if (import.meta.env.DEV) {
    return load()
  }
  bootstrapScriptContentPromise ??= load()
  return bootstrapScriptContentPromise
}

async function importRscEnvironment(): Promise<typeof import('./entry.rsc.js')> {
  return import.meta.viteRsc.loadModule<typeof import('./entry.rsc.js')>(
    'rsc',
    'index',
  )
}

function buildHtmlHeaders(response: Response) {
  const responseHeaders: [string, string][] = [...response.headers]
  const htmlHeaders = responseHeaders.filter(([k]) => k.toLowerCase() !== 'content-type')
  htmlHeaders.push(['content-type', 'text/html;charset=utf-8'])
  return htmlHeaders
}

function canUsePrehashCache(request: Request) {
  return !request.headers.has('cookie') && !request.headers.has('authorization')
}

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
  const cacheMode = getSsrCacheMode()
  if (cacheMode === 'prehash') {
    return renderHtmlWithPrehashCache({ response, request, prerender })
  }

  return renderHtmlStreaming({
    response,
    request,
    prerender,
    cacheMode,
  })
}

async function renderHtmlStreaming({
  response,
  request,
  prerender,
  cacheMode,
  allReadyTimeoutMs = 50,
}: {
  prerender?: boolean
  request: Request
  response: Response
  cacheMode: 'off' | 'post'
  allReadyTimeoutMs?: number
}) {
  // GET/HEAD requests only need one SSR-side decode. POST/form submissions still
  // split a second SSR copy to extract formState before hydrateRoot runs.
  const needsFormState = request.method !== 'GET' && request.method !== 'HEAD'
  const [flightForSsrOrForm, flightStream2] = response.body!.tee()
  const [flightForFormState, flightForSsrRaw] = needsFormState
    ? flightForSsrOrForm.tee()
    : [undefined, flightForSsrOrForm]

  // In production, for cacheable GET/HEAD 2xx requests, pipe the SSR flight
  // stream through a hash transform. The hash accumulates as React consumes
  // chunks — no extra tee, no extra race. After allReady resolves within 50ms
  // we check the LRU cache using the completed hash digest.
  const canCache = cacheMode === 'post'
    && !import.meta.env.DEV
    && !prerender
    && !needsFormState
    && response.status >= 200
    && response.status < 300
    && !hasUncacheableHeaders(response.headers)

  const hashTransform = canCache ? createHashTransform() : undefined
  const flightForSsr = hashTransform
    ? flightForSsrRaw.pipeThrough({ readable: hashTransform.readable, writable: hashTransform.writable })
    : flightForSsrRaw

  let baseUrl = new URL('/', request.url).href
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }
  const metaState = new MetaState({ baseUrl })

  const bootstrapScriptContent = await getBootstrapScriptContent()

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

  // Track whether allReady resolved before the 50ms timeout. When true, the
  // full RSC stream was consumed and the hash digest is available for caching.
  let allReadyBeforeTimeout = false

  try {
    const renderOptions = {
      bootstrapScriptContent,
      signal: request.signal,
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
    }

    if (flightForFormState) {
      const formStatePayload = await createFromReadableStream<ServerPayload>(
        flightForFormState,
      )
      htmlStream = await ReactDOMServer.renderToReadableStream(<SsrRoot />, {
        ...renderOptions,
        formState: formStatePayload.formState,
      })
    } else {
      htmlStream = await ReactDOMServer.renderToReadableStream(
        <SsrRoot />,
        renderOptions,
      )
    }
    if (prerender || isbot(request.headers.get('user-agent') || '')) {
      await htmlStream.allReady
      allReadyBeforeTimeout = true
    } else {
      // Race allReady against a short timeout to catch redirect/notFound
      // errors from Suspense boundaries without blocking normal streaming.
      if (allReadyTimeoutMs <= 0) {
        allReadyBeforeTimeout = false
      } else {
        let timerId: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<'timeout'>((r) => { timerId = setTimeout(() => r('timeout'), allReadyTimeoutMs) })
        const winner = await Promise.race([
          htmlStream.allReady.then(() => 'ready' as const).finally(() => { if (timerId) clearTimeout(timerId) }),
          timeout,
        ])
        allReadyBeforeTimeout = winner === 'ready'
      }
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

  const htmlHeaders = buildHtmlHeaders(response)

  // When allReady resolved before timeout, await the hash digest. The
  // transform's flush() may run on a later microtask after allReady, so we
  // must await the promise rather than reading synchronously.
  const digest = allReadyBeforeTimeout && hashTransform
    ? await hashTransform.digestPromise
    : undefined
  if (digest && status < 300) {
    const cached = ssrCache.get(digest)
    if (cached) {
      // Cancel unconsumed streams to free tee branch buffers
      void htmlStream.cancel().catch(() => {})
      void flightStream2.cancel().catch(() => {})
      return new Response(cached.html, {
        status,
        headers: htmlHeaders,
      })
    }

    // Cache miss — collect the full HTML output and store it.
    const finalStream = htmlStream.pipeThrough(
      injectRSCPayload({
        rscStream: flightStream2,
        appendToHead,
      }),
    )
    const htmlBytes = await collectStream(finalStream)

    ssrCache.set(digest, {
      html: htmlBytes,
      status,
      headers: htmlHeaders,
      byteSize: htmlBytes.byteLength,
    })

    return new Response(htmlBytes, {
      status,
      headers: htmlHeaders,
    })
  }

  return new Response(
    htmlStream.pipeThrough(
      injectRSCPayload({
        rscStream: flightStream2,
        appendToHead,
      }),
    ),
    {
      status,
      headers: htmlHeaders,
    },
  )
}

async function renderHtmlWithPrehashCache({
  response,
  request,
  prerender,
}: {
  prerender?: boolean
  request: Request
  response: Response
}) {
  const isGetOrHead = request.method === 'GET' || request.method === 'HEAD'
  const canCache = !import.meta.env.DEV
    && !prerender
    && isGetOrHead
    && response.status >= 200
    && response.status < 300
    && !hasUncacheableHeaders(response.headers)
    && canUsePrehashCache(request)
    && !isbot(request.headers.get('user-agent') || '')

  if (!canCache) {
    return renderHtmlStreaming({
      response,
      request,
      prerender,
      cacheMode: 'off',
    })
  }

  const [flightForHash, flightOriginal] = response.body!.tee()
  const prehash = prehashFlightStream(flightForHash)
  const startedAt = Date.now()
  let timerId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timerId = setTimeout(() => resolve('timeout'), 50)
  })

  const prehashResult = await Promise.race([
    prehash.resultPromise.finally(() => {
      if (timerId) clearTimeout(timerId)
    }),
    timeout,
  ])

  if (prehashResult === 'timeout') {
    await prehash.cancel()
    const elapsedMs = Date.now() - startedAt
    const remainingAllReadyBudget = Math.max(0, 50 - elapsedMs)
    return renderHtmlStreaming({
      response: new Response(flightOriginal, {
        status: response.status,
        headers: response.headers,
      }),
      request,
      prerender,
      cacheMode: 'off',
      allReadyTimeoutMs: remainingAllReadyBudget,
    })
  }

  await flightOriginal.cancel().catch(() => {})
  const htmlHeaders = buildHtmlHeaders(response)
  const cached = ssrCache.get(prehashResult.digest)
  if (cached) {
    return new Response(cached.html, {
      status: response.status,
      headers: htmlHeaders,
    })
  }

  const htmlResponse = await renderHtmlStreaming({
    response: new Response(new Blob(prehashResult.chunks), {
      status: response.status,
      headers: response.headers,
    }),
    request,
    prerender,
    cacheMode: 'off',
    allReadyTimeoutMs: 0,
  })

  if (htmlResponse.status >= 300 || !htmlResponse.body) {
    return htmlResponse
  }

  const htmlBytes = await collectStream(htmlResponse.body)
  const headers: [string, string][] = [...htmlResponse.headers]
  ssrCache.set(prehashResult.digest, {
    html: htmlBytes,
    status: htmlResponse.status,
    headers,
    byteSize: htmlBytes.byteLength,
  })

  return new Response(htmlBytes, {
    status: htmlResponse.status,
    headers,
  })
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
