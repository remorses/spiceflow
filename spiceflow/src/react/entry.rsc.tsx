// RSC environment entry point. Re-exports the user app entry and lets
// `app.handle()` own the Flight -> HTML bridge in react-server mode.
import { app } from 'virtual:app-entry'
export * from 'virtual:app-entry'
import * as entry from 'virtual:app-entry'

/**
 * Tracks the abort controllers for in-flight requests by URL so HMR can
 * cancel stale renders for the same URL before they resolve in a different request context.
 * This prevents the "hanging Promise was canceled" error on Cloudflare Workers
 * when rapid HMR events cause cross-request promise resolution.
 */
const abortControllersByUrl = new Map<string, AbortController>()

export async function handler(request: Request) {
  // Abort any previous in-flight request for the same URL
  const prevAbort = abortControllersByUrl.get(request.url)
  prevAbort?.abort()
  const abort = new AbortController()
  abortControllersByUrl.set(request.url, abort)
  // Attach our abort signal to the request so downstream code (handle-ssr.rsc.ts)
  // can detect when this render has been superseded by a newer HMR update.
  const signaled = new Request(request, { signal: abort.signal })
  try {
    return await app.handle(signaled)
  } finally {
    // Clean up after handling the request
    abortControllersByUrl.delete(request.url)
  }
}

export default entry.default ?? { fetch: handler }

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Abort all in-flight requests on HMR update
    for (const abort of abortControllersByUrl.values()) {
      abort.abort()
    }
    abortControllersByUrl.clear()
  })
}
