// Catch-all route handler that forwards requests to the Spiceflow docs app.
// The Spiceflow app is built with base: '/docs' so it expects requests at /docs/*.
// No URL rewriting needed; Next.js routes /docs/* here and the full URL is forwarded.
// Static assets are served by spiceflow's auto-injected serveStatic middleware.
import { app } from '../../../../../example-basepath/dist/rsc/index.js'

async function handler(request: Request) {
  return app.handle(request)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const HEAD = handler
export const OPTIONS = handler
