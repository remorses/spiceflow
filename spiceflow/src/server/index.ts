import { Spiceflow } from '../spiceflow.js'
import { Server, ServerOptions } from './base.js'

/**
 * Creates and starts a server for a Spiceflow application
 * 
 * This function will use the appropriate implementation based on the current runtime
 * (Node.js, Deno, Bun, or Cloudflare Workers).
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
  options?: ServerOptions
): Promise<Server> {
  // This is a placeholder that will be replaced by the appropriate runtime implementation
  // via package.json conditional exports
  throw new Error('Server implementation not available for this runtime')
}

// Re-export types
export * from './base.js'
