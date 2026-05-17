// Vendored from remix-run/history v5.3.0 (MIT license).
// https://github.com/remix-run/history/blob/v5.3.0/packages/history/index.ts
// Stripped hash history, dev warnings, and __DEV__ freeze guards.
// Only browser and memory history are kept since spiceflow doesn't use hash routing.

export type Pathname = string
export type Search = string
export type Hash = string
export type Key = string

export interface Path {
  pathname: Pathname
  search: Search
  hash: Hash
}

export interface Location extends Path {
  state: unknown
  key: Key
}

export type To = string | Partial<Path>

export interface Update {
  action: Action
  location: Location
}

export interface Listener {
  (update: Update): void
}

export interface Transition extends Update {
  retry(): void
}

export interface Blocker {
  (tx: Transition): void
}

export type Action = 'POP' | 'PUSH' | 'REPLACE'

export interface History {
  readonly action: Action
  readonly location: Location
  createHref(to: To): string
  push(to: To, state?: any): void
  replace(to: To, state?: any): void
  go(delta: number): void
  back(): void
  forward(): void
  listen(listener: Listener): () => void
  block(blocker: Blocker): () => void
}

export interface BrowserHistory extends History {}

export interface MemoryHistory extends History {
  readonly index: number
}

type HistoryState = {
  usr: any
  key?: string
  idx: number
}

const PopStateEventType = 'popstate'
const BeforeUnloadEventType = 'beforeunload'

// ── helpers ──────────────────────────────────────────────────────────

type Events<F> = {
  length: number
  push: (fn: F) => () => void
  call: (arg: any) => void
}

function createEvents<F extends Function>(): Events<F> {
  let handlers: F[] = []
  return {
    get length() {
      return handlers.length
    },
    push(fn: F) {
      handlers.push(fn)
      return function () {
        handlers = handlers.filter((handler) => handler !== fn)
      }
    },
    call(arg) {
      handlers.forEach((fn) => fn && fn(arg))
    },
  }
}

function createKey() {
  return Math.random().toString(36).substr(2, 8)
}

export function createPath({
  pathname = '/',
  search = '',
  hash = '',
}: Partial<Path>) {
  if (search && search !== '?')
    pathname += search.charAt(0) === '?' ? search : '?' + search
  if (hash && hash !== '#')
    pathname += hash.charAt(0) === '#' ? hash : '#' + hash
  return pathname
}

export function parsePath(path: string): Partial<Path> {
  let parsedPath: Partial<Path> = {}
  if (path) {
    let hashIndex = path.indexOf('#')
    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex)
      path = path.substr(0, hashIndex)
    }
    let searchIndex = path.indexOf('?')
    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex)
      path = path.substr(0, searchIndex)
    }
    if (path) {
      parsedPath.pathname = path
    }
  }
  return parsedPath
}

function clamp(n: number, lowerBound: number, upperBound: number) {
  return Math.min(Math.max(n, lowerBound), upperBound)
}

function promptBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

// ── browser history ─────────────────────────────────────────────────

export type BrowserHistoryOptions = { window?: Window }

