// Browser entry point. Hydrates the React tree from the RSC payload
// embedded in the HTML, sets up client-side navigation and server action calls.
import React from 'react'
import ReactDomClient from 'react-dom/client'
import {
  createFromReadableStream,
  createFromFetch,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { FiberProvider } from 'its-fine'
import type { NavigationEvent } from './router.js'
import { isHashOnlyLocationChange, router } from './router.js'
import {
  DefaultGlobalErrorPage,
  DefaultNotFoundPage,
  ErrorBoundary,
  LayoutContent,
  NotFoundBoundary,
} from './components.js'
import { ServerPayload } from '../spiceflow.js'
import { FlightDataContext, useFlightData } from './context.js'
import {
  getDocumentLocationFromResponse,
  isFlightResponse,
  isDeploymentMismatchResponse,
} from './deployment.js'
import { getErrorContext, isRedirectError } from './errors.js'
import { actionAbortControllers } from './action-abort.js'

// Reads the RSC flight payload that the server injected as <script> tags via
// transform.ts. Chunks already pushed before this module runs are drained,
// then future pushes are forwarded live. Stream closes on DOMContentLoaded.
const rscStream = new ReadableStream<Uint8Array>({
  start(controller) {
    if (typeof window === 'undefined') return
    const encoder = new TextEncoder()
    const enqueue = (chunk: string | Uint8Array) => {
      controller.enqueue(
        typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
      )
    }

    const flightData = Reflect.get(window, '__FLIGHT_DATA')
    const chunks = Array.isArray(flightData) ? flightData : []
    if (!Array.isArray(flightData)) {
      Reflect.set(window, '__FLIGHT_DATA', chunks)
    }
    chunks.forEach(enqueue)
    Reflect.set(chunks, 'push', enqueue)

    if (document.readyState !== 'loading') {
      controller.close()
    } else {
      document.addEventListener('DOMContentLoaded', () => controller.close())
    }
  },
})

function hardNavigate(location: string) {
  window.location.replace(location)
}

function never() {
  return new Promise<never>(() => undefined)
}

async function fetchFlightResponse(args: {
  url: URL
  init?: RequestInit
  kind: 'navigation' | 'action'
}) {
  const response = await fetch(args.url, { ...args.init, cache: 'no-store' })

  if (isDeploymentMismatchResponse(response)) {
    hardNavigate(
      getDocumentLocationFromResponse({
        response,
        requestUrl: args.url,
      }),
    )
    return never()
  }

  if (response.redirected) {
    hardNavigate(
      getDocumentLocationFromResponse({
        response,
        requestUrl: args.url,
      }),
    )
    return never()
  }

  if (!isFlightResponse(response)) {
    // Non-flight responses can't be deserialized — hard navigate for navigations,
    // throw for actions. Flight responses (even with 404/500 status) are kept so
    // the error flows through React error boundaries without a full page reload.
    if (args.kind === 'navigation') {
      hardNavigate(
        getDocumentLocationFromResponse({
          response,
          requestUrl: args.url,
        }),
      )
      return never()
    }
  }

  if (args.kind === 'action' && !isFlightResponse(response)) {
    throw new Error(
      `Expected action response to be text/x-component but got ${response.status}`,
    )
  }

  return response
}

// Expose createFromReadableStream globally for federation RemoteIsland components
// that need to decode Flight payloads from remote servers in the browser.
globalThis.__spiceflow_createFromReadableStream = createFromReadableStream

function getErrorDigest(error: Error): string | undefined {
  const digest = Reflect.get(error, 'digest')
  if (typeof digest !== 'string') return undefined
  if (!digest) return undefined
  return digest
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (value == null || typeof value !== 'object') return false
  return typeof Reflect.get(value, Symbol.asyncIterator) === 'function'
}

// React prod replaces error.message with a generic string for security but
// keeps error.digest (set by our onError callback). Restore the original
// message so user code can read it. Works for errors thrown mid-stream
// (async generators) and for directly thrown action errors.
function restoreErrorDigest(err: unknown): never {
  if (err instanceof Error) {
    const digest = getErrorDigest(err)
    if (digest) err.message = digest
  }
  throw err
}

// Wraps async generator return values so errors thrown mid-stream get their
// message restored from digest before reaching user code.
function wrapReturnValueErrors(value: unknown): unknown {
  if (isAsyncIterable(value)) {
    const orig = value
    return {
      [Symbol.asyncIterator]() {
        const it = orig[Symbol.asyncIterator]()
        const wrapped = {
          async next() {
            try {
              return await it.next()
            } catch (err) {
              restoreErrorDigest(err)
            }
          },
          async return(v?: unknown) {
            try {
              return await (it.return?.(v) ?? { done: true, value: undefined })
            } catch (err) {
              restoreErrorDigest(err)
            }
          },
          async throw(e?: unknown) {
            try {
              return await (it.throw?.(e) ?? Promise.reject(e))
            } catch (err) {
              restoreErrorDigest(err)
            }
          },
          [Symbol.asyncIterator]() {
            return this
          },
        }
        return wrapped
      },
    }
  }
  return value
}

async function main() {
  let pendingPayload:
    | {
        payload: Promise<ServerPayload>
        requestId: number | null
        source: 'navigate' | 'refresh'
      }
    | undefined
  let setPayload: (v: {
    payload: Promise<ServerPayload>
    requestId: number | null
    source: 'navigate' | 'refresh'
  }) => void = () => undefined
  let currentNavigationAbort = new AbortController()
  let currentNavigationRequestId: number | null = null
  let currentNavigationSource: 'navigate' | 'refresh' = 'navigate'

  const applyPayload = (args: {
    payload: Promise<ServerPayload>
    requestId: number | null
    source: 'navigate' | 'refresh'
  }) => {
    pendingPayload = args
    setPayload(args)
  }

  const handleNavigation = async (event: NavigationEvent) => {
    if (event.action === 'LOADER_DATA') return
    if (
      isHashOnlyLocationChange({
        previousLocation: event.previousLocation,
        location: event.location,
      })
    ) {
      return
    }
    if (currentNavigationSource === 'refresh') {
      router.__failRefresh({
        requestId: currentNavigationRequestId,
        reason: 'aborted',
      })
    }
    currentNavigationAbort.abort()
    const navigationAbort = new AbortController()
    currentNavigationAbort = navigationAbort
    currentNavigationRequestId = event.requestId ?? null
    currentNavigationSource = event.source
    const url = new URL(window.location.href)
    url.pathname = url.pathname === '/' ? '/index.rsc' : url.pathname + '.rsc'
    url.searchParams.set('__rsc', '')
    const payload = createFromFetch<ServerPayload>(
      fetchFlightResponse({
        url,
        kind: 'navigation',
        init: { signal: navigationAbort.signal },
      }),
    )
    if (navigationAbort.signal.aborted) return
    applyPayload({
      payload,
      requestId: event.requestId ?? null,
      source: event.source,
    })
    Promise.resolve(payload)
      .then((resolved) => {
        if (currentNavigationAbort !== navigationAbort) return
        if (currentNavigationRequestId !== (event.requestId ?? null)) return
        router.__setLoaderData(resolved.root?.loaderData)
      })
      .catch(() => {
        if (currentNavigationRequestId !== (event.requestId ?? null)) return
        if (event.source === 'refresh') {
          router.__failRefresh({
            requestId: event.requestId ?? null,
            reason: navigationAbort.signal.aborted ? 'aborted' : 'error',
          })
        }
        currentNavigationRequestId = null
      })
  }

  // Install the navigation subscription before hydration so an early Link click
  // cannot update the URL without also fetching the next flight payload.
  router.subscribe(handleNavigation)

  const callServer = async (id: string, args: unknown[]) => {
    // Form submissions (via <form action>) include FormData as the last arg.
    // Re-render the page for form actions; skip for direct calls to preserve
    // client state. This heuristic covers all React form submissions.
    const isFormAction = args.length > 0 && args[args.length - 1] instanceof FormData
    // Temporary references track non-serializable values (DOM nodes, React elements) passed
    // as action args. Same set is shared with createFromFetch so they round-trip correctly.
    const temporaryReferences = createTemporaryReferenceSet()
    const actionAbort = new AbortController()
    actionAbortControllers.set(id, actionAbort)

    try {
      const url = new URL(window.location.href)
      url.searchParams.set('__rsc', id)

      // Await the fetch here so abort errors propagate before we touch React state.
      // fetchFlightResponse already awaits fetch() internally, so there's no streaming
      // loss — the response body still streams through createFromFetch.
      const response = await fetchFlightResponse({
        url,
        kind: 'action',
        init: {
          method: 'POST',
          body: await encodeReply(args, { temporaryReferences }),
          signal: actionAbort.signal,
        },
      })

      const payloadPromise = createFromFetch<ServerPayload>(
        Promise.resolve(response),
        { temporaryReferences },
      )

      // Re-render the page tree for form actions so server-rendered content
      // updates (e.g. server counter, form revalidation). Direct function
      // calls skip re-rendering to avoid resetting client state.
      if (isFormAction) {
        setPayload({
          payload: payloadPromise,
          requestId: null,
          source: 'navigate',
        })
      }
      const payload = await payloadPromise
      if (isFormAction) {
        router.__setLoaderData(payload.root?.loaderData)
      }

      if (payload.actionError) {
        // React prod strips both error.message and error.digest for Error values
        // serialized in the flight payload (not thrown during rendering).
        // Restore both from the separately-serialized plain string.
        if (payload.actionErrorDigest) {
          if (payload.actionError instanceof Error) {
            Reflect.set(payload.actionError, 'digest', payload.actionErrorDigest)
            payload.actionError.message = payload.actionErrorDigest
          }
        }
        // Redirect errors from throw redirect() in server actions: navigate
        // to the target URL instead of throwing to the caller.
        const errorCtx = getErrorContext(payload.actionError)
        const redirectInfo = isRedirectError(errorCtx)
        if (redirectInfo) {
          const target = new URL(redirectInfo.location, window.location.href)
          if (target.origin !== window.location.origin) {
            hardNavigate(target.href)
          } else {
            router.push(`${target.pathname}${target.search}${target.hash}`)
          }
          return never()
        }
        throw payload.actionError
      }

      return wrapReturnValueErrors(payload.returnValue)
    } finally {
      // Only clean up if this call's controller is still the active one.
      // A newer concurrent call to the same action may have overwritten it.
      if (actionAbortControllers.get(id) === actionAbort) {
        actionAbortControllers.delete(id)
      }
    }
  }
  setServerCallback(callServer)

  const initialPayload = createFromReadableStream<ServerPayload>(rscStream)
  // Seed the loader data store from the initial RSC payload so getLoaderData()
  // resolves for top-level await in client modules.
  // Wrap in Promise.resolve because createFromReadableStream returns a thenable
  // (not a full Promise), so .then() doesn't return something with .catch().
  Promise.resolve(initialPayload)
    .then((payload) => {
      router.__setLoaderData(payload.root?.loaderData)
    })
    .catch(() => {})

  function PayloadCommitListener({
    requestId,
    source,
  }: {
    requestId: number | null
    source: 'navigate' | 'refresh'
  }) {
    const data = useFlightData()

    React.useEffect(() => {
      if (source !== 'refresh' || requestId == null) {
        return
      }
      if (currentNavigationRequestId !== requestId) {
        return
      }
      currentNavigationRequestId = null
      router.__commitRefresh({ requestId })
    }, [data, requestId, source])

    return null
  }

  function BrowserRoot() {
    const [{ payload, requestId, source }, setPayload_] = React.useState<{
      payload: Promise<ServerPayload>
      requestId: number | null
      source: 'navigate' | 'refresh'
    }>({
      payload: initialPayload,
      requestId: null,
      source: 'navigate',
    })
    const [_isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
      setPayload = (v) => startTransition(() => setPayload_(v))
      if (!pendingPayload) return
      const nextPayload = pendingPayload
      pendingPayload = undefined
      setPayload(nextPayload)
    }, [startTransition, setPayload_])

    return (
      <FiberProvider>
        <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>
          <NotFoundBoundary component={DefaultNotFoundPage}>
            <FlightDataContext.Provider value={payload}>
              <PayloadCommitListener requestId={requestId} source={source} />
              <LayoutContent />
            </FlightDataContext.Provider>
          </NotFoundBoundary>
        </ErrorBoundary>
      </FiberProvider>
    )
  }

  // When SSR fails, the server injects self.__NO_HYDRATE=1 in the bootstrap script.
  // In that case use createRoot (CSR from scratch) instead of hydrateRoot which would
  // throw hydration mismatch errors against the error shell HTML.
  if (Reflect.has(globalThis, '__NO_HYDRATE')) {
    ReactDomClient.createRoot(document).render(<BrowserRoot />)
  } else {
    ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
      formState: (await initialPayload).formState,
    })
  }

  if (import.meta.hot) {
    // Debounce rapid HMR events (e.g. save + format save) to avoid firing
    // multiple RSC fetches in quick succession. On Cloudflare Workers this
    // race condition causes "hanging Promise was canceled" errors because
    // promises from the old request context resolve in the new one.
    let hmrTimer: ReturnType<typeof setTimeout> | undefined
    import.meta.hot.on('rsc:update', (e: { file: string }) => {
      console.log('[rsc:update]', e.file)
      clearTimeout(hmrTimer)
      hmrTimer = setTimeout(
        () => void router.refresh().catch(() => undefined),
        80,
      )
    })
  }
}

if (import.meta.hot) {
  window.onerror = (_event, _source, _lineno, _colno, err) => {
    const ErrorOverlay = customElements.get('vite-error-overlay')
    if (!ErrorOverlay) return
    const overlay = Reflect.construct(ErrorOverlay, [err])
    if (!(overlay instanceof HTMLElement)) return
    document.body.appendChild(overlay)
  }
}

void main()
