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
import { serverFileGuardPlugin } from './server-file-guard.js'
import { traceAndCopyDependencies } from './trace-dependencies.js'
import { vercelPlugin } from './vercel.js'

const require = createRequire(import.meta.url)
const pluginRscRpcPath = require.resolve('@vitejs/plugin-rsc/utils/rpc')

// Module-level so the timestamp is stable even if spiceflowPlugin() is called more than once
const buildTimestamp = Date.now().toString(36)

export function spiceflowPlugin({
  entry,
  remote,
}: {
  entry: string
  remote?: boolean
}): PluginOption {
  let server: ViteDevServer
  let resolvedOutDir = 'dist'
  let resolvedBase = ''
  let isCloudflareRuntime = false
  let importMapJson = ''
  const rscOptions: RscPluginOptions = {
    entries: {
      rsc: 'spiceflow/dist/react/entry.rsc',
      ssr: 'spiceflow/dist/react/entry.ssr',
      client: 'spiceflow/dist/react/entry.client',
    },
    serverHandler: false as const,
    loadModuleDevProxy: true,
    ...(remote
      ? {
          clientChunks(meta: { id: string; normalizedId: string }) {
            if (meta.id.includes('spiceflow/') || meta.id.includes('spiceflow\\')) {
              return 'spiceflow-framework'
            }
            return 'user-components'
          },
        }
      : {}),

    // Use RSC_ENCRYPTION_KEY env var when set (stable across deploys), otherwise
    // let the plugin generate a random key (fine for dev and single-deploy setups).
    defineEncryptionKey: process.env.RSC_ENCRYPTION_KEY
      ? JSON.stringify(process.env.RSC_ENCRYPTION_KEY)
      : undefined,
    // Catch invalid cross-environment imports at build time (e.g. importing a server-only
    // module from a client component) instead of failing at runtime.
    validateImports: true,
  }

  return [
    // Must run BEFORE rsc() — strips the base path from plugin-rsc's internal
    // RPC requests. plugin-rsc's loadModuleDevProxy builds endpoint URLs using
    // origin+base (from server.resolvedUrls) but its middleware matches only
    // the pathname without base. Without this, every RPC call 404s when base != '/'.
    {
      name: 'spiceflow:rsc-rpc-base-fix',
      configureServer(server) {
        if (!resolvedBase) return
        server.middlewares.use((req, res, next) => {
          if (req.url?.includes('__vite_rsc_load_module_dev_proxy')) {
            // The RPC endpoint URL is origin+base+"__vite_rsc..." (no slash
            // separator) so we can't just strip a base prefix. Instead,
            // rewrite to start from /__vite_rsc... so the pathname matches.
            const idx = req.url.indexOf('__vite_rsc_load_module_dev_proxy')
            if (idx > 0) {
              req.url = '/' + req.url.slice(idx)
            }
          }
          next()
        })
      },
    },
    rsc(rscOptions),
    // Inject $$id on server reference functions so getActionAbortController()
    // can map a function back to its action ID.
    //
    // WHY: React's client-side createServerReference() stores the action ID
    // in a private WeakMap (knownServerReferences) — not as a property on the
    // function. There's no public API to read it back. We need the ID to look
    // up the AbortController for an in-flight action call.
    //
    // HOW: @vitejs/plugin-rsc transforms "use server" files into client proxy
    // modules with a stable output format. This post-transform wraps each
    // createServerReference() call to set $$id on the returned function.
    //
    // BEFORE (plugin-rsc output):
    //   export const myAction = $$ReactClient.createServerReference(
    //     "/src/actions.tsx#myAction", $$ReactClient.callServer, undefined,
    //     $$ReactClient.findSourceMapURL, "myAction"
    //   )
    //
    // AFTER (our transform):
    //   export const myAction = (($__sr) => ($__sr.$$id = "/src/actions.tsx#myAction", $__sr))(
    //     $$ReactClient.createServerReference(
    //       "/src/actions.tsx#myAction", $$ReactClient.callServer, undefined,
    //       $$ReactClient.findSourceMapURL, "myAction"
    //     )
    //   )
    //
    // The regex relies on the plugin-rsc output format: $$ReactClient.createServerReference("ID", ...simple args).
    // Arguments are always strings, identifiers, or `undefined` — no nested parentheses.
    // @vitejs/plugin-rsc is pinned in package.json so this doesn't silently
    // break on a minor update. When upgrading, verify the output format still matches.
    //
    // NOTE: In JS replacement strings, $$ is an escape for a literal $.
    // So $$$$id in the replacement produces $$id in the output.
    {
      name: 'spiceflow:server-ref-id',
      enforce: 'post' as const,
      transform(code) {
        if (!code.includes('createServerReference(')) return
        return code.replace(
          /(\$\$ReactClient\.createServerReference\(("[^"]*"),([^)]*)\))/g,
          '(($__sr) => ($__sr.$$$$id = $2, $__sr))($1)',
        )
      },
    },
    prerenderPlugin(),
    serverFileGuardPlugin(),
    // Automatically generate Vercel Build Output when VERCEL=1 is set
    ...(process.env.VERCEL === '1' ? [vercelPlugin()] : []),
    // Trace runtime dependencies into dist/node_modules/ so the build output
    // is self-contained (just copy dist/ into Docker and run it).
    // Skipped for Vercel (has its own tracing) and Cloudflare (bundles everything).
    standaloneTracePlugin(),

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
        // Capture base early — Vite normalizes it to '/' by default, but the
        // raw user value is available here before configResolved runs.
        const rawBase = userConfig.base || '/'
        if (rawBase !== '/' && !rawBase.startsWith('/')) {
          throw new Error(
            `[spiceflow] config.base must be an absolute path starting with "/", got "${rawBase}". ` +
              `CDN URLs (https://...) and relative paths (./) are not supported. ` +
              `Use base: "/my-app" instead.`,
          )
        }
        resolvedBase = rawBase.replace(/\/$/, '')
        const userOnWarn = userConfig.build?.rollupOptions?.onwarn
        const isCloudflare = hasPluginNamed(
          userConfig.plugins,
          'vite-plugin-cloudflare',
        )
        if (isCloudflare) {
          // Cloudflare child environments already expose worker-side module imports.
          // Using plugin-rsc's Node dev proxy here makes child `ssr` call
          // `.runner.import(...)` on a non-runnable CloudflareDevEnvironment.
          rscOptions.loadModuleDevProxy = false
        }
        const outDir = userConfig.build?.outDir ?? 'dist'
        return {
          // Enable app build mode so `vite build` builds all environments
          // (client + SSR + RSC) without requiring the --app CLI flag.
          builder: {},
          // Disable Vite's built-in SPA fallback middleware so it doesn't
          // intercept unmatched paths with a 200 before our middleware runs.
          appType: 'custom' as const,
          // SSR must live inside outDir/rsc/ because workerd only bundles files within the
          // Worker's directory. The RSC code loads SSR via import.meta.viteRsc.loadModule
          // which resolves to a relative import "../ssr/index.js" — if SSR is at outDir/ssr/
          // (sibling), the Worker can't reach it at runtime.
          ...(isCloudflare
            ? {
                environments: {
                  ssr: { build: { outDir: path.join(outDir, 'rsc/ssr') } },
                },
              }
            : {}),
          // Replace process.env.NODE_ENV at build time so React uses its production
          // bundle. Without this, the built output contains runtime checks like
          // `"production" !== process.env.NODE_ENV` that always evaluate to the dev
          // path, adding ~28% CPU overhead from debug stack traces and fake call sites.
          define: {
            ...(env.command === 'build'
              ? {
                  'process.env.NODE_ENV': JSON.stringify(
                    process.env.NODE_ENV || 'production',
                  ),
                }
              : {}),
          },
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
        resolvedBase = (config.base || '/').replace(/\/$/, '')
        isCloudflareRuntime = config.plugins.some((plugin) =>
          plugin.name.startsWith('vite-plugin-cloudflare:'),
        )
      },
      // Preserve all entry point exports in the RSC environment so user-defined
      // named exports (Durable Objects, Workflows, Queue consumers, etc.)
      // survive Rollup's tree-shaking and appear in the built Worker output.
      configEnvironment(name, config) {
        if (name === 'rsc') {
          config.build ??= {}
          config.build.rollupOptions ??= {}
          config.build.rollupOptions.preserveEntrySignatures =
            'allow-extension'
        }
      },
    },
    // Inject __SPICEFLOW_BASE__ into all environments so client/SSR/RSC code
    // can read the base path at runtime. Uses configEnvironment instead of
    // top-level define because the resolved base isn't available until configResolved.
    {
      name: 'spiceflow:base-define',
      configEnvironment(_name, config) {
        config.define ??= {}
        config.define.__SPICEFLOW_BASE__ = JSON.stringify(resolvedBase)
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
            ['spiceflow', '@vitejs/plugin-rsc'],
          )
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            [
              'react',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-dom',
              'react-dom/client',
              'spiceflow > superjson',
              'spiceflow > history',
            ],
          )
        }

        if (name === 'rsc') {
          addNoExternal(config, 'spiceflow')
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            ['spiceflow > superjson', 'spiceflow > history'],
          )
        }

        if (name === 'ssr') {
          addNoExternal(config, 'spiceflow')
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            [
              'spiceflow > isbot',
              'spiceflow > history',
              'react-dom/server',
              'react-dom/server.edge',
            ],
          )
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
            // Skip internal plugin-rsc dev proxy RPC requests — these must
            // be handled by the plugin's own middleware, not our SSR handler.
            // Without this guard, RPC requests fall through to fetchHandler
            // which triggers loadModule() again → infinite recursion.
            if (req.url?.includes('__vite_rsc_load_module_dev_proxy'))
              return next()
            // Vite's base middleware strips config.base from req.url, but
            // Spiceflow needs the full URL (including base) so its basePath
            // matching works consistently across dev/preview/production.
            if (resolvedBase && req.url && !req.url.startsWith(resolvedBase)) {
              req.url = resolvedBase + req.url
            }
            try {
              const resolvedEntry =
                await server.environments.ssr.pluginContainer.resolveId(
                  'spiceflow/dist/react/entry.ssr',
                )
              if (!resolvedEntry) {
                throw new Error('Failed to resolve spiceflow SSR entry')
              }
              const mod: any = await (
                server.environments.ssr as RunnableDevEnvironment
              ).runner?.import(resolvedEntry.id)
              const { createRequest, sendResponse } = await import(
                './react/fetch.js'
              )
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
            // Re-add Vite's stripped base prefix (see configureServer comment)
            if (resolvedBase && req.url && !req.url.startsWith(resolvedBase)) {
              req.url = resolvedBase + req.url
            }
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
    // Re-exports all named exports (for Cloudflare Durable Objects, etc.)
    // and `default` (for Cloudflare Workers default export).
    createVirtualPlugin('virtual:app-entry', () => {
      const resolvedEntryPath = path.resolve(entry)
      const resolvedEntry = url.pathToFileURL(resolvedEntryPath).href
      const clientRelative = path.relative(
        path.join(resolvedOutDir, 'rsc'),
        path.join(resolvedOutDir, 'client'),
      )

      const escapedBase = resolvedBase.replace(/'/g, "\\'")
      const lines = [
        `import * as entry from '${resolvedEntry}'`,
        `if (!entry.app) throw new Error('[spiceflow] Your entry file must export a Spiceflow instance as "app". Example:\\n\\n  export const app = new Spiceflow()\\n    .page("/", async () => <Home />)\\n    .listen(3000)\\n')`,
      ]
      // Set basePath from Vite's config.base on the root app instance.
      // Error if the user already set a conflicting basePath in the constructor.
      if (resolvedBase) {
        lines.push(
          `if (entry.app.basePath && entry.app.basePath !== '${escapedBase}') throw new Error('[spiceflow] Base path must be configured via Vite config.base only, not the Spiceflow constructor. Remove basePath from new Spiceflow({ basePath }) and set base: "${escapedBase}" in vite.config.ts instead.')`,
          `entry.app.basePath = '${escapedBase}'`,
        )
      }
      // Auto-inject serveStatic for client build output in production.
      // In dev, import.meta.hot is truthy so this is skipped — Vite serves
      // client assets from source. Cloudflare Workers handle static files
      // via their own runtime.
      if (!isCloudflareRuntime) {
        const baseLen = resolvedBase.length
        lines.push(
          `import { serveStatic as __serveStatic } from 'spiceflow'`,
          `import { resolve as __resolve, dirname as __dirname } from 'node:path'`,
          `if (!import.meta.hot) {`,
          `  const __clientDir = __resolve(__dirname(import.meta.filename), '${clientRelative}')`,
          // Strip base path prefix from request paths so serveStatic can find
          // files on disk (e.g. /base/assets/style.css → /assets/style.css)
          ...(resolvedBase
            ? [
                `  entry.app.use(__serveStatic({ root: __clientDir, rewriteRequestPath: (p) => p.startsWith('${escapedBase}') ? p.slice(${baseLen}) || '/' : p }))`,
              ]
            : [`  entry.app.use(__serveStatic({ root: __clientDir }))`]),
          `}`,
        )
      }
      // Re-export everything from the user entry so named exports like
      // Durable Objects, Workflows, etc. survive the build.
      lines.push(
        `export * from '${resolvedEntry}'`,
        `export default entry.default`,
      )
      return lines.join('\n')
    }),
    federationSharedPlugin(importMapJson, (json) => { importMapJson = json }),
    createVirtualPlugin('virtual:spiceflow-import-map', () => {
      return `export default ${JSON.stringify(importMapJson)}`
    }),
    // Externalize React for remote apps so bare specifiers are resolved
    // by the host's import map. Can't be always-on because React is CJS
    // and Rolldown's interop generates require() that fails in browsers.
    ...(remote
      ? [
          {
            name: 'spiceflow:federation-remote',
            configEnvironment(name: string, config: any) {
              if (name !== 'client') return
              config.build ??= {}
              config.build.rollupOptions ??= {}
              config.build.rollupOptions.external = REACT_EXTERNALS
            },
          } satisfies Plugin,
        ]
      : []),
  ]
}

const REACT_EXTERNALS = [
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]

const sharedDir = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  'federation/shared',
)

