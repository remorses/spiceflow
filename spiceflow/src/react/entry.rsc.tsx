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
  // Combine the original request signal (fires on client disconnect/abort) with
  // our HMR signal (fires when a newer render supersedes this one). This way
  // server actions can detect both client abort and HMR invalidation.
  const combinedSignal = AbortSignal.any([request.signal, abort.signal])
  const signaled = new Request(request, { signal: combinedSignal })
  try {
    return await app.handle(signaled)
  } finally {
    // Only clean up if this request's controller is still the active one.
    // A newer concurrent request for the same URL may have overwritten it.
    if (abortControllersByUrl.get(request.url) === abort) {
      abortControllersByUrl.delete(request.url)
    }
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
