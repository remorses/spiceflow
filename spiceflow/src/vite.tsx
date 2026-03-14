// Spiceflow Vite plugin: integrates @vitejs/plugin-rsc for RSC support,
// provides SSR middleware, virtual modules, and prerender support.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import url from 'node:url'

import rsc from '@vitejs/plugin-rsc'
import {
  type Plugin,
  type PluginOption,
  type RunnableDevEnvironment,
  type ViteDevServer,
} from 'vite'
import { prerenderPlugin } from './react/prerender.js'

const require = createRequire(import.meta.url)
const pluginRscRpcPath = require.resolve('@vitejs/plugin-rsc/utils/rpc')

// Module-level so the timestamp is stable even if spiceflowPlugin() is called more than once
const buildTimestamp = Date.now().toString(36)

export function spiceflowPlugin({
  entry,
}: {
  entry: string
}): PluginOption {
  let server: ViteDevServer
  let resolvedOutDir = 'dist'

  return [
    rsc({
      entries: {
        rsc: 'spiceflow/dist/react/entry.rsc',
        ssr: 'spiceflow/dist/react/entry.ssr',
        client: 'spiceflow/dist/react/entry.client',
      },
      serverHandler: false,
      loadModuleDevProxy: true,

      // Stable encryption key for server action closure args. Without this the key changes on
      // every build/restart, breaking action calls from stale client bundles after a deploy.
      defineEncryptionKey: 'process.env.RSC_ENCRYPTION_KEY',
      // Catch invalid cross-environment imports at build time (e.g. importing a server-only
      // module from a client component) instead of failing at runtime.
      validateImports: true,
    }),
    prerenderPlugin(),

    // Rewrite optimizeDeps entries so @vitejs/plugin-rsc vendor CJS files
    // resolve through the spiceflow framework package (where the plugin is installed)
    // rather than from the app root where the plugin isn't a direct dependency.
    {
      name: 'spiceflow:optimize-deps-rewrite',
      configEnvironment(_name, config) {
        if (!config.optimizeDeps?.include) return
        config.optimizeDeps.include = config.optimizeDeps.include.map(
          (entry) => {
            if (entry.startsWith('@vitejs/plugin-rsc')) {
              return `spiceflow > ${entry}`
            }
            return entry
          },
        )
      },
    },

    {
      name: 'spiceflow:plugin-rsc-rpc-alias',
      resolveId(source) {
        if (source === '@vitejs/plugin-rsc/utils/rpc') {
          return pluginRscRpcPath
        }
      },
    },

    // Add the Node launcher as an additional SSR build input
    {
      name: 'spiceflow:config',
      config: () => ({
        environments: {
          ssr: {
            build: {
              rollupOptions: {
                input: {
                  server: 'spiceflow/dist/react/launchers/node',
                },
              },
            },
          },
        },
      }),
      configResolved(config) {
        resolvedOutDir = config.build.outDir
      },
    },

    // Write dist/node.js production entry point after build
    {
      name: 'spiceflow:write-node-entry',
      enforce: 'post',
      apply: 'build',
      closeBundle: {
        sequential: true,
        async handler() {
          const outDir = path.resolve(resolvedOutDir)
          await fs.promises.mkdir(outDir, { recursive: true })
          await fs.promises.writeFile(
            path.join(outDir, 'node.js'),
            `import('./ssr/node.js')`,
          )
        },
      },
    },

    // SSR middleware for dev and preview servers
    {
      name: 'spiceflow:ssr-middleware',
      configureServer(_server) {
        server = _server
        return () => {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.includes('__inspect')) return next()
            try {
              const resolvedEntry = await server.environments.ssr.pluginContainer.resolveId(
                'spiceflow/dist/react/entry.ssr',
              )
              if (!resolvedEntry) {
                throw new Error('Failed to resolve spiceflow SSR entry')
              }
              const mod: any = await (
                server.environments.ssr as RunnableDevEnvironment
              ).runner.import(resolvedEntry.id)
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(previewServer) {
        const mod = await import(path.resolve(resolvedOutDir, 'ssr/index.js'))
        return () => {
          previewServer.middlewares.use(async (req, res, next) => {
            try {
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
    },

    // virtual:spiceflow-deployment-id — build timestamp inlined as a constant.
    // No runtime fs access needed, works on Node, Cloudflare, edge runtimes, etc.
    createVirtualPlugin('spiceflow-deployment-id', () => {
      return `export default ${JSON.stringify(buildTimestamp)}`
    }),
    // virtual:bundler-adapter/* — resolves to Vite-specific adapter implementations
    // so entry points can import from these instead of directly from @vitejs/plugin-rsc
    createVirtualPlugin('bundler-adapter/server', () => {
      return `export * from 'spiceflow/dist/react/adapters/vite-server'`
    }),
    createVirtualPlugin('bundler-adapter/ssr', () => {
      return `export * from 'spiceflow/dist/react/adapters/vite-ssr'`
    }),
    createVirtualPlugin('bundler-adapter/client', () => {
      return `export * from 'spiceflow/dist/react/adapters/vite-client'`
    }),

    // virtual:app-entry — resolves to user's app entry module
    createVirtualPlugin('app-entry', () => {
      return `export {default} from '${url.pathToFileURL(path.resolve(entry))}'`
    }),


  ]
}

function createVirtualPlugin(name: string, load: Plugin['load']): Plugin {
  const virtualName = 'virtual:' + name
  return {
    name: `spiceflow:virtual-${name}`,
    resolveId(source) {
      return source === virtualName ? '\0' + virtualName : undefined
    },
    load(id, options) {
      if (id === '\0' + virtualName) {
        return (load as Function).apply(this, [id, options])
      }
    },
  }
}
