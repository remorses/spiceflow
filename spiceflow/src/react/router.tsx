import { createBrowserHistory, createMemoryHistory } from 'history'

const history =
  typeof window === 'undefined'
    ? createMemoryHistory()
    : createBrowserHistory({})

type Subscriber = () => void

const subscribers = new Set<Subscriber>()

history.listen(() => {
  for (const cb of subscribers) cb()
})

export const router = {
  get location() {
    return history.location
  },
  get pathname() {
    return history.location.pathname
  },
  push: history.push,
  replace: history.replace,
  go: history.go,
  back: history.back,
  forward: history.forward,
  block: history.block,
  refresh() {
    history.replace(history.location)
  },
  subscribe(cb: Subscriber) {
    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  },
}
