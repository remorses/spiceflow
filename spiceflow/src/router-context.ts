import { AsyncLocalStorage } from 'node:async_hooks'
import type { Location } from 'history'
import { stripRscUrl } from './react/deployment.js'

export type RouterLocation = Location

export type RouterContextData = {
  location: RouterLocation
  loaderData: Record<string, unknown>
  serverTimingStack?: unknown[]
}

export const routerContextStorage = new AsyncLocalStorage<RouterContextData>()

export function getRouterContext(): RouterContextData | undefined {
  return routerContextStorage.getStore()
}

export function createRouterContextData(request: Request): RouterContextData {
  const url = stripRscUrl(new URL(request.url))
  return {
    location: {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      key: url.href,
      state: null,
    },
    loaderData: {},
  }
}
