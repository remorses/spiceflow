import { stripRscUrl } from './react/deployment.js'
import type { RouterContextData } from './router-context.js'

export const routerContextStorage = {
  getStore(): RouterContextData | undefined {
    return undefined
  },
  run<T>(_store: RouterContextData, callback: () => T): T {
    return callback()
  },
}

export function getRouterContext(): RouterContextData | undefined {
  return undefined
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