export function createBrowserHistory(
  options: BrowserHistoryOptions = {},
): BrowserHistory {
  let { window: win = document.defaultView! } = options
  let globalHistory = win.history

  function getIndexAndLocation(): [number, Location] {
    let { pathname, search, hash } = win.location
    let state = globalHistory.state || {}
    return [
      state.idx,
      {
        pathname,
        search,
        hash,
        state: state.usr || null,
        key: state.key || 'default',
      },
    ]
  }

  let blockedPopTx: Transition | null = null
  function handlePop() {
    if (blockedPopTx) {
      blockers.call(blockedPopTx)
      blockedPopTx = null
    } else {
      let nextAction: Action = 'POP'
      let [nextIndex, nextLocation] = getIndexAndLocation()

      if (blockers.length) {
        if (nextIndex != null) {
          let delta = index - nextIndex
          if (delta) {
            blockedPopTx = {
              action: nextAction,
              location: nextLocation,
              retry() {
                go(delta * -1)
              },
            }
            go(delta)
          }
        }
      } else {
        applyTx(nextAction)
      }
    }
  }

  win.addEventListener(PopStateEventType, handlePop)

  let action: Action = 'POP'
  let [index, location] = getIndexAndLocation()
  let listeners = createEvents<Listener>()
  let blockers = createEvents<Blocker>()

  if (index == null) {
    index = 0
    globalHistory.replaceState({ ...globalHistory.state, idx: index }, '')
  }

  function createHref(to: To) {
    return typeof to === 'string' ? to : createPath(to)
  }

  function getNextLocation(to: To, state: any = null): Location {
    return {
      pathname: location.pathname,
      hash: '',
      search: '',
      ...(typeof to === 'string' ? parsePath(to) : to),
      state,
      key: createKey(),
    }
  }

  function getHistoryStateAndUrl(
    nextLocation: Location,
    idx: number,
  ): [HistoryState, string] {
    return [
      {
        usr: nextLocation.state,
        key: nextLocation.key,
        idx,
      },
      createHref(nextLocation),
    ]
  }

  function allowTx(act: Action, loc: Location, retry: () => void) {
    return (
      !blockers.length || (blockers.call({ action: act, location: loc, retry }), false)
    )
  }

  function applyTx(nextAction: Action) {
    action = nextAction
    ;[index, location] = getIndexAndLocation()
    listeners.call({ action, location })
  }

  function push(to: To, state?: any) {
    let nextAction: Action = 'PUSH'
    let nextLocation = getNextLocation(to, state)
    function retry() {
      push(to, state)
    }
    if (allowTx(nextAction, nextLocation, retry)) {
      let [historyState, url] = getHistoryStateAndUrl(nextLocation, index + 1)
      try {
        globalHistory.pushState(historyState, '', url)
      } catch (_error) {
        win.location.assign(url)
      }
      applyTx(nextAction)
    }
  }

  function replace(to: To, state?: any) {
    let nextAction: Action = 'REPLACE'
    let nextLocation = getNextLocation(to, state)
    function retry() {
      replace(to, state)
    }
    if (allowTx(nextAction, nextLocation, retry)) {
      let [historyState, url] = getHistoryStateAndUrl(nextLocation, index)
      globalHistory.replaceState(historyState, '', url)
      applyTx(nextAction)
    }
  }

  function go(delta: number) {
    globalHistory.go(delta)
  }

  let history: BrowserHistory = {
    get action() {
      return action
    },
    get location() {
      return location
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1)
    },
    forward() {
      go(1)
    },
    listen(listener) {
      return listeners.push(listener)
    },
    block(blocker) {
      let unblock = blockers.push(blocker)
      if (blockers.length === 1) {
        win.addEventListener(BeforeUnloadEventType, promptBeforeUnload)
      }
      return function () {
        unblock()
        if (!blockers.length) {
          win.removeEventListener(BeforeUnloadEventType, promptBeforeUnload)
        }
      }
    },
  }

  return history
}

// ── memory history ──────────────────────────────────────────────────

export type InitialEntry = string | Partial<Location>

export type MemoryHistoryOptions = {
  initialEntries?: InitialEntry[]
  initialIndex?: number
}

export function createMemoryHistory(
  options: MemoryHistoryOptions = {},
): MemoryHistory {
  let { initialEntries = ['/'], initialIndex } = options
  let entries: Location[] = initialEntries.map((entry) => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: createKey(),
    ...(typeof entry === 'string' ? parsePath(entry) : entry),
  }))
  let index = clamp(
    initialIndex == null ? entries.length - 1 : initialIndex,
    0,
    entries.length - 1,
  )

  let action: Action = 'POP'
  let location = entries[index]
  let listeners = createEvents<Listener>()
  let blockers = createEvents<Blocker>()

  function createHref(to: To) {
    return typeof to === 'string' ? to : createPath(to)
  }

  function getNextLocation(to: To, state: any = null): Location {
    return {
      pathname: location.pathname,
      search: '',
      hash: '',
      ...(typeof to === 'string' ? parsePath(to) : to),
      state,
      key: createKey(),
    }
  }

  function allowTx(act: Action, loc: Location, retry: () => void) {
    return (
      !blockers.length || (blockers.call({ action: act, location: loc, retry }), false)
    )
  }

  function applyTx(nextAction: Action, nextLocation: Location) {
    action = nextAction
    location = nextLocation
    listeners.call({ action, location })
  }

  function push(to: To, state?: any) {
    let nextAction: Action = 'PUSH'
    let nextLocation = getNextLocation(to, state)
    function retry() {
      push(to, state)
    }
    if (allowTx(nextAction, nextLocation, retry)) {
      index += 1
      entries.splice(index, entries.length, nextLocation)
      applyTx(nextAction, nextLocation)
    }
  }

  function replace(to: To, state?: any) {
    let nextAction: Action = 'REPLACE'
    let nextLocation = getNextLocation(to, state)
    function retry() {
      replace(to, state)
    }
    if (allowTx(nextAction, nextLocation, retry)) {
      entries[index] = nextLocation
      applyTx(nextAction, nextLocation)
    }
  }

  function go(delta: number) {
    let nextIndex = clamp(index + delta, 0, entries.length - 1)
    let nextAction: Action = 'POP'
    let nextLocation = entries[nextIndex]
    function retry() {
      go(delta)
    }
    if (allowTx(nextAction, nextLocation, retry)) {
      index = nextIndex
      applyTx(nextAction, nextLocation)
    }
  }

  let history: MemoryHistory = {
    get index() {
      return index
    },
    get action() {
      return action
    },
    get location() {
      return location
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1)
    },
    forward() {
      go(1)
    },
    listen(listener) {
      return listeners.push(listener)
    },
    block(blocker) {
      return blockers.push(blocker)
    },
  }

  return history
}
