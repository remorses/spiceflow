import { createServer } from 'http'
import { Spiceflow } from '../spiceflow.js'
import { Server, ServerOptions, defaultServerOptions } from './base.js'

/**
 * Creates and starts a Node.js HTTP server for a Spiceflow application
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
  
  const server = createServer((req, res) => {
    return app.handleNode(req, res)
  })

  await new Promise<void>((resolve) => {
    server.listen(port, hostname, () => {
      const address = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`
      onListen?.(address)
      resolve()
    })
  })

  return {
    server,
    async close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }
}
