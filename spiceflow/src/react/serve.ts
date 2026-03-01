// Alternative dev server helper for advanced use cases where you need
// full control over the HTTP server and Vite configuration.
//
// For most apps, just call app.listen(3000) — it automatically creates
// a Vite dev server when page routes are present and NODE_ENV !== 'production'.

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer, InlineConfig } from 'vite'
import type { AnySpiceflow } from '../spiceflow.ts'

export interface DevServerOptions {
  /** path to the module that default-exports a Spiceflow app (relative to cwd) */
  entry: string
  port?: number
  hostname?: string
  /** extra Vite config merged on top of defaults */
  vite?: InlineConfig
}

export async function createDevServer(options: DevServerOptions) {
  const { entry, port = 3000, hostname = 'localhost', vite: extraViteConfig } = options

  const { createServer, mergeConfig } = await import('vite')
  const { createServer: createHttpServer } = await import('node:http')

  const baseConfig: InlineConfig = {
    server: { middlewareMode: true },
    appType: 'custom',
  }

  const viteConfig = extraViteConfig ? mergeConfig(baseConfig, extraViteConfig) : baseConfig
  const vite = await createServer(viteConfig)

  const httpServer = createHttpServer((req, res) => {
    vite.middlewares.handle(req, res, async () => {
      try {
        const mod = await vite.ssrLoadModule(entry)
        const app: AnySpiceflow = mod.default || mod.app
        if (!app || typeof app.handle !== 'function') {
          throw new Error(
            `Entry "${entry}" must default-export (or named-export "app") a Spiceflow instance`,
          )
        }
        app._bootstrapModules = ['/@vite/client']
        await app.handleForNode(req, res)
      } catch (err: any) {
        vite.ssrFixStacktrace(err)
        console.error('[spiceflow:ssr]', err.stack || err)
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'text/plain' })
        }
        res.end(err.stack || 'Internal Server Error')
      }
    })
  })

  const { AddressInfo } = await import('node:net') as any
  httpServer.listen(port, hostname, () => {
    const addr = httpServer.address() as import('node:net').AddressInfo
    const host = addr.address === '0.0.0.0' ? 'localhost' : addr.address
    console.log(`Spiceflow dev server running at http://${host}:${addr.port}`)
  })

  return { httpServer, vite }
}
