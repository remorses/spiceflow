// Default server startup (non-RSC, plain API mode).
// Starts the server with app.handle() directly.

import type { AnySpiceflow } from '../spiceflow.js'

export async function startServer(
  app: AnySpiceflow,
  port: number,
  hostname: string,
) {
  return app._startServer((req: Request) => app.handle(req), port, hostname)
}
