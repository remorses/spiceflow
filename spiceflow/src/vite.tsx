// Spiceflow Vite plugin: integrates @vitejs/plugin-rsc for RSC support,
// adds auto "use client" injection for client-by-default behavior,
// provides SSR middleware, virtual modules, and prerender support.
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'
import {
  type Manifest,
  type Plugin,
  type PluginOption,
  type RunnableDevEnvironment,
  type ViteDevServer,
} from 'vite'
import { collectStyleUrls } from './react/css.js'
import { prerenderPlugin } from './react/prerender.js'

const EXTENSIONS_TO_INJECT = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.mts',
  '.cjs',
  '.cts',
])

const DIRECTIVE_RE = /^['"]use (client|server)['"]/m

export function spiceflowPlugin({
  entry,
}: {
  entry: string
}): PluginOption {
  let server: ViteDevServer
  let browserManifest: Manifest
  let rscManifest: Manifest
  const resolvedEntry = path.resolve(entry)

  return [
    rsc({
      entries: {
        rsc: 'spiceflow/dist/react/entry.rsc',
        ssr: 'spiceflow/dist/react/entry.ssr',
        client: 'spiceflow/dist/react/entry.client',
      },
      serverHandler: false,
      rscCssTransform: false,
    }),
    react(),
    prerenderPlugin(),

    // Auto "use client" injection: makes all user source files client components by default.
    // Only framework internals, the app entry, node_modules, and *.server.* files are excluded.
    {
      name: 'spiceflow:auto-use-client',
      enforce: 'pre',
      transform(code, id) {
        if (DIRECTIVE_RE.test(code)) return
        const cleanId = id.split('?')[0]
        const ext = path.extname(cleanId)
        if (!EXTENSIONS_TO_INJECT.has(ext)) return
        if (id.includes('node_modules')) return
        if (id.includes('/spiceflow/')) return
        if (cleanId === resolvedEntry) return
        if (path.basename(cleanId).includes('.server.')) return
        return { code: `"use client";\n${code}`, map: null }
      },
    },

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

export function debugTransformResult({ transformedCode, envName, id }) {
  if (!process.env.DEBUG_SPICEFLOW) return
  const relativePath = path.relative(process.cwd(), id.replace(/\0/g, ''))
  const safePath = relativePath
    .split(path.sep)
    .map((segment) => (segment === '..' ? '_' : segment))
    .join(path.sep)
  const debugPath = path.join(process.cwd(), 'debug', envName, safePath)
  fs.mkdirSync(path.dirname(debugPath), { recursive: true })
  fs.writeFileSync(debugPath, transformedCode)
  return null
}
