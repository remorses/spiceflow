import { createBrowserHistory, createMemoryHistory, Location } from 'history'

const history =
  typeof window === 'undefined'
    ? createMemoryHistory()
    : createBrowserHistory({})

export type NavigationEvent = {
  action: 'POP' | 'PUSH' | 'REPLACE'
  location: Location
  previousLocation: Location
  previousScrollY: number
  source: 'navigate' | 'refresh'
}

type Subscriber = (event: NavigationEvent) => void

const subscribers = new Set<Subscriber>()

// Monotonic token for refresh detection. Avoids leaking a stale key-based flag
// if history.replace is blocked or doesn't emit a listen callback.
let refreshToken = 0
let pendingRefreshToken: number | null = null
let previousLocation: Location = { ...history.location }
// Captured before push/replace so the value reflects the page being left,
// not the post-pushState value (which browsers can reset to 0).
let capturedScrollY = 0

history.listen(({ action, location }) => {
  // For POP (back/forward), scrollY wasn't captured by push/replace wrappers,
  // so read it now (browser hasn't scrolled yet for manual scroll restoration).
  const scrollY = action === 'POP'
    ? (typeof window !== 'undefined' ? window.scrollY : 0)
    : capturedScrollY
  const isRefresh = pendingRefreshToken !== null && action === 'REPLACE'
  pendingRefreshToken = null
  const event: NavigationEvent = {
    action: action as NavigationEvent['action'],
    location,
    previousLocation,
    previousScrollY: scrollY,
    source: isRefresh ? 'refresh' : 'navigate',
  }
  previousLocation = { ...location }
  for (const cb of subscribers) cb(event)
})

export const router = {
  get location() {
    return history.location
  },
  get pathname() {
    return history.location.pathname
  },
  push(...args: Parameters<typeof history.push>) {
    capturedScrollY = typeof window !== 'undefined' ? window.scrollY : 0
    history.push(...args)
  },
  replace(...args: Parameters<typeof history.replace>) {
    capturedScrollY = typeof window !== 'undefined' ? window.scrollY : 0
    history.replace(...args)
  },
  go: history.go,
  back: history.back,
  forward: history.forward,
  block: history.block,
  refresh() {
    pendingRefreshToken = ++refreshToken
    capturedScrollY = typeof window !== 'undefined' ? window.scrollY : 0
    history.replace(history.location)
  },
  subscribe(cb: Subscriber) {
    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  },
}
