// RSC environment entry point. Runs under react-server conditions.
// Imports the user's app via virtual:app-entry and exposes a fetch handler.
// Re-exports the user's default export (e.g. Cloudflare Worker { fetch } entry).
import { app } from 'virtual:app-entry'
export * from 'virtual:app-entry'
import * as entry from 'virtual:app-entry'

export async function handler(request: Request) {
  const response = await app.handle(request)
  return response
}

export default entry.default

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept()
}
