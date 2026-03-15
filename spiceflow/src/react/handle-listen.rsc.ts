// RSC-environment server startup. Starts the server with `app.handle()`, which
// owns the Flight -> HTML bridge via the react-server conditional SSR helper.

import type { AnySpiceflow } from '../spiceflow.js'

export async function startServer(
  app: AnySpiceflow,
  port: number,
  hostname: string,
) {
  // In Vite dev, Vite owns the server — noop
  if (import.meta.hot) return

  return app._startServer(app.handle.bind(app), port, hostname)
}
