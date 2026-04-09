// Spiceflow Vite plugin: integrates @vitejs/plugin-rsc for RSC support,
// provides SSR middleware, virtual modules, and prerender support.
import { createRequire } from 'node:module'
import path from 'node:path'
import url from 'node:url'

import rsc, { RscPluginOptions } from '@vitejs/plugin-rsc'
import {
  type MinimalPluginContextWithoutEnvironment,
  type Plugin,
  type PluginOption,
  type ResolvedConfig,
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

// Self-resolve entry paths from spiceflow's own location so they work even
// when spiceflow is a transitive dependency (e.g. installed inside a wrapper
// plugin's node_modules and not directly accessible from the consumer's root).
const __spiceflowDir = path.dirname(url.fileURLToPath(import.meta.url))
const spiceflowEntries = {
  rsc: path.resolve(__spiceflowDir, 'react/entry.rsc'),
  ssr: path.resolve(__spiceflowDir, 'react/entry.ssr'),
  client: path.resolve(__spiceflowDir, 'react/entry.client'),
}

// Module-level so the timestamp is stable even if spiceflowPlugin() is called more than once
const buildTimestamp = Date.now().toString(36)

// For absolute URL bases (e.g. federation remotes using
// `base: 'https://remote.example.com/app/'`), extract just the pathname
// so route matching and serveStatic work correctly. Asset URLs already
// include the full origin via Vite's built-in base handling.
function extractBasePathname(base: string): string {
  if (base.startsWith('http://') || base.startsWith('https://')) {
    const pathname = new URL(base).pathname.replace(/\/$/, '')
    return pathname || ''
  }
  return base === '/' ? '' : base.replace(/\/$/, '')
}

type BuildOutDirConfig = Pick<ResolvedConfig, 'root' | 'build'>

function resolveBuildOutDir(config: BuildOutDirConfig) {
  return path.isAbsolute(config.build.outDir)
    ? config.build.outDir
    : path.resolve(config.root, config.build.outDir)
}

function normalizeEnvironmentOutDirs(userConfig: UserConfig): UserConfig {
  const isCloudflare = hasPluginNamed(userConfig.plugins, 'vite-plugin-cloudflare')
  const rootOutDir = userConfig.build?.outDir ?? 'dist'
  const clientOutDir = path.join(rootOutDir, 'client')
  const rscOutDir = path.join(rootOutDir, 'rsc')
  const ssrOutDir = isCloudflare
    ? path.join(rootOutDir, 'rsc/ssr')
    : path.join(rootOutDir, 'ssr')
  const rscOutput = userConfig.environments?.rsc?.build?.rollupOptions?.output
  const ssrOutput = userConfig.environments?.ssr?.build?.rollupOptions?.output

  return {
    build: {
      outDir: rootOutDir,
    },
    environments: {
      client: {
        build: {
          outDir: userConfig.environments?.client?.build?.outDir ?? clientOutDir,
        },
      },
      rsc: {
        build: {
          outDir: userConfig.environments?.rsc?.build?.outDir ?? rscOutDir,
          rollupOptions: {
            output: Array.isArray(rscOutput)
              ? rscOutput.map((output) => ({
                  ...output,
                  entryFileNames: output.entryFileNames ?? '[name].js',
                }))
              : {
                  ...(rscOutput ?? {}),
                  entryFileNames: rscOutput?.entryFileNames ?? '[name].js',
                },
          },
        },
      },
      ssr: {
        build: {
          outDir: userConfig.environments?.ssr?.build?.outDir ?? ssrOutDir,
          rollupOptions: {
            output: Array.isArray(ssrOutput)
              ? ssrOutput.map((output) => ({
                  ...output,
                  entryFileNames: output.entryFileNames ?? '[name].js',
                }))
              : {
                  ...(ssrOutput ?? {}),
                  entryFileNames: ssrOutput?.entryFileNames ?? '[name].js',
                },
          },
        },
      },
    },
  }
}

export function spiceflowPlugin({
  entry,
  federation,
  importMap,
}: {
  entry: string
  /** Set to `'remote'` when this app is a federation remote that exposes components to a host. */
  federation?: 'remote'
  /** Additional import map entries merged into the auto-generated map.
   *  Useful for ESM components that import bare specifiers like `framer` or `framer-motion`.
   *  Example: `{ 'framer-motion': 'https://esm.sh/framer-motion?external=react' }` */
  importMap?: Record<string, string>
}): PluginOption {
  const isRemote = federation === 'remote'
  let server: ViteDevServer
  let resolvedOutDir = 'dist'
  let resolvedClientOutDir = path.join(resolvedOutDir, 'client')
  let resolvedRscOutDir = path.join(resolvedOutDir, 'rsc')
  let resolvedSsrOutDir = path.join(resolvedOutDir, 'ssr')
  let resolvedBase = ''
  let isCloudflareRuntime = false
  let importMapJson = ''
  const rscOptions: RscPluginOptions = {
    entries: spiceflowEntries,
    serverHandler: false as const,
    loadModuleDevProxy: true,
    ...(isRemote
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
    {
      name: 'spiceflow:normalize-environment-outdirs',
      config(userConfig) {
        return normalizeEnvironmentOutDirs(userConfig)
      },
    },
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
    outputModulePackagePlugin(),
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
        const isAbsoluteUrl = rawBase.startsWith('http://') || rawBase.startsWith('https://')
        if (rawBase !== '/' && !rawBase.startsWith('/') && !isAbsoluteUrl) {
          throw new Error(
            `[spiceflow] config.base must be an absolute path starting with "/", got "${rawBase}". ` +
              `CDN URLs (https://...) and relative paths (./) are not supported. ` +
              `Use base: "/my-app" instead.`,
          )
        }
        resolvedBase = extractBasePathname(rawBase)
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
        return {
          // Enable app build mode so `vite build` builds all environments
          // (client + SSR + RSC) without requiring the --app CLI flag.
          builder: {},
          // Disable Vite's built-in SPA fallback middleware so it doesn't
          // intercept unmatched paths with a 200 before our middleware runs.
          appType: 'custom' as const,
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
        resolvedClientOutDir = config.environments.client.build.outDir
        resolvedRscOutDir = config.environments.rsc.build.outDir
        resolvedSsrOutDir = config.environments.ssr.build.outDir
        resolvedBase = extractBasePathname(config.base || '/')
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
        config.resolve ??= {}

        // Package private `#imports` can target different runtime entry points
        // than public `exports`. The RSC environment already resolves with the
        // `react-server` condition, but the plain SSR environment uses the normal
        // server conditions unless we add an explicit SSR-only condition here.
        // This lets internal imports like `#router-context` resolve to the real
        // AsyncLocalStorage implementation in SSR while the client environment
        // still resolves to the browser-safe fallback.
        if (name === 'ssr') {
          config.resolve.conditions = mergeUnique(config.resolve.conditions, ['ssr'])
        }

        if (name === 'rsc') {
          config.resolve.conditions = mergeUnique(config.resolve.conditions, [
            'react-server',
          ])
        }

        config.optimizeDeps ??= {}

        // Only add filesystem entries to optimizeDeps — virtual modules and
        // bare specifiers aren't files so they can't be used as globs.
        const looksLikeFilePath = /\.[cm]?[jt]sx?$/.test(entry)
        if (looksLikeFilePath) {
          const entryGlob = entry.replace(
            /\.[cm]?[jt]sx?$/,
            '.{js,jsx,ts,tsx,mjs,mts,cjs,cts}',
          )
          config.optimizeDeps.entries = mergeUnique(
            toArray(config.optimizeDeps.entries),
            [entryGlob],
          )
        }

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

        if (name === 'rsc' || name === 'ssr') {
          addNoExternal(config, 'spiceflow')
          // Force React packages to resolve from the project root so the
          // vendored react-server-dom CJS inside @vitejs/plugin-rsc shares
          // the same React instance as user code. Without this, the vendor's
          // require("react") can resolve to a separate module instance
          // (especially under pnpm's strict isolation), causing
          // ReactSharedInternals.A (the cache dispatcher) to be set on one
          // instance while user code reads from another — breaking
          // React.cache() in server components.
          config.resolve ??= {}
          config.resolve.dedupe = mergeUnique(config.resolve.dedupe, [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
          ])

          // Keep React runtime packages inside the built server module graph.
          // This avoids worker/attached-module runtime failures from bare
          // specifiers and also keeps the server environments self-contained.
          for (const pkg of [
            'react',
            'react-dom',
            'react-dom/server',
            'react-dom/server.edge',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
          ]) {
            addNoExternal(config, pkg)
          }
        }

        if (name === 'rsc') {
          config.optimizeDeps.include = mergeUnique(
            config.optimizeDeps.include,
            ['spiceflow > superjson', 'spiceflow > history'],
          )
        }

        if (name === 'ssr') {
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
                  spiceflowEntries.ssr,
                )
              if (!resolvedEntry) {
                throw new Error(`Failed to resolve spiceflow SSR entry: ${spiceflowEntries.ssr}`)
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
        const mod = await import(path.resolve(resolvedSsrOutDir, 'index.js'))
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
    // Resolved directory paths for RSC runtime filesystem access.
    // In dev: publicDir = <cwd>/public, distDir = <cwd>.
    // In prod: resolved from the rsc/ directory (sibling of client/).
    // This virtual module gets code-split into rsc/assets/ (not rsc/index.js),
    // so we detect the assets/ nesting at runtime and walk up to rsc/.
    // On Cloudflare Workers, import.meta.filename is undefined (no filesystem),
    // so both exports fall back to empty strings.
    createVirtualPlugin('virtual:spiceflow-dirs', () => {
      const clientRelativeFromRsc = path.relative(resolvedRscOutDir, resolvedClientOutDir)
      const distRelativeFromRsc = path.relative(resolvedRscOutDir, resolvedOutDir)
      return [
        `import { resolve, dirname, basename } from 'node:path'`,
        `let publicDir = ''`,
        `let distDir = ''`,
        `if (import.meta.hot) {`,
        `  publicDir = resolve(process.cwd(), 'public')`,
        `  distDir = process.cwd()`,
        `} else if (typeof import.meta.filename === 'string') {`,
        `  const thisDir = dirname(import.meta.filename)`,
        `  const rscDir = basename(thisDir) === 'assets' ? dirname(thisDir) : thisDir`,
        `  publicDir = resolve(rscDir, ${JSON.stringify(clientRelativeFromRsc)})`,
        `  distDir = resolve(rscDir, ${JSON.stringify(distRelativeFromRsc)})`,
        `}`,
        `export { publicDir, distDir }`,
      ].join('\n')
    }),
    // Resolves to user's app entry module.
    // Re-exports all named exports (for Cloudflare Durable Objects, etc.)
    // and `default` (for Cloudflare Workers default export).
    createVirtualPlugin('virtual:app-entry', async function () {
      // Resolve the entry through Vite's plugin pipeline so both filesystem
      // paths (./src/main.tsx) and virtual modules (virtual:holocron-app)
      // are handled uniformly without manual path.resolve / pathToFileURL.
      const resolved = await this.resolve(entry)
      if (!resolved) {
        throw new Error(
          `[spiceflow] Could not resolve entry "${entry}". ` +
            `Make sure the file exists or the virtual module is registered by a plugin.`,
        )
      }
      // Strip the \0 prefix that Vite adds to virtual module IDs — import
      // statements use the unprefixed form and Vite re-resolves them.
      const resolvedEntry = resolved.id.startsWith('\0')
        ? resolved.id.slice(1)
        : resolved.id
      const clientRelative = path.relative(resolvedRscOutDir, resolvedClientOutDir)

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
    ...(importMap
      ? [userImportMapPlugin(importMap, () => importMapJson, (json) => { importMapJson = json })]
      : []),
    createVirtualPlugin('virtual:spiceflow-import-map', function () {
      // In dev mode, generate import map using Vite's ?url imports so that
      // the shared entry re-export files resolve to dev-server URLs that
      // browsers can load. In build mode, return the pre-built JSON string
      // populated by federationSharedPlugin and userImportMapPlugin.
      if (this.environment?.config.command === 'serve') {
        const importStatements: string[] = []
        const mapEntries: string[] = []
        let idx = 0

        for (const [name, specifiers] of Object.entries(SPECIFIER_MAP)) {
          const filePath = SHARED_ENTRIES[name]
          if (!filePath) continue
          const varName = `__url_${idx++}`
          importStatements.push(`import ${varName} from ${JSON.stringify(filePath + '?url')}`)
          for (const spec of specifiers) {
            mapEntries.push(`${JSON.stringify(spec)}: ${varName}`)
          }
        }

        if (importMap) {
          for (const [spec, value] of Object.entries(importMap)) {
            if (value.startsWith('http://') || value.startsWith('https://')) {
              mapEntries.push(`${JSON.stringify(spec)}: ${JSON.stringify(value)}`)
            } else {
              const varName = `__url_${idx++}`
              importStatements.push(`import ${varName} from ${JSON.stringify(value + '?url')}`)
              mapEntries.push(`${JSON.stringify(spec)}: ${varName}`)
            }
          }
        }

        return [
          ...importStatements,
          `export default JSON.stringify({ imports: { ${mapEntries.join(', ')} } })`,
        ].join('\n')
      }

      return `export default ${JSON.stringify(importMapJson)}`
    }),
    // Externalize React for remote apps so bare specifiers are resolved
    // by the host's import map. Can't be always-on because React is CJS
    // and Rolldown's interop generates require() that fails in browsers.
    ...(isRemote
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
  'spiceflow/react',
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
  'federation-spiceflow-react': path.join(sharedDir, 'spiceflow-react.js'),
}

const SPECIFIER_MAP: Record<string, string[]> = {
  'federation-react': ['react'],
  'federation-react-dom': ['react-dom'],
  'federation-react-dom-client': ['react-dom/client'],
  'federation-jsx-runtime': ['react/jsx-runtime', 'react/jsx-dev-runtime'],
  'federation-spiceflow-react': ['spiceflow/react'],
}

function federationSharedPlugin(
  _importMapJson: string,
  setImportMapJson: (json: string) => void,
): Plugin {
  const chunkRefs = new Map<string, string>()
  let base = '/'

  return {
    name: 'spiceflow:federation-shared',
    apply: 'build',

    configResolved(config) {
      base = config.base || '/'
    },

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
      // Use the Vite base so paths are absolute when base is a full URL
      const prefix = base.endsWith('/') ? base : base + '/'
      for (const [name, ref] of chunkRefs) {
        const fileName = this.getFileName(ref)
        const specifiers = SPECIFIER_MAP[name]
        if (specifiers) {
          for (const spec of specifiers) {
            imports[spec] = prefix + fileName
          }
        }
      }
      setImportMapJson(JSON.stringify({ imports }, null, 2))
    },
  }
}

// Merges user-provided import map entries into the auto-generated one.
// Values starting with http:// or https:// are used as-is (external URLs).
// All other values are treated as local file paths — Vite builds them into
// hashed chunks so the browser loads the same bundled instance as the host
// app (deduplication). This is the same pattern used for React shared entries.
function userImportMapPlugin(
  userEntries: Record<string, string>,
  getImportMapJson: () => string,
  setImportMapJson: (json: string) => void,
): Plugin {
  const chunkRefs = new Map<string, string>()
  let base = '/'

  return {
    name: 'spiceflow:user-import-map',
    apply: 'build',

    configResolved(config) {
      base = config.base || '/'
    },

    buildStart() {
      if (this.environment?.name !== 'client') return
      for (const [specifier, value] of Object.entries(userEntries)) {
        if (value.startsWith('http://') || value.startsWith('https://')) continue
        const ref = this.emitFile({
          type: 'chunk',
          id: value,
          name: `importmap-${specifier.replace(/[^a-zA-Z0-9-]/g, '-')}`,
          preserveSignature: 'strict',
        })
        chunkRefs.set(specifier, ref)
      }
    },

    generateBundle() {
      if (this.environment?.name !== 'client') return
      const current = JSON.parse(getImportMapJson() || '{"imports":{}}')
      const prefix = base.endsWith('/') ? base : base + '/'
      for (const [specifier, value] of Object.entries(userEntries)) {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          current.imports[specifier] = value
          continue
        }
        const ref = chunkRefs.get(specifier)
        if (ref) {
          current.imports[specifier] = prefix + this.getFileName(ref)
        }
      }
      setImportMapJson(JSON.stringify(current, null, 2))
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
    if (Reflect.get(plugin, 'name') === pluginName) {
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
  type BuildAppContext = MinimalPluginContextWithoutEnvironment & {
    environment?: {
      config: BuildOutDirConfig
    }
  }

  let outDir = 'dist'
  let rootDir = process.cwd()
  let skip = false

  return {
    name: 'spiceflow:standalone-trace',
    apply: 'build',

    configResolved(config) {
      outDir = resolveBuildOutDir(config)
      rootDir = config.root
      const isVercel = process.env.VERCEL === '1'
      const isCloudflare = config.plugins.some((p) =>
        p.name.startsWith('vite-plugin-cloudflare'),
      )
      skip =
        isVercel ||
        isCloudflare ||
        process.env.SPICEFLOW_SKIP_STANDALONE_TRACE === '1'
    },

    buildApp: {
      order: 'post' as const,
      async handler(this: BuildAppContext) {
        if (skip) return
        const resolvedOutDir = this.environment?.config
          ? resolveBuildOutDir(this.environment.config)
          : outDir

        await traceAndCopyDependencies({
          outDir: resolvedOutDir,
          rootDir: this.environment?.config?.root ?? rootDir,
          targetDir: resolvedOutDir,
        })
      },
    },
  }
}

function outputModulePackagePlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'spiceflow:output-module-package',
    apply: 'build',
    configResolved(config) {
      outDir = resolveBuildOutDir(config)
    },
    buildApp: {
      order: 'post' as const,
      async handler() {
        const { mkdir, writeFile } = await import('node:fs/promises')
        await mkdir(outDir, { recursive: true })
        await writeFile(
          path.join(outDir, 'package.json'),
          JSON.stringify({ type: 'module' }),
        )
      },
    },
  }
}

/** Subset of Rollup/Vite PluginContext used by virtual module load callbacks. */
type VirtualLoadContext = {
  resolve: (source: string, importer?: string) => Promise<{ id: string } | null>
  environment?: { config: { command: string } }
}

function createVirtualPlugin(
  virtualName: string,
  loadFn: (this: VirtualLoadContext, id: string, options?: { ssr?: boolean }) => string | void | Promise<string | void>,
): Plugin {
  const shortName = virtualName.replace('virtual:', '')
  const resolvedId = '\0' + virtualName
  return {
    name: `spiceflow:virtual-${shortName}`,
    resolveId(source) {
      return source === virtualName ? resolvedId : undefined
    },
    load(id, options) {
      if (id === resolvedId) {
        return loadFn.call(this, id, options)
      }
    },
  }
}
