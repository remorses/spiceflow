import React, { Suspense } from 'react'
import { router } from './router.js'
import ReactDomClient from 'react-dom/client'
import ReactClient from 'spiceflow/dist/react/server-dom-client-optimized'

import type { CallServerFn } from './types/index.js'
import { clientReferenceManifest } from './utils/client-reference.js'
import { rscStream } from 'rsc-html-stream/client'
import {
  DefaultGlobalErrorPage,
  ErrorBoundary,
  FlightDataContext,
} from './components.js'
import { ServerPayload } from '../spiceflow.js'

async function main() {
  const callServer: CallServerFn = async (id, args) => {
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', id)
    const payload = await ReactClient.createFromFetch<ServerPayload>(
      fetch(url, {
        method: 'POST',
        body: await ReactClient.encodeReply(args),
      }),
      clientReferenceManifest,
      { callServer },
    )
    // console.log({ 'action payload': payload })
    setPayload(payload)
    return payload.returnValue
  }
  Object.assign(globalThis, { __callServer: callServer })

  const initialPayload =
    await ReactClient.createFromReadableStream<ServerPayload>(
      rscStream,
      clientReferenceManifest,

      { callServer },
    )

  let setPayload: (v: ServerPayload) => void

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
        url.searchParams.set('__rsc', '')
        const payload = await ReactClient.createFromFetch<ServerPayload>(
          fetch(url),
          clientReferenceManifest,

          { callServer },
        )
        setPayload(payload)
      })
    }, [])

    return (
      <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>
        <FlightDataContext.Provider value={payload.root}>
          {payload.root?.layouts?.[0]?.element ?? payload.root.page}
        </FlightDataContext.Provider>
      </ErrorBoundary>
    )
  }

  ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
    formState: initialPayload.formState,
  })

  if (import.meta.hot) {
    import.meta.hot.on('react-server:update', (e) => {
      console.log('[react-server:update]', e.file)
      router.replace(router.location)
    })
  }
}

main()
