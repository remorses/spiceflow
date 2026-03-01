// RSC environment entry point. Runs under react-server conditions.
// Imports the user's app via virtual:app-entry and exposes a fetch handler.
import app from 'virtual:app-entry'

export async function handler(request: Request) {
  const response = await app.handle(request)
  return response
}

export { app }
