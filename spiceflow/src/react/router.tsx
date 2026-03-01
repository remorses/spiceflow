import { createBrowserHistory, createMemoryHistory } from 'history'
import type { Action, Location, To, Update } from 'history'

const history =
  typeof window === 'undefined'
    ? createMemoryHistory()
    : createBrowserHistory({})

export type RouterLocation = Location

export interface NavigationOptions {
  state?: unknown
  replace?: boolean
  preventScrollReset?: boolean
}

export interface NavigationMetadata {
  preventScrollReset: boolean
}

export interface RouterNavigation extends Update {
  metadata: NavigationMetadata
}

let pendingNavigationMetadata: NavigationMetadata | null = null

function setPendingNavigationMetadata({
  preventScrollReset,
}: {
  preventScrollReset?: boolean
}) {
  pendingNavigationMetadata = {
    preventScrollReset: preventScrollReset === true,
  }
}

function consumeNavigationMetadata({ action }: { action: Action }) {
  if (action === 'POP') {
    return {
      preventScrollReset: false,
    }
  }

  const metadata = pendingNavigationMetadata || {
    preventScrollReset: false,
  }
  pendingNavigationMetadata = null
  return metadata
}

function push(to: To, options?: NavigationOptions) {
  setPendingNavigationMetadata({
    preventScrollReset: options?.preventScrollReset,
  })
  history.push(to, options?.state)
}

function replace(to: To, options?: NavigationOptions) {
  setPendingNavigationMetadata({
    preventScrollReset: options?.preventScrollReset,
  })
  history.replace(to, options?.state)
}

function navigate({ to, ...options }: { to: To } & NavigationOptions) {
  if (options.replace) {
    replace(to, options)
    return
  }

  push(to, options)
}

const listeners = new Set<(x: RouterNavigation) => void>()

history.listen((update) => {
  const event = {
    ...update,
    metadata: consumeNavigationMetadata({ action: update.action }),
  }

  console.log('[router.listen]', update.action, event.metadata)

  for (const listener of listeners) {
    listener(event)
  }
})

export const router = {
  // createHref: history.createHref,
  get location() {
    return history.location
  },
  push,
  replace,
  navigate,
  go: history.go,
  back: history.back,
  forward: history.forward,
  listen(listener: (x: RouterNavigation) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  block: history.block,
}
