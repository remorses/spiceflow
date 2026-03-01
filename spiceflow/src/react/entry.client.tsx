// Browser entry point. Hydrates the React tree from the RSC payload
// embedded in the HTML, sets up client-side navigation and server action calls.
import React from 'react'
import ReactDomClient from 'react-dom/client'
import {
  createFromReadableStream,
  createFromFetch,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'
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
import { getErrorContext } from './errors.js'

async function main() {
  const callServer = async (id: string, args: unknown[]) => {
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', id)
    const payloadPromise = createFromFetch<ServerPayload>(
      fetch(url, {
        method: 'POST',
        body: await encodeReply(args),
      }),
    )

    let payload = await payloadPromise

    if (payload.actionError) {
      console.log(getErrorContext(payload.actionError))
      throw payload.actionError
    }
    setPayload(payloadPromise)
    return payload.returnValue
  }
  setServerCallback(callServer)

  const initialPayload = createFromReadableStream<ServerPayload>(rscStream)

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
        const payload = createFromFetch<ServerPayload>(fetch(url))
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
    import.meta.hot.on('rsc:update', (e) => {
      console.log('[rsc:update]', e.file)
      router.replace(router.location)
    })
  }
}

if (import.meta.env.DEV) {
  window.onerror = (event, source, lineno, colno, err) => {
    const ErrorOverlay = customElements.get('vite-error-overlay')
    if (!ErrorOverlay) return
    const overlay = new ErrorOverlay(err)
    document.body.appendChild(overlay)
  }
}

main()
