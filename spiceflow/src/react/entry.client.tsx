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
import type { RouterLocation } from './router.js'
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
import {
  getNavigationUrl,
  isFlightResponse,
  isHashOnlyNavigation,
  scrollToHash,
  toRscUrl,
} from './navigation.js'
import {
  getScrollRestorationKey,
  getScrollRestorationOptions,
} from './scroll-restoration.js'

function restoreFocusAfterNavigation() {
  const focusTarget = document.querySelector<HTMLElement>(
    '[data-spiceflow-main],main,[role="main"]',
  )
  if (!focusTarget) return

  if (!focusTarget.hasAttribute('tabindex')) {
    focusTarget.setAttribute('tabindex', '-1')
  }

  focusTarget.focus({ preventScroll: true })
}

function readSavedScrollPositions({ storageKey }: { storageKey: string }) {
  try {
    const serialized = sessionStorage.getItem(storageKey)
    if (!serialized) return {}

    const parsed = JSON.parse(serialized)
    if (!parsed || typeof parsed !== 'object') return {}

    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

function persistScrollPositions({
  storageKey,
  positions,
}: {
  storageKey: string
  positions: Record<string, number>
}) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(positions))
  } catch {
    return
  }
}

function saveScrollPosition({
  location,
  positions,
}: {
  location: RouterLocation
  positions: Record<string, number>
}) {
  const options = getScrollRestorationOptions()
  const key = getScrollRestorationKey({ location, options })
  positions[key] = window.scrollY
}

function restoreScrollPosition({
  action,
  location,
  positions,
  preventScrollReset,
}: {
  action: 'POP' | 'PUSH' | 'REPLACE'
  location: RouterLocation
  positions: Record<string, number>
  preventScrollReset: boolean
}) {
  const options = getScrollRestorationOptions()
  const key = getScrollRestorationKey({ location, options })
  const savedY = positions[key]

  if (typeof savedY === 'number') {
    window.scrollTo({ left: 0, top: savedY, behavior: 'auto' })
    return 'saved'
  }

  if (scrollToHash({ hash: location.hash })) {
    return 'hash'
  }

  if (preventScrollReset) {
    return 'preserved'
  }

  if (action !== 'POP') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return 'top'
  }

  return 'preserved'
}

async function main() {
  let setPayload: (v: Promise<ServerPayload>) => void = () => undefined

  const callServer = async (id: string, args: unknown[]) => {
    const url = new URL(window.location.href)
    url.searchParams.set('__rsc', id)
    const payloadPromise = createFromFetch<ServerPayload>(
      fetch(url, {
        method: 'POST',
        body: await encodeReply(args),
      }),
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
    const previousLocationRef = React.useRef(router.location)
    const loadedStorageKeyRef = React.useRef<string | null>(null)
    const scrollPositionsRef = React.useRef<Record<string, number>>({})
    const navigationStateRef = React.useRef<{
      id: number
      controller?: AbortController
    }>({
      id: 0,
    })

    React.useEffect(() => {
      setPayload = (v) => startTransition(() => setPayload_(v))
    }, [startTransition, setPayload_])

    React.useEffect(() => {
      const ensureScrollPositionsLoaded = () => {
        const options = getScrollRestorationOptions()
        if (loadedStorageKeyRef.current === options.storageKey) {
          return
        }

        scrollPositionsRef.current = readSavedScrollPositions({
          storageKey: options.storageKey,
        })
        loadedStorageKeyRef.current = options.storageKey
      }

      ensureScrollPositionsLoaded()
      window.history.scrollRestoration = 'manual'

      const pageHideHandler = () => {
        saveScrollPosition({
          location: previousLocationRef.current,
          positions: scrollPositionsRef.current,
        })
        const options = getScrollRestorationOptions()
        persistScrollPositions({
          storageKey: options.storageKey,
          positions: scrollPositionsRef.current,
        })
        window.history.scrollRestoration = 'auto'
      }

      window.addEventListener('pagehide', pageHideHandler)

      return () => {
        window.removeEventListener('pagehide', pageHideHandler)
        window.history.scrollRestoration = 'auto'
      }
    }, [])

    React.useEffect(() => {
      const ensureScrollPositionsLoaded = () => {
        const options = getScrollRestorationOptions()
        if (loadedStorageKeyRef.current === options.storageKey) {
          return
        }

        scrollPositionsRef.current = readSavedScrollPositions({
          storageKey: options.storageKey,
        })
        loadedStorageKeyRef.current = options.storageKey
      }

      const applyNavigationEffects = ({
        action,
        location,
        preventScrollReset,
      }: {
        action: 'POP' | 'PUSH' | 'REPLACE'
        location: RouterLocation
        preventScrollReset: boolean
      }) => {
        const restored = restoreScrollPosition({
          action,
          location,
          positions: scrollPositionsRef.current,
          preventScrollReset,
        })

        if (restored === 'hash') {
          return
        }

        restoreFocusAfterNavigation()
      }

      const unlisten = router.listen(({ action, location, metadata }) => {
        ensureScrollPositionsLoaded()

        const previousLocation = previousLocationRef.current
        saveScrollPosition({
          location: previousLocation,
          positions: scrollPositionsRef.current,
        })
        previousLocationRef.current = location

        const previousUrl = getNavigationUrl({ location: previousLocation })
        const destinationUrl = getNavigationUrl({ location })

        if (
          isHashOnlyNavigation({
            currentUrl: previousUrl,
            nextUrl: destinationUrl,
          })
        ) {
          applyNavigationEffects({
            action,
            location,
            preventScrollReset: metadata.preventScrollReset,
          })
          return
        }

        navigationStateRef.current.id += 1
        const navigationId = navigationStateRef.current.id

        navigationStateRef.current.controller?.abort()
        const controller = new AbortController()
        navigationStateRef.current.controller = controller

        const rscUrl = toRscUrl({ url: destinationUrl })
        const rscResponse = fetch(rscUrl, {
          signal: controller.signal,
        }).then((response) => {
          if (isFlightResponse({ response })) return response

          window.location.assign(destinationUrl.href)
          throw new Error(
            `Expected text/x-component, got ${response.headers.get('content-type') ?? 'unknown'}`,
          )
        })

        const nextPayload = createFromFetch<ServerPayload>(rscResponse)
        setPayload(nextPayload)

        nextPayload
          .then(() => {
            if (controller.signal.aborted) return
            if (navigationStateRef.current.id !== navigationId) return

            applyNavigationEffects({
              action,
              location,
              preventScrollReset: metadata.preventScrollReset,
            })
          })
          .catch((error) => {
            if (controller.signal.aborted) return
            if (navigationStateRef.current.id !== navigationId) return
            console.error(
              '[entry.client.tsx:onNavigation] full-navigation fallback',
              error,
            )
            window.location.assign(destinationUrl.href)
          })
      })

      return () => {
        navigationStateRef.current.controller?.abort()
        unlisten()
      }
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
