// RSC environment entry point. Re-exports the user app entry and lets
// `app.handle()` own the Flight -> HTML bridge in react-server mode.
import { app } from 'virtual:app-entry'
export * from 'virtual:app-entry'
import * as entry from 'virtual:app-entry'

// Tracks all in-flight abort controllers so HMR can cancel stale renders.
// Uses a Set (not a per-URL Map) so concurrent requests to the same URL
// don't abort each other — only HMR module invalidation aborts in-flight renders.
const inFlightAborts = new Set<AbortController>()

export async function handler(request: Request) {
  const abort = new AbortController()
  inFlightAborts.add(abort)
  // Combine the original request signal (fires on client disconnect/abort) with
  // our HMR signal (fires when module invalidation cancels this render).
  const combinedSignal = AbortSignal.any([request.signal, abort.signal])
  const signaled = new Request(request, { signal: combinedSignal })
  try {
    return await app.handle(signaled)
  } finally {
    inFlightAborts.delete(abort)
  }
}

export default entry.default ?? { fetch: handler }

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    for (const abort of inFlightAborts) {
      abort.abort()
    }
    inFlightAborts.clear()
  })
}
