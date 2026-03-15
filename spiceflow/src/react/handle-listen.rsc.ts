// RSC-environment server startup. Loads the SSR fetchHandler via Vite RSC API
// and starts a production server with it.
// Resolved via package.json "react-server" condition — only runs in RSC env.

import type { AnySpiceflow } from '../spiceflow.js'

export async function startServer(
  app: AnySpiceflow,
  port: number,
  hostname: string,
) {
  // In Vite dev, Vite owns the server — noop
  if (import.meta.hot) return

  const { fetchHandler } = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.js')
  >('ssr', 'index')
  return app._startServer(fetchHandler, port, hostname)
}
