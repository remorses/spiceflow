import React, { Suspense } from 'react'
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
    setPayload(payload)
    return payload.returnValue
  }
  Object.assign(globalThis, { __callServer: callServer })

  async function onNavigation() {
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', '')
    const payload = await ReactClient.createFromFetch<ServerPayload>(
      fetch(url),
      clientReferenceManifest,

      { callServer },
    )
    setPayload(payload)
  }

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
      return listenNavigation(onNavigation)
    }, [])

    return (
      <Suspense fallback={<div>Loading root...</div>}>
        <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>
          <FlightDataContext.Provider value={payload.root}>
            {payload.root?.layouts?.[0]?.element ?? payload.root.page}
          </FlightDataContext.Provider>
        </ErrorBoundary>
      </Suspense>
    )
  }

  ReactDomClient.hydrateRoot(document, <BrowserRoot />, {
    formState: initialPayload.formState,
  })

  if (import.meta.hot) {
    import.meta.hot.on('react-server:update', (e) => {
      console.log('[react-server:update]', e.file)
      window.history.replaceState({}, '', window.location.href)
    })
  }
}

function listenNavigation(onNavigation: () => void) {
  window.addEventListener('popstate', onNavigation)

  const oldPushState = window.history.pushState
  window.history.pushState = function (...args) {
    const res = oldPushState.apply(this, args)
    onNavigation()
    return res
  }

  const oldReplaceState = window.history.replaceState
  window.history.replaceState = function (...args) {
    const res = oldReplaceState.apply(this, args)
    onNavigation()
    return res
  }

  function onClick(e: MouseEvent) {
    let link = (e.target as Element).closest('a')
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 && // left clicks only
      !e.metaKey && // open in new tab (mac)
      !e.ctrlKey && // open in new tab (windows)
      !e.altKey && // download
      !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault()
      history.pushState(null, '', link.href)
    }
  }
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onNavigation)
    window.history.pushState = oldPushState
    window.history.replaceState = oldReplaceState
  }
}

main()