const SHARED_ENTRIES: Record<string, string> = {
  'federation-react': path.join(sharedDir, 'react.js'),
  'federation-react-dom': path.join(sharedDir, 'react-dom.js'),
  'federation-react-dom-client': path.join(sharedDir, 'react-dom-client.js'),
  'federation-jsx-runtime': path.join(sharedDir, 'react-jsx-runtime.js'),
}

const SPECIFIER_MAP: Record<string, string[]> = {
  'federation-react': ['react'],
  'federation-react-dom': ['react-dom'],
  'federation-react-dom-client': ['react-dom/client'],
  'federation-jsx-runtime': ['react/jsx-runtime', 'react/jsx-dev-runtime'],
}

function federationSharedPlugin(
  _importMapJson: string,
  setImportMapJson: (json: string) => void,
): Plugin {
  const chunkRefs = new Map<string, string>()

  return {
    name: 'spiceflow:federation-shared',
    apply: 'build',

    buildStart() {
      if (this.environment?.name !== 'client') return
      for (const [name, filePath] of Object.entries(SHARED_ENTRIES)) {
        const ref = this.emitFile({
          type: 'chunk',
          id: filePath,
          name,
          preserveSignature: 'strict',
        })
        chunkRefs.set(name, ref)
      }
    },

    generateBundle() {
      if (this.environment?.name !== 'client') return
      const imports: Record<string, string> = {}
      for (const [name, ref] of chunkRefs) {
        const fileName = this.getFileName(ref)
        const specifiers = SPECIFIER_MAP[name]
        if (specifiers) {
          for (const spec of specifiers) {
            imports[spec] = '/' + fileName
          }
        }
      }
      setImportMapJson(JSON.stringify({ imports }, null, 2))
    },
  }
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

function standaloneTracePlugin(): Plugin {
  let outDir = 'dist'
  let skip = false

  return {
    name: 'spiceflow:standalone-trace',
    apply: 'build',

    configResolved(config) {
      outDir = config.build.outDir
      const isVercel = process.env.VERCEL === '1'
      const isCloudflare = config.plugins.some((p) =>
        p.name.startsWith('vite-plugin-cloudflare'),
      )
      skip = isVercel || isCloudflare
    },

    buildApp: {
      order: 'post' as const,
      async handler() {
        if (skip) return
        await traceAndCopyDependencies(outDir, outDir)
        // Write package.json so Node.js treats .js files as ESM
        const { writeFile } = await import('node:fs/promises')
        const { default: path } = await import('node:path')
        await writeFile(
          path.join(outDir, 'package.json'),
          JSON.stringify({ type: 'module' }),
        )
      },
    },
  }
}

function createVirtualPlugin(
  virtualName: string,
  load: Plugin['load'],
): Plugin {
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
