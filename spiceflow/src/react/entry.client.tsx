import React, { Suspense } from 'react'
import type { ErrorPayload } from 'vite'
import { router } from './router.js'
import ReactDomClient from 'react-dom/client'
import ReactClient from 'spiceflow/dist/react/server-dom-client-optimized'

import type { CallServerFn } from './types/index.js'
import { clientReferenceManifest } from './utils/client-reference.js'
import { rscStream } from 'rsc-html-stream/client'
import {
  DefaultGlobalErrorPage,
  DefaultNotFoundPage,
  ErrorBoundary,
  LayoutContent,
  NotFoundBoundary,
} from './components.js'
import { ServerPayload } from '../spiceflow.js'
import { FlightDataContext } from './context.js'

async function main() {
  const callServer: CallServerFn = async (id, args) => {
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', id)
    const payloadPromise = ReactClient.createFromFetch<ServerPayload>(
      fetch(url, {
        method: 'POST',
        body: await ReactClient.encodeReply(args),
      }),
      clientReferenceManifest,
      { callServer },
    )
    // console.log({ 'action payload': payload })
    setPayload(payloadPromise)
    let payload = await payloadPromise
    return payload.returnValue
  }
  Object.assign(globalThis, { __callServer: callServer })

  const initialPayload = ReactClient.createFromReadableStream<ServerPayload>(
    rscStream,
    clientReferenceManifest,

    { callServer },
  )

  let setPayload: (v: Promise<ServerPayload>) => void

  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload)
    const [_isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
      setPayload = (v) => startTransition(() => setPayload_(v))
    }, [startTransition, setPayload_])

    React.useEffect(() => {
      return router.listen(async function onNavigation() {
        console.log('onNavigation')
        const url = new URL(window.location.href)
        url.pathname += '.rsc'
        url.searchParams.set('__rsc', '')
        const payload = ReactClient.createFromFetch<ServerPayload>(
          fetch(url),
          clientReferenceManifest,

          { callServer },
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

  ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
    formState: (await initialPayload).formState,
  })

  if (import.meta.hot) {
    import.meta.hot.on('react-server:update', (e) => {
      console.log('[react-server:update]', e.file)
      router.replace(router.location)
    })
  }
}

if (import.meta.env.DEV) {
  window.onerror = (event, source, lineno, colno, err) => {
    // must be within function call because that's when the element is defined for sure.
    const ErrorOverlay = customElements.get('vite-error-overlay')
    // don't open outside vite environment
    if (!ErrorOverlay) {
      return
    }
    const overlay = new ErrorOverlay(err)
    document.body.appendChild(overlay)
  }
}

main()
