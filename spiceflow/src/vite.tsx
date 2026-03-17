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
        const isCloudflare = hasPluginNamed(userConfig.plugins, 'vite-plugin-cloudflare')
        if (isCloudflare) {
          // Cloudflare child environments already expose worker-side module imports.
          // Using plugin-rsc's Node dev proxy here makes child `ssr` call
          // `.runner.import(...)` on a non-runnable CloudflareDevEnvironment.
          rscOptions.loadModuleDevProxy = false
        }
        const outDir = userConfig.build?.outDir ?? 'dist'
        return {
          // SSR must live inside outDir/rsc/ because workerd only bundles files within the
          // Worker's directory. The RSC code loads SSR via import.meta.viteRsc.loadModule
          // which resolves to a relative import "../ssr/index.js" — if SSR is at outDir/ssr/
          // (sibling), the Worker can't reach it at runtime.
          ...(isCloudflare ? { environments: { ssr: { build: { outDir: path.join(outDir, 'rsc/ssr') } } } } : {}),
          // Replace process.env.NODE_ENV at build time so React uses its production
          // bundle. Without this, the built output contains runtime checks like
          // `"production" !== process.env.NODE_ENV` that always evaluate to the dev
          // path, adding ~28% CPU overhead from debug stack traces and fake call sites.
          define: env.command === 'build'
            ? { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') }
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
    // Point optimizeDeps.entries at the user's app entry and spiceflow's own entries
    // so Vite crawls the full import graph upfront instead of discovering deps late
    // (which triggers re-optimization rounds + page reloads during dev).
    //
    // Also ensures Vite processes spiceflow through its transform pipeline (noExternal)
    // so conditional package.json exports (react-server vs default) resolve correctly.
    // Excludes spiceflow from client dep optimization so RSC client references
    // (loaded via client-in-server-package-proxy from raw node_modules) share the same
    // module instances as the entry.client imports.
    {
      name: 'spiceflow:optimize-deps',
      configEnvironment(name, config) {
        const entryGlob = entry.replace(
          /\.[cm]?[jt]sx?$/,
          '.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
        )

        config.optimizeDeps ??= {}
        config.optimizeDeps.entries = mergeUnique(
          toArray(config.optimizeDeps.entries),
          [entryGlob],
        )

        // Each environment runs its own independent optimizer, so deps discovered
        // late by the rsc/ssr optimizer still cause reloads even if the client
        // optimizer finished cleanly. Explicitly include known CJS/late-discovered
        // deps that spiceflow transitively imports so all three environments
        // pre-bundle them upfront instead of finding them mid-request.
        if (name === 'client') {
          config.optimizeDeps.exclude = mergeUnique(
            config.optimizeDeps.exclude,
            ['spiceflow'],
          )
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            [
              'react',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-dom',
              'react-dom/client',
              'superjson',
              'history',
            ],
          )
        }

        if (name === 'rsc') {
          addNoExternal(config, 'spiceflow')
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            ['copy-anything', 'superjson', 'zod', 'history'],
          )
        }

        if (name === 'ssr') {
          addNoExternal(config, 'spiceflow')
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            ['isbot', 'history', 'react-dom/server', 'react-dom/server.edge'],
          )
        }
      },
    },

    // TODO: remove this workaround once @tailwindcss/vite releases the fix from
    // https://github.com/tailwindlabs/tailwindcss/pull/19745 (merged but unreleased as of 4.2.1)
    //
    // Workaround: @tailwindcss/vite's hotUpdate hook sends a bare full-reload
    // to the client when server-only files (like the app entry) change, because
    // Tailwind scans them for class names. This breaks RSC HMR by causing a
    // full page reload instead of letting rsc:update + router.refresh() handle it.
    {
      name: 'spiceflow:tailwind-hmr-fix',
      configResolved(config) {
        const twPlugin = config.plugins.find(
          (p) => p.name === '@tailwindcss/vite:generate:serve',
        )
        if (twPlugin) {
          delete twPlugin.hotUpdate
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
              const { createRequest, sendResponse } = await import('./react/fetch.js')
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
        const { createRequest, sendResponse } = await import('./react/fetch.js')
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

    // Build timestamp inlined as a constant.
    // No runtime fs access needed, works on Node, Cloudflare, edge runtimes, etc.
    createVirtualPlugin('virtual:spiceflow-deployment-id', () => {
      return `export default ${JSON.stringify(buildTimestamp)}`
    }),
    // Resolves to user's app entry module.
    // Re-exports `app` (named) and `default` (for Cloudflare Workers default export).
    createVirtualPlugin('virtual:app-entry', () => {
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

function mergeUnique<T>(base: T[] | undefined, add: T[]): T[] {
  return Array.from(new Set([...(base ?? []), ...add]))
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function addNoExternal(
  config: { resolve?: { noExternal?: unknown } },
  pkg: string,
) {
  config.resolve ??= {}
  const existing = config.resolve.noExternal
  if (existing === true) return
  // Preserve false (user explicitly disabled) — we still need spiceflow processed
  const arr = Array.isArray(existing)
    ? existing
    : existing && existing !== false
      ? [existing]
      : []
  config.resolve.noExternal = Array.from(new Set([...arr, pkg]))
}

function createVirtualPlugin(virtualName: string, load: Plugin['load']): Plugin {
  const shortName = virtualName.replace('virtual:', '')
  return {
    name: `spiceflow:virtual-${shortName}`,
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
