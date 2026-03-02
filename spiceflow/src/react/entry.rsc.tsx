// RSC environment entry point. Runs under react-server conditions.
// Imports the user's app via virtual:app-entry and exposes a fetch handler.
import app from 'virtual:app-entry'

export async function handler(request: Request) {
  const response = await app.handle(request)
  return response
}

export { app }

// Self-accept HMR so server code changes trigger an efficient RSC stream
// re-render instead of a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept()
}
