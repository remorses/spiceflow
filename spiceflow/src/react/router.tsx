import { createBrowserHistory, createMemoryHistory } from 'history'

const history =
  typeof window === 'undefined'
    ? createMemoryHistory()
    : createBrowserHistory({})


export const router = {
  // createHref: history.createHref,
  location: history.location,
  push: history.push,
  replace: history.replace,
  go: history.go,
  back: history.back,
  forward: history.forward,
  listen: history.listen,
  block: history.block,
}
