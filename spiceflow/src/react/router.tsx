import { createBrowserHistory, createMemoryHistory, type Location } from 'history'
import { useMemo, useSyncExternalStore } from 'react'
import { getBasePath } from '../base-path.js'
import type { AnySpiceflow } from '../spiceflow.js'
import type {
  AllLoaderData,
  ExtractParamsFromPath,
  HrefArgs,
  IsAny,
  MergedLoaderData,
} from '../types.js'
import { getRouterContext } from '#router-context'
import { buildHref } from './loader-utils.js'

const isBrowser = typeof window !== 'undefined'

const basePath = getBasePath()

const history = !isBrowser ? createMemoryHistory() : createBrowserHistory({})

// Cached scroll position updated by a passive scroll listener to avoid
// forced reflows when reading window.scrollY after DOM mutations.
let cachedScrollY = 0

if (isBrowser) {
  window.addEventListener(
    'scroll',
    () => {
      cachedScrollY = window.scrollY
    },
    { passive: true },
  )
}

const MAX_NAVIGATION_EVENTS = 100
const DEFAULT_MAX_SCROLL_ENTRIES = 200

type LoaderDataState = {
  data: Record<string, unknown>
  initialized: boolean
  resolve: ((data: Record<string, unknown>) => void) | null
  ready: Promise<Record<string, unknown>>
}

function createLoaderDataState(): LoaderDataState {
  let resolve: ((data: Record<string, unknown>) => void) | null = null
  return {
    data: {},
    initialized: false,
    resolve,
    ready: new Promise<Record<string, unknown>>((nextResolve) => {
      resolve = nextResolve
    }),
  }
}

const loaderDataState = createLoaderDataState()

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

type LoaderDataReturn<LD extends object, Path extends string> = IsAny<LD> extends true
  ? any
  : string extends Path
    ? AllLoaderData<LD>
    : MergedLoaderData<LD, Path>

export type RouterPaths<App extends AnySpiceflow> = IsAny<
  App['_types']['RoutePaths']
> extends true
  ? string
  : App['_types']['RoutePaths']

type RouterQuerySchemas<App extends AnySpiceflow> = IsAny<
  App['_types']['RoutePaths']
> extends true
  ? Record<string, any>
  : App['_types']['RouteQuerySchemas']

export type LoaderDataForPath<
  App extends AnySpiceflow,
  Path extends string,
> = IsAny<App['_types']['RoutePaths']> extends true
  ? any
  : LoaderDataReturn<App['_types']['Metadata']['loaderData'], Path>

export type RouterPathArg<App extends AnySpiceflow> =
  RouterPaths<App> | (string & {})

export type RouterHrefArgs<
  App extends AnySpiceflow,
  Path extends RouterPaths<App>,
  Params extends ExtractParamsFromPath<Path>,
> = HrefArgs<RouterPaths<App>, RouterQuerySchemas<App>, Path, Params>

export function coerceLoaderData<
  App extends AnySpiceflow,
  Path extends string,
>(data: any): LoaderDataForPath<App, Path> {
  return data
}

export type RouterBase<App extends AnySpiceflow = AnySpiceflow> = {
  readonly location: Location
  readonly pathname: string
  readonly searchParams: ReadonlyURLSearchParams

  href<
    const Path extends RouterPaths<App>,
    const Params extends ExtractParamsFromPath<Path> = ExtractParamsFromPath<Path>,
  >(
    path: Path,
    ...rest: RouterHrefArgs<App, Path, Params>
  ): string

  push(...args: Parameters<typeof history.push>): void
  replace(...args: Parameters<typeof history.replace>): void
  go(...args: Parameters<typeof history.go>): void
  back(...args: Parameters<typeof history.back>): void
  forward(...args: Parameters<typeof history.forward>): void
  block(...args: Parameters<typeof history.block>): ReturnType<typeof history.block>
  refresh(): void
  subscribe(cb: Subscriber): () => void

  getLoaderData<const Path extends RouterPathArg<App> = string>(
    path?: Path,
  ): Promise<LoaderDataForPath<App, Path>>
}

type Subscriber = (event: NavigationEvent) => void

