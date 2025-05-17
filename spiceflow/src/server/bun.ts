import { Spiceflow } from '../spiceflow.js'
import { Server, ServerOptions, defaultServerOptions } from './base.js'

declare global {
  var Bun: {
    serve: (options: any) => any
  }
}

/**
 * Creates and starts a Bun HTTP server for a Spiceflow application
 * 
 * @example
 * ```ts
 * import { Spiceflow } from 'spiceflow'
 * import { serve } from 'spiceflow/server'
 * 
 * const app = new Spiceflow()
 * app.get('/', () => 'Hello World!')
 * 
 * const server = await serve(app, { port: 3000 })
 * ```
 */
export async function serve<T extends Spiceflow>(
  app: T,
  options: ServerOptions = {}
): Promise<Server> {
  const mergedOptions = { ...defaultServerOptions, ...options }
  const { port, hostname, development, onListen } = mergedOptions

  const server = Bun.serve({
    port,
    hostname,
    development,
    fetch: async (request: Request) => {
      return await app.handle(request)
    },
    error(error: Error) {
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })

  const address = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`
  onListen?.(address)

  return {
    server,
    async close() {
      server.stop()
    }
  }
}
