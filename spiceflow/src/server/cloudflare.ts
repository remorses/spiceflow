import { Spiceflow } from '../spiceflow.js'
import { Server, ServerOptions, defaultServerOptions } from './base.js'

/**
 * Creates a Cloudflare Workers compatible server for a Spiceflow application
 * 
 * Note: Since Cloudflare Workers is a serverless platform, this implementation
 * doesn't actually start a server but provides a compatible interface for 
 * integration with Workers.
 * 
 * @example
 * For Cloudflare Workers, you'd typically use this in your worker script:
 * 
 * ```ts
 * import { Spiceflow } from 'spiceflow'
 * import { serve } from 'spiceflow/server'
 * 
 * const app = new Spiceflow()
 * app.get('/', () => 'Hello World!')
 * 
 * // In your worker script
 * export default {
 *   async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
 *     return app.handle(request)
 *   }
 * }
 * ```
 */
export async function serve<T extends Spiceflow>(
  app: T,
  options: ServerOptions = {}
): Promise<Server> {
  const mergedOptions = { ...defaultServerOptions, ...options }
  
  // Cloudflare Workers doesn't have a traditional server model
  // This is a simplified implementation for compatibility
  console.warn('Note: Cloudflare Workers does not use traditional servers. ' +
               'Use the Workers fetch handler with app.handle() directly.')
  
  // Create a dummy server object for API compatibility
  const server = {
    // Dummy properties for compatibility
    listening: true,
    
    // Fetch handler that can be used in a Worker
    async fetch(request: Request): Promise<Response> {
      return app.handle(request)
    }
  }
  
  // Signal that we're ready (even though we don't start a real server)
  const address = 'https://workers.cloudflare.com'
  mergedOptions.onListen?.(address)

  return {
    server,
    async close() {
      server.listening = false
    }
  }
}
