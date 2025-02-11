
import { createBrowserHistory, createMemoryHistory } from 'history'

export const router =
  typeof window === 'undefined'
    ? createMemoryHistory()
    : createBrowserHistory({})