type RouterInternal = RouterBase & {
  __setLoaderData(data: Record<string, unknown> | undefined): void
}

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
    scrollY: cachedScrollY,
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
    const pendingRequest =
      action === 'POP'
        ? null
        : getLatestPendingNavigationRequest(navigationEvents)
    const previousLocation = getPreviousLocation(navigationEvents)
    const event = appendNavigationEvent<NavigationCommittedEvent>({
      type: 'navigation-committed',
      requestId: pendingRequest?.requestId ?? null,
      action,
      location: cloneLocation(location),
      previousLocation,
      previousScrollY:
        action === 'POP' ? cachedScrollY : (pendingRequest?.scrollY ?? 0),
      source: pendingRequest?.method === 'refresh' ? 'refresh' : 'navigate',
    })

    for (const cb of subscribers) {
      cb(event)
    }
  })
}

function getCurrentLocation(): Location {
  const serverContext = !isBrowser ? getRouterContext() : undefined
  if (serverContext) {
    return serverContext.location
  }
  return history.location
}

function getServerSnapshot(): Location {
  return cloneLocation(getCurrentLocation())
}

function hasBasePrefix(path: string, base: string): boolean {
  if (path === base) return true
  const next = path.charAt(base.length)
  return path.startsWith(base) && (next === '/' || next === '?' || next === '#')
}

function stripBase(pathname: string): string {
  if (!basePath) return pathname
  if (hasBasePrefix(pathname, basePath)) {
    return pathname.slice(basePath.length) || '/'
  }
  return pathname
}

function prependBase(to: string | Partial<{ pathname: string }>): typeof to {
  if (!basePath) return to
  if (typeof to === 'string') {
    if (to.startsWith('/') && !to.startsWith('//') && !hasBasePrefix(to, basePath))
      return basePath + to
    return to
  }
  if (
    to.pathname &&
    to.pathname.startsWith('/') &&
    !to.pathname.startsWith('//') &&
    !hasBasePrefix(to.pathname, basePath)
  ) {
    return { ...to, pathname: basePath + to.pathname }
  }
  return to
}

// history.pushState / replaceState don't trigger the browser's native
// hash-scroll behaviour. When the new URL contains a #hash, manually
// scroll to the target element after a frame so React can commit any
// pending state updates first (needed for cross-page hash links where
// the target element doesn't exist yet at push time).
function scrollToHashElement() {
  if (!isBrowser) return
  const hash = history.location.hash
  if (!hash) return
  requestAnimationFrame(() => {
    try {
      const id = decodeURIComponent(hash.slice(1))
      document.getElementById(id)?.scrollIntoView()
    } catch {
      // bad hash encoding — ignore
    }
  })
}

export const router: RouterInternal = {
  get location() {
    return getCurrentLocation()
  },
  get pathname() {
    return stripBase(getCurrentLocation().pathname)
  },
  get searchParams(): ReadonlyURLSearchParams {
    return new URLSearchParams(getCurrentLocation().search)
  },
  href(path: string, allParams?: Record<string, any>) {
    return buildHref(path, allParams)
  },
  push(...args: Parameters<typeof history.push>) {
    args[0] = prependBase(args[0]) as typeof args[0]
    requestNavigation('push')
    history.push(...args)
    scrollToHashElement()
  },
  replace(...args: Parameters<typeof history.replace>) {
    args[0] = prependBase(args[0]) as typeof args[0]
    requestNavigation('replace')
    history.replace(...args)
    scrollToHashElement()
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
  getLoaderData(_path?: string): Promise<Record<string, unknown>> {
    if (!isBrowser) {
      const serverContext = getRouterContext()
      return Promise.resolve(serverContext?.loaderData ?? loaderDataState.data)
    }
    if (loaderDataState.initialized) return Promise.resolve(loaderDataState.data)
    return loaderDataState.ready
  },
  /** @internal */
  __setLoaderData(data: Record<string, unknown> | undefined) {
    loaderDataState.data = data ?? {}
    if (!loaderDataState.initialized) {
      loaderDataState.initialized = true
      loaderDataState.resolve?.(loaderDataState.data)
      loaderDataState.resolve = null
    }
    const location = history.location
    const event: NavigationEvent = {
      id: ++nextEventId,
      action: 'LOADER_DATA',
      location,
      previousLocation: location,
      previousScrollY: cachedScrollY,
      source: 'navigate',
    }
    for (const cb of subscribers) {
      cb(event)
    }
  },
}

export function useRouterState<_App extends AnySpiceflow = AnySpiceflow>() {
  const location = useSyncExternalStore(
    (cb) => router.subscribe(cb),
    () => history.location,
    getServerSnapshot,
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

export function getRouter<App extends AnySpiceflow = AnySpiceflow>(): RouterBase<App> {
  return router as RouterBase<App>
}
