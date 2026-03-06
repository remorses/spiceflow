// Spiceflow Vite plugin: integrates @vitejs/plugin-rsc for RSC support,
// provides SSR middleware, virtual modules, and prerender support.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import rsc from '@vitejs/plugin-rsc'
import {
  type Manifest,
  type Plugin,
  type PluginOption,
  type RunnableDevEnvironment,
  type ViteDevServer,
} from 'vite'
import { collectStyleUrls } from './react/css.js'
import { prerenderPlugin } from './react/prerender.js'

export function spiceflowPlugin({
  entry,
}: {
  entry: string
}): PluginOption {
  let server: ViteDevServer
  let browserManifest: Manifest
  let rscManifest: Manifest

  return [
    rsc({
      entries: {
        rsc: 'spiceflow/dist/react/entry.rsc',
        ssr: 'spiceflow/dist/react/entry.ssr',
        client: 'spiceflow/dist/react/entry.client',
      },
      serverHandler: false,
      rscCssTransform: false,
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
    },

    // Write dist/node.js production entry point after build
    {
      name: 'spiceflow:write-node-entry',
      enforce: 'post',
      apply: 'build',
      closeBundle: {
        sequential: true,
        async handler() {
          await fs.promises.mkdir(path.resolve('dist'), { recursive: true })
          await fs.promises.writeFile(
            path.resolve('dist/node.js'),
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
              const mod: any = await (
                server.environments.ssr as RunnableDevEnvironment
              ).runner.import('spiceflow/dist/react/entry.ssr')
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(previewServer) {
        const mod = await import(path.resolve('dist/ssr/index.js'))
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

    // virtual:app-styles — collects CSS URLs for SSR injection
    createVirtualPlugin('app-styles', async function () {
      if (this.environment.mode !== 'dev') {
        const rscCss = Object.values(rscManifest || {}).flatMap(
          (x) => x.css || [],
        )
        const clientCss = Object.values(browserManifest || {}).flatMap(
          (x) => x.css || [],
        )
        const allStyles = [...rscCss, ...clientCss]
          .filter(Boolean)
          .map((s) => (s && s.startsWith('/') ? s : '/' + s))
        return `export default ${JSON.stringify(allStyles)}`
      }
      const allStyles = await collectStyleUrls(server.environments['rsc'], {
        entries: [entry],
      })
      const code = `export default ${JSON.stringify(allStyles)}\n\n`
      return code + `if (import.meta.hot) { import.meta.hot.accept() }`
    }),

    // Capture Vite manifests during build for CSS collection
    {
      name: 'spiceflow:capture-manifests',
      writeBundle(_options, bundle) {
        const manifestAsset = bundle['.vite/manifest.json']
        if (!manifestAsset || manifestAsset.type !== 'asset') return
        assert(typeof manifestAsset.source === 'string')
        const manifest = JSON.parse(manifestAsset.source)
        if (this.environment.name === 'client') browserManifest = manifest
        if (this.environment.name === 'rsc') rscManifest = manifest
      },
    },
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
