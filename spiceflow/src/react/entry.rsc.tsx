// RSC environment entry point. Re-exports the user app entry and lets
// `app.handle()` own the Flight -> HTML bridge in react-server mode.
import { app } from 'virtual:app-entry'
export * from 'virtual:app-entry'
import * as entry from 'virtual:app-entry'

// Tracks the abort controller for the current in-flight request so HMR can
// cancel stale renders before they resolve in a different request context.
// This prevents the "hanging Promise was canceled" error on Cloudflare Workers
// when rapid HMR events cause cross-request promise resolution.
let currentAbort: AbortController | undefined

export async function handler(request: Request) {
  currentAbort?.abort()
  const abort = new AbortController()
  currentAbort = abort
  // Attach our abort signal to the request so downstream code (handle-ssr.rsc.ts)
  // can detect when this render has been superseded by a newer HMR update.
  const signaled = new Request(request, { signal: abort.signal })
  return app.handle(signaled)
}

export default entry.default ?? { fetch: handler }

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    currentAbort?.abort()
    currentAbort = undefined
  })
}
