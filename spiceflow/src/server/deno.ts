import { Spiceflow } from '../spiceflow.js'
import { Server, ServerOptions, defaultServerOptions } from './base.js'

// Deno-specific API types
declare global {
  namespace Deno {
    function serve(options: {
      port?: number
      hostname?: string
      handler: (request: Request) => Response | Promise<Response>
      onListen?: (params: { hostname: string; port: number }) => void
    }): {
      shutdown: () => Promise<void>
    }
  }
}

/**
 * Creates and starts a Deno HTTP server for a Spiceflow application
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
  const { port, hostname, onListen } = mergedOptions

  const server = Deno.serve({
    port,
    hostname,
    handler: async (request: Request) => {
      try {
        return await app.handle(request)
      } catch (error) {
        console.error('Error handling request:', error)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
    onListen: ({ hostname, port }) => {
      const address = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`
      onListen?.(address)
    }
  })

  return {
    server,
    async close() {
      await server.shutdown()
    }
  }
}
