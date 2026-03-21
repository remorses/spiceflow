import { createBrowserHistory, createMemoryHistory, Location } from 'history'
import { useMemo, useSyncExternalStore } from 'react'

const isBrowser = typeof window !== 'undefined'

const history =
  !isBrowser
    ? createMemoryHistory()
    : createBrowserHistory({})

const MAX_NAVIGATION_EVENTS = 100
const DEFAULT_MAX_SCROLL_ENTRIES = 200

type NavigationMethod = 'push' | 'replace' | 'refresh'

type NavigationRequestedEvent = {
  id: number
  type: 'navigation-requested'
  requestId: number
  method: NavigationMethod
  location: Location
  scrollY: number
}

type NavigationCommittedEvent = {
  id: number
  type: 'navigation-committed'
  requestId: number | null
  action: 'POP' | 'PUSH' | 'REPLACE'
  location: Location
  previousLocation: Location
  previousScrollY: number
  source: 'navigate' | 'refresh'
}

export type RouterEvent = NavigationRequestedEvent | NavigationCommittedEvent

export type NavigationEvent = {
  id: number
  action: 'POP' | 'PUSH' | 'REPLACE' | 'LOADER_DATA'
  location: Location
  previousLocation: Location
  previousScrollY: number
  source: 'navigate' | 'refresh'
}

export type ReadonlyURLSearchParams = Omit<
  URLSearchParams,
  'append' | 'delete' | 'set' | 'sort'
>

type Subscriber = (event: NavigationEvent) => void

const subscribers = new Set<Subscriber>()
const navigationEvents: RouterEvent[] = []
const scrollPositions = new Map<string, number>()
let nextEventId = 0
let nextRequestId = 0

function cloneLocation(location: Location): Location {
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    key: location.key,
  }
}

function appendNavigationEvent<TEvent extends RouterEvent>(
  event: Omit<TEvent, 'id'>,
): TEvent {
  const nextEvent = {
    ...event,
    id: ++nextEventId,
  } as TEvent
  navigationEvents.push(nextEvent)
  if (navigationEvents.length > MAX_NAVIGATION_EVENTS) {
    navigationEvents.shift()
  }
  return nextEvent
}

export function getLastCommittedNavigationEvent(
  routerEvents: readonly RouterEvent[],
): NavigationCommittedEvent | null {
  for (let index = routerEvents.length - 1; index >= 0; index -= 1) {
    const event = routerEvents[index]
    if (event?.type === 'navigation-committed') {
      return event
    }
  }
  return null
}

export function getLatestPendingNavigationRequest(
  routerEvents: readonly RouterEvent[],
): NavigationRequestedEvent | null {
  const committedRequestIds = new Set<number>()
  for (let index = routerEvents.length - 1; index >= 0; index -= 1) {
    const event = routerEvents[index]
    if (!event) {
      continue
    }
    if (event.type === 'navigation-committed') {
      if (event.requestId != null) {
        committedRequestIds.add(event.requestId)
      }
      continue
    }
    if (!committedRequestIds.has(event.requestId)) {
      return event
    }
  }
  return null
}

function getPreviousLocation(routerEvents: readonly RouterEvent[]): Location {
  const committedEvent = getLastCommittedNavigationEvent(routerEvents)
  if (committedEvent) {
    return cloneLocation(committedEvent.location)
  }

  const pendingRequest = getLatestPendingNavigationRequest(routerEvents)
  if (pendingRequest) {
    return cloneLocation(pendingRequest.location)
  }

  return cloneLocation(history.location)
}

function requestNavigation(method: NavigationMethod) {
  if (!isBrowser) {
    return null
  }

  return appendNavigationEvent<NavigationRequestedEvent>({
    type: 'navigation-requested',
    requestId: ++nextRequestId,
    method,
    location: cloneLocation(history.location),
    scrollY: window.scrollY,
  })
}

function trimScrollPositions(maxEntries: number) {
  while (scrollPositions.size > maxEntries) {
    const oldestKey = scrollPositions.keys().next().value
    if (oldestKey == null) {
      return
    }
    scrollPositions.delete(oldestKey)
  }
}

