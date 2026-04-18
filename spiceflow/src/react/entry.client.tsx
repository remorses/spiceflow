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

  const locationHeader = response.headers.get('location')
  const isRedirectResponse = response.status >= 300 && response.status <= 399
  if (locationHeader && isRedirectResponse) {
    const redirectLocation = new URL(locationHeader, args.url).toString()
    const isSameOriginRedirect =
      new URL(redirectLocation).origin === window.location.origin
    if (args.kind === 'navigation' && isSameOriginRedirect) {
      router.replace(redirectLocation)
      return never()
    }
    hardNavigate(redirectLocation)
    return never()
  }
  if (response.redirected) {
    const redirectLocation = getDocumentLocationFromResponse({
      response,
      requestUrl: args.url,
    })
    // For RSC navigations where the redirect stayed same-origin, do a
    // client-side redirect so the SPA shell (layout state, scroll, etc.)
    // is preserved instead of triggering a full page reload.
    const isSameOriginRedirect =
      response.url && new URL(response.url, args.url).origin === args.url.origin
    if (args.kind === 'navigation' && isSameOriginRedirect) {
      router.replace(redirectLocation)
      return never()
    }
    hardNavigate(redirectLocation)
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
  let pendingPayload: PayloadArgs | undefined
  type PayloadArgs = {
    payload: Promise<ServerPayload>
  }
  let setPayload: (v: PayloadArgs) => void = () => undefined
  // Direct setter without startTransition — used by callServer for form actions
  // so the payload update stays in React's form action transition instead of
  // creating a nested one (which would commit client state independently and
  // cause a flash of stale content).
  let setPayloadDirect: (v: PayloadArgs) => void = () => undefined
  let currentNavigationAbort = new AbortController()
  let currentNavigationRequestId: number | null = null

  const applyPayload = (args: PayloadArgs) => {
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
    currentNavigationAbort.abort()
    const navigationAbort = new AbortController()
    currentNavigationAbort = navigationAbort
    currentNavigationRequestId = event.requestId ?? null
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
    })
    Promise.resolve(payload)
      .then((resolved) => {
        if (currentNavigationAbort !== navigationAbort) return
        if (currentNavigationRequestId !== (event.requestId ?? null)) return
        router.__setLoaderData(resolved.root?.loaderData)
        currentNavigationRequestId = null
      })
      .catch(() => {
        if (currentNavigationRequestId !== (event.requestId ?? null)) return
        currentNavigationRequestId = null
      })
  }

  // Install the navigation subscription before hydration so an early Link click
  // cannot update the URL without also fetching the next flight payload.
  router.subscribe(handleNavigation)

  const callServer = async (id: string, args: unknown[]) => {
    const isFormAction =
      args.length > 0 && args[args.length - 1] instanceof FormData
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

      if (isFormAction) {
        setPayloadDirect({
          payload: payloadPromise,
        })
      }
      const payload = await payloadPromise

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
        // Resolve the action promise after scheduling the navigation.
        // Returning a never-settling promise keeps React form actions stuck in
        // the pending state, which prevents wrapped client form actions from
        // committing the follow-up navigation payload even though the URL
        // changed.
        const errorCtx = getErrorContext(payload.actionError)
        const redirectInfo = isRedirectError(errorCtx)
        if (redirectInfo) {
          const target = new URL(redirectInfo.location, window.location.href)
          if (target.origin !== window.location.origin) {
            hardNavigate(target.href)
          } else {
            const nextHref = `${target.pathname}${target.search}${target.hash}`
            queueMicrotask(() => {
              router.push(nextHref)
              router.refresh()
            })
          }
          return undefined
        }
        // Re-render the page tree with the latest payload before surfacing the
        // action error so ErrorBoundary fallbacks and server-rendered UI stay in
        // sync with the response.
        setPayloadDirect({
          payload: Promise.resolve(payload),
        })
        throw payload.actionError
      }

      router.__setLoaderData(payload.root?.loaderData)

      // Always re-render the page tree after a successful server action so
      // mutations are visible immediately. Uses setPayloadDirect (raw
      // setState, no startTransition) so the update joins whatever transition
      // is already active — e.g. React's form action transition. A nested
      // startTransition would create an independent transition that commits
      // separately from the caller's setState calls, causing a flash of stale
      // content.
      setPayloadDirect({
        payload: Promise.resolve(payload),
      })

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

  function BrowserRoot() {
    const [{ payload }, setPayload_] = React.useState<PayloadArgs>({
      payload: initialPayload,
    })
    const [_isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
      setPayload = (v) => startTransition(() => setPayload_(v))
      setPayloadDirect = setPayload_
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
        () => router.refresh(),
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
