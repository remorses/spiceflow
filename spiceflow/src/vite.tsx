// Spiceflow Vite plugin: integrates @vitejs/plugin-rsc for RSC support,
// provides SSR middleware, virtual modules, and prerender support.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import url from 'node:url'

import rsc, { RscPluginOptions } from '@vitejs/plugin-rsc'
import {
  type Plugin,
  type PluginOption,
  type RunnableDevEnvironment,
  type UserConfig,
  type ViteDevServer,
} from 'vite'
import { prerenderPlugin } from './react/prerender.js'

const require = createRequire(import.meta.url)
const pluginRscRpcPath = require.resolve('@vitejs/plugin-rsc/utils/rpc')

// Module-level so the timestamp is stable even if spiceflowPlugin() is called more than once
const buildTimestamp = Date.now().toString(36)

export function spiceflowCloudflareViteConfig({
  outDir = 'dist',
}: {
  outDir?: string
} = {}) {
  return {
    environments: {
      ssr: {
        build: {
          // SSR must live inside dist/rsc/ because workerd only bundles files within the
          // Worker's directory. The RSC code loads SSR via import.meta.viteRsc.loadModule
          // which resolves to a relative import "../ssr/index.js" — if SSR is at dist/ssr/
          // (sibling), the Worker can't reach it at runtime.
          outDir: path.join(outDir, 'rsc/ssr'),
        },
      },
    },
  }
}

export function spiceflowPlugin({
  entry,
}: {
  entry: string
}): PluginOption {
  let server: ViteDevServer
  let resolvedOutDir = 'dist'
  let isCloudflareRuntime = false
  const rscOptions: RscPluginOptions = {
    entries: {
      rsc: 'spiceflow/dist/react/entry.rsc',
      ssr: 'spiceflow/dist/react/entry.ssr',
      client: 'spiceflow/dist/react/entry.client',
    },
    serverHandler: false as const,
    loadModuleDevProxy: true,

    // Stable encryption key for server action closure args. Without this the key changes on
    // every build/restart, breaking action calls from stale client bundles after a deploy.
    defineEncryptionKey: 'process.env.RSC_ENCRYPTION_KEY',
    // Catch invalid cross-environment imports at build time (e.g. importing a server-only
    // module from a client component) instead of failing at runtime.
    validateImports: true,
  }

  return [
    rsc(rscOptions),
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



    {
      name: 'spiceflow:config',
      config(userConfig, env) {
        const userOnWarn = userConfig.build?.rollupOptions?.onwarn
        if (hasPluginNamed(userConfig.plugins, 'vite-plugin-cloudflare')) {
          // Cloudflare child environments already expose worker-side module imports.
          // Using plugin-rsc's Node dev proxy here makes child `ssr` call
          // `.runner.import(...)` on a non-runnable CloudflareDevEnvironment.
          rscOptions.loadModuleDevProxy = false
        }
        return {
          // Replace process.env.NODE_ENV at build time so React uses its production
          // bundle. Without this, the built output contains runtime checks like
          // `"production" !== process.env.NODE_ENV` that always evaluate to the dev
          // path, adding ~28% CPU overhead from debug stack traces and fake call sites.
          define: env.command === 'build'
            ? { 'process.env.NODE_ENV': JSON.stringify('production') }
            : undefined,
          build: {
            rollupOptions: {
              onwarn(warning, defaultHandler) {
                // Suppress IMPORT_IS_UNDEFINED for virtual:app-entry — it uses
                // `import * as entry` + re-export which Rollup can't statically verify,
                // but the runtime check (`if (!entry.app) throw ...`) already covers it.
                if (
                  warning.code === 'IMPORT_IS_UNDEFINED' &&
                  warning.id?.includes('\0virtual:app-entry')
                ) {
                  return
                }
                if (userOnWarn) {
                  userOnWarn(warning, defaultHandler)
                } else {
                  defaultHandler(warning)
                }
              },
            },
          },
        }
      },
      configResolved(config) {
        resolvedOutDir = config.build.outDir
        isCloudflareRuntime = config.plugins.some((plugin) =>
          plugin.name.startsWith('vite-plugin-cloudflare:'),
        )
      },
    },
    // Ensure Vite processes spiceflow (not externalized) so conditional package.json
    // exports (react-server vs default) resolve correctly at build time.
    // Also exclude spiceflow from client dep optimization so that RSC client references
    // (loaded via client-in-server-package-proxy from raw node_modules) share the same
    // module instances as the entry.client imports. Without this, the dep optimizer
    // bundles spiceflow's context/components into .vite/deps/ while RSC client refs
    // load the raw files, creating duplicate React contexts where the Provider and
    // consumer see different instances.
    {
      name: 'spiceflow:no-external',
      configEnvironment(name, config) {
        if (name === 'rsc' || name === 'ssr') {
          config.resolve ??= {}
          const existing = config.resolve.noExternal
          if (existing === true) return
          const arr = Array.isArray(existing) ? existing : existing ? [existing] : []
          config.resolve.noExternal = [...arr, 'spiceflow']
        }
        if (name === 'client') {
          config.optimizeDeps ??= {}
          config.optimizeDeps.exclude ??= []
          if (!config.optimizeDeps.exclude.includes('spiceflow')) {
            config.optimizeDeps.exclude.push('spiceflow')
          }
        }
      },
    },

    // SSR middleware for dev and preview servers
    {
      name: 'spiceflow:ssr-middleware',
      configureServer(_server) {
        // Cloudflare dev/preview already route requests through the worker entry.
        // Installing the Node SSR middleware here breaks the supported dev flow
        // because SSR then needs to call back into the non-runnable worker env.
        if (isCloudflareRuntime) return
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
              ).runner?.import(resolvedEntry.id)
              const { createRequest, sendResponse } = await import('./react/utils/fetch.js')
              const request = createRequest(req, res)
              const response = await mod.fetchHandler(request)
              sendResponse(response, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(previewServer) {
        // Preview should also go through the built worker entry when Cloudflare owns the runtime.
        if (isCloudflareRuntime) return
        const mod = await import(path.resolve(resolvedOutDir, 'ssr/index.js'))
        const { createRequest, sendResponse } = await import('./react/utils/fetch.js')
        return () => {
          previewServer.middlewares.use(async (req, res, next) => {
            try {
              const request = createRequest(req, res)
              const response = await mod.fetchHandler(request)
              sendResponse(response, res)
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

    // virtual:app-entry — resolves to user's app entry module.
    // Re-exports `app` (named) and `default` (for Cloudflare Workers default export).
    createVirtualPlugin('app-entry', () => {
      return [
        `import * as entry from '${url.pathToFileURL(path.resolve(entry))}'`,
        `if (!entry.app) throw new Error('[spiceflow] Your entry file must export a Spiceflow instance as "app". Example:\\n\\n  export const app = new Spiceflow()\\n    .page("/", async () => <Home />)\\n    .listen(3000)\\n')`,
        `export const app = entry.app`,
        `export default entry.default`,
      ].join('\n')
    }),

  ]
}

function hasPluginNamed(
  plugins: UserConfig['plugins'],
  pluginName: string,
): boolean {
  if (!plugins) return false

  for (const plugin of plugins) {
    if (!plugin) continue
    if (Array.isArray(plugin)) {
      if (hasPluginNamed(plugin, pluginName)) return true
      continue
    }
    if ('name' in plugin && plugin.name === pluginName) {
      return true
    }
  }

  return false
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
