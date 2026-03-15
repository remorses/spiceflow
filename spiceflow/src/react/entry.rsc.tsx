// RSC environment entry point. Re-exports the user app entry and lets
// `app.handle()` own the Flight -> HTML bridge in react-server mode.
import { app } from 'virtual:app-entry'
export * from 'virtual:app-entry'
import * as entry from 'virtual:app-entry'

export async function handler(request: Request) {
  return app.handle(request)
}

export default entry.default ?? { fetch: handler }

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept()
}
