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
  onHmrUpdate,
  onHmrError,
} from 'virtual:bundler-adapter/client'
import { rscStream } from 'rsc-html-stream/client'

import { router } from './router.js'
import {
  DefaultGlobalErrorPage,
  DefaultNotFoundPage,
  ErrorBoundary,
  LayoutContent,
  NotFoundBoundary,
} from './components.js'
import { ServerPayload } from '../spiceflow.js'
import { FlightDataContext } from './context.js'
import {
  getDocumentLocationFromResponse,
  isFlightResponse,
  isDeploymentMismatchResponse,
} from './deployment.js'
import { getErrorContext } from './errors.js'

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
  const response = await fetch(args.url, args.init)

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

  if (args.kind === 'navigation') {
    if (response.status === 404 || !isFlightResponse(response)) {
      hardNavigate(
        getDocumentLocationFromResponse({
          response,
          requestUrl: args.url,
        }),
      )
      return never()
    }
  } else if (!isFlightResponse(response)) {
    throw new Error(
      `Expected action response to be text/x-component but got ${response.status}`,
    )
  }

  return response
}

async function main() {
  let setPayload: (v: Promise<ServerPayload>) => void = () => undefined

  const callServer = async (id: string, args: unknown[]) => {
    // Temporary references track non-serializable values (DOM nodes, React elements) passed
    // as action args. Same set is shared with createFromFetch so they round-trip correctly.
    const temporaryReferences = createTemporaryReferenceSet()
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', id)
    const payloadPromise = createFromFetch<ServerPayload>(
      fetchFlightResponse({
        url,
        kind: 'action',
        init: {
          method: 'POST',
          body: await encodeReply(args, { temporaryReferences }),
        },
      }),
      { temporaryReferences },
    )

    setPayload(payloadPromise)
    const payload = await payloadPromise

    if (payload.actionError) {
      console.log(getErrorContext(payload.actionError))
      throw payload.actionError
    }

    return payload.returnValue
  }
  setServerCallback(callServer)

  const initialPayload = createFromReadableStream<ServerPayload>(rscStream)

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)
    const [_isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
      setPayload = (v) => startTransition(() => setPayload_(v))
    }, [startTransition, setPayload_])

    React.useEffect(() => {
      return router.subscribe(async function onNavigation() {
        console.log('onNavigation')
        const url = new URL(window.location.href)
        url.pathname += '.rsc'
        url.searchParams.set('__rsc', '')
        const payload = createFromFetch<ServerPayload>(
          fetchFlightResponse({ url, kind: 'navigation' }),
        )
        setPayload(payload)
      })
    }, [])

    return (
      <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>
        <NotFoundBoundary component={DefaultNotFoundPage}>
          <FlightDataContext.Provider value={payload}>
            <LayoutContent />
          </FlightDataContext.Provider>
        </NotFoundBoundary>
      </ErrorBoundary>
    )
  }

  // When SSR fails, the server injects self.__NO_HYDRATE=1 in the bootstrap script.
  // In that case use createRoot (CSR from scratch) instead of hydrateRoot which would
  // throw hydration mismatch errors against the error shell HTML.
  if ('__NO_HYDRATE' in globalThis) {
    ReactDomClient.createRoot(document).render(<BrowserRoot />)
  } else {
    ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
      formState: (await initialPayload).formState,
    })
  }

  onHmrUpdate(() => router.refresh())
}

onHmrError()

main()