export function recordScrollPosition(args: {
  locationKey: string
  scrollY: number
}) {
  scrollPositions.delete(args.locationKey)
  scrollPositions.set(args.locationKey, args.scrollY)
  trimScrollPositions(DEFAULT_MAX_SCROLL_ENTRIES)
}

export function loadScrollPositions(args: {
  positions: Record<string, number>
  maxEntries?: number
}) {
  scrollPositions.clear()
  for (const [locationKey, scrollY] of Object.entries(args.positions)) {
    scrollPositions.set(locationKey, scrollY)
  }
  trimScrollPositions(args.maxEntries ?? DEFAULT_MAX_SCROLL_ENTRIES)
}

export function getScrollPositions({
  maxEntries = DEFAULT_MAX_SCROLL_ENTRIES,
}: { maxEntries?: number } = {}) {
  trimScrollPositions(maxEntries)
  return Object.fromEntries(scrollPositions)
}

export function getLastNavigationEvent(): NavigationEvent | null {
  return getLastCommittedNavigationEvent(navigationEvents)
}

if (isBrowser) {
  history.listen(({ action, location }) => {
    const pendingRequest = action === 'POP'
      ? null
      : getLatestPendingNavigationRequest(navigationEvents)
    const previousLocation = getPreviousLocation(navigationEvents)
    const event = appendNavigationEvent<NavigationCommittedEvent>({
      type: 'navigation-committed',
      requestId: pendingRequest?.requestId ?? null,
      action,
      location: cloneLocation(location),
      previousLocation,
      previousScrollY: action === 'POP' ? window.scrollY : pendingRequest?.scrollY ?? 0,
      source: pendingRequest?.method === 'refresh' ? 'refresh' : 'navigate',
    })

    for (const cb of subscribers) {
      cb(event)
    }
  })
}


// Loader data store — seeded from the RSC flight payload on initial load
// (via __setLoaderData called from entry.client.tsx before hydrateRoot),
// updated on navigation when new payloads resolve.
let loaderData: Record<string, unknown> = {}
let loaderDataInitialized = false
let loaderDataResolve: ((data: Record<string, unknown>) => void) | null = null
const loaderDataReady = new Promise<Record<string, unknown>>((resolve) => {
  loaderDataResolve = resolve
})

export const router = {
  get location() {
    return history.location
  },
  get pathname() {
    return history.location.pathname
  },
  get searchParams(): ReadonlyURLSearchParams {
    return new URLSearchParams(history.location.search)
  },
  push(...args: Parameters<typeof history.push>) {
    requestNavigation('push')
    history.push(...args)
  },
  replace(...args: Parameters<typeof history.replace>) {
    requestNavigation('replace')
    history.replace(...args)
  },
  go: history.go,
  back: history.back,
  forward: history.forward,
  block: history.block,
  refresh() {
    requestNavigation('refresh')
    history.replace(history.location)
  },
  subscribe(cb: Subscriber) {
    if (!isBrowser) {
      return () => undefined
    }

    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  },
  getLoaderData(): Promise<Record<string, unknown>> {
    if (!isBrowser) return Promise.resolve(loaderData)
    if (loaderDataInitialized) return Promise.resolve(loaderData)
    return loaderDataReady
  },
  /** @internal */
  __setLoaderData(data: Record<string, unknown> | undefined) {
    loaderData = data ?? {}
    if (!loaderDataInitialized) {
      loaderDataInitialized = true
      loaderDataResolve?.(loaderData)
      loaderDataResolve = null
    }
    const location = history.location
    const event: NavigationEvent = {
      id: ++nextEventId,
      action: 'LOADER_DATA',
      location,
      previousLocation: location,
      previousScrollY: isBrowser ? window.scrollY : 0,
      source: 'navigate',
    }
    for (const cb of subscribers) {
      cb(event)
    }
  },
}

export function useRouterState() {
  const location = useSyncExternalStore(
    (cb) => router.subscribe(cb),
    () => history.location,
    () => history.location,
  )
  return useMemo(
    () => ({
      ...location,
      searchParams: new URLSearchParams(
        location.search,
      ) as ReadonlyURLSearchParams,
    }),
    [location],
  )
}
