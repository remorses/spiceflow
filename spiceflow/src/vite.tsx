import assert from 'node:assert'
import * as vite from 'vite'

import { createDebug, memoize, tinyassert } from '@hiogawa/utils'
import react from '@vitejs/plugin-react'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import url, { fileURLToPath } from 'node:url'
import { clientTransform, serverTransform } from 'unplugin-rsc'
import {
  type Manifest,
  type Plugin,
  PluginOption,
  type RunnableDevEnvironment,
  ViteDevServer,
  createRunnableDevEnvironment,
} from 'vite'
import { collectStyleUrls } from './react/css.js'
import { noramlizeClientReferenceId } from './react/utils/normalize.js'
import { prerenderPlugin } from './react/prerender.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function makeHash(filename: string) {
  const hash = crypto
    .createHash('sha256')
    .update(filename)
    .digest('hex')
    .slice(0, 8)
  return hash
}

export function spiceflowPlugin({ entry }): PluginOption {
  // Move state variables inside plugin closure
  let browserManifest: Manifest
  let rscManifest: Manifest
  const clientModules = new Map<string, string>()
  const serverModules = new Map<string, string>()
  let buildScan = false

  let command: string = ''
  let server: ViteDevServer
  let nodeModulesFilesWithUseClient = new Map<
    string,
    { id: string; exportNames: Set<string> }
  >()
  let buildType: 'scan' | 'server' | 'browser' | 'ssr' | undefined
  return [
    react(),
    prerenderPlugin(),
    {
      name: 'react-server-dom',
      enforce: 'post',
      configureServer(_server) {
        server = _server
      },
      config(_config, env) {
        command = env.command
      },

      async transform(code, id) {
        let result = code
        const ext = id.slice(id.lastIndexOf('.'))

        if (
          EXTENSIONS_TO_TRANSFORM.has(ext) &&
          code.match(/['"]use (client|server)['"]/g)
        ) {
          const isUseClient = USE_CLIENT_RE.test(code)
          if (isUseClient && buildScan) {
            // This is needed to let scan discover server references found in the use client components
            return
          }
          // when using external library's server component includes client reference,
          // it will end up here with deps optimization hash `?v=` resolved by server module graph.
          // this is not entirely free from double module issue,
          // but it allows handling simple server-client-mixed package such as react-tweet.
          // cf. https://github.com/hi-ogawa/vite-plugins/issues/379
          if (isUseClient && command !== 'build' && id.includes('?v=')) {
            id = id.split('?v=')[0]!
          }
          const mod =
            await server?.environments.client.moduleGraph.getModuleById(id)
          // console.log('mod', id, mod?.lastHMRTimestamp, )
          // console.log([...server?.moduleGraph.idToModuleMap.keys()])
          let generateId = (id) => {
            let generated = ''
            if (command === 'build') {
              generated = makeHash(id)
            } else {
              generated = noramlizeClientReferenceId(id, server, mod)
            }
            console.log('generateId', generated)

            if (!isUseClient) {
              serverModules.set(id, generated)
            } else {
              clientModules.set(id, generated)
            }

            return generated
          }

          if (this.environment.name === 'rsc') {
            const transformed = serverTransform(code, id, {
              id: generateId,
              importClient: 'registerClientReference',
              importFrom: 'spiceflow/dist/react/server-dom-optimized',
              importServer: 'registerServerReference',
            })
            result = transformed.code
            debugTransformResult({
              envName: this.environment.name,
              transformedCode: result,
              id,
            })
          } else {
            const transformed = clientTransform(
              code,
              id,
              this.environment.name === 'client'
                ? {
                    id: generateId,
                    importFrom: 'spiceflow/dist/react/references.browser',
                    importServer: 'createServerReference',
                  }
                : {
                    id: generateId,
                    importFrom:
                      'spiceflow/dist/react/server-dom-client-optimized',
                    importServer: 'createServerReference',
                  },
            )
            result = transformed.code
            debugTransformResult({
              envName: this.environment.name,
              transformedCode: result,
              id,
            })
          }
        }

        return result
      },
    },

    {
      name: 'spiceflow',

      config: () => ({
        appType: 'custom',
        environments: {
          client: {
            optimizeDeps: {
              include: [
                // 'react-dom/client',
                'spiceflow/dist/react/server-dom-client-optimized',
              ],
            },
            build: {
              manifest: true,

              outDir: 'dist/client',
              rollupOptions: {
                input: { index: 'virtual:browser-entry' },
              },
            },
          },
          ssr: {
            build: {
              manifest: true,
              ssrManifest: true,

              outDir: 'dist/ssr',
              rollupOptions: {
                // preserveEntrySignatures: 'exports-only',

                input: { index: 'spiceflow/dist/react/entry.ssr' },
              },
              emitAssets: true,
              ssrEmitAssets: true,
            },
          },
          rsc: {
            optimizeDeps: {
              include: [
                'react',
                'react/jsx-runtime',
                'react/jsx-dev-runtime',
                'spiceflow/dist/react/server-dom-optimized',
                'spiceflow/dist/react/server-dom-client-optimized',
              ],
              exclude: ['util'],
            },

            resolve: {
              conditions: ['react-server'],
              noExternal: ['react', 'react-dom'],
            },
            dev: {
              createEnvironment(name, config) {
                return createRunnableDevEnvironment(name, config, {
                  hot: false, // TODO investigate how to enable hmr for server
                })
              },
            },
            // keepProcessEnv: true,
            build: {
              ssr: true,
              ssrManifest: true,
              outDir: 'dist/rsc',
              manifest: true,
              ssrEmitAssets: true,
              emitAssets: true,
              rollupOptions: {
                preserveEntrySignatures: 'exports-only',

                input: { index: 'spiceflow/dist/react/entry.rsc' },
              },
            },
          },
        },
        builder: {
          sharedPlugins: true,
          async buildApp(builder) {
            buildScan = true
            // this scan part seems necessary to find all the server references and client references, otherwise they are empty
            await builder.build(builder.environments.rsc)
            buildScan = false
            const rscOutputs = (await builder.build(
              builder.environments.rsc,
            )) as vite.Rollup.RollupOutput
            const clientOutputs = (await builder.build(
              builder.environments.client,
            )) as vite.Rollup.RollupOutput
            const ssrOutputs = (await builder.build(
              builder.environments.ssr,
            )) as vite.Rollup.RollupOutput

            const clientOutDir = builder.environments.client.config.build.outDir

            moveStaticAssets(
              ssrOutputs,
              builder.environments.ssr.config.build.outDir,
              clientOutDir,
            )
            moveStaticAssets(
              rscOutputs,
              builder.environments.rsc.config.build.outDir,
              clientOutDir,
            )
          },
        },
      }),
    },

    {
      name: 'ssr-middleware',
      configureServer(server) {
        const ssrRunner = (server.environments.ssr as RunnableDevEnvironment)
          .runner
        const rscRunner = (server.environments.rsc as RunnableDevEnvironment)
          .runner
        Object.assign(globalThis, { __rscRunner: rscRunner })
        return () => {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.includes('__inspect')) {
              return next()
            }
            try {
              const mod: any = await ssrRunner.import(
                'spiceflow/dist/react/entry.ssr',
              )
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
      async configurePreviewServer(server) {
        const mod = await import(path.resolve('dist/ssr/index.js'))
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              await mod.default(req, res)
            } catch (e) {
              next(e)
            }
          })
        }
      },
    },
    {
      name: 'virtual:build-rsc-entry',
      resolveId(source) {
        if (source === 'virtual:build-rsc-entry') {
          // externalize rsc entry in ssr entry as relative path
          return { id: '../rsc/index.js', external: true }
        }
      },
    },
    createVirtualPlugin('app-entry', () => {
      return `export {default} from '${url.pathToFileURL(path.resolve(entry))}'`
    }),
    createVirtualPlugin('app-styles', async function () {
      if (this.environment.mode !== 'dev') {
        const rscCss = Object.values(rscManifest).flatMap((x) => x.css)
        const clientCss = Object.values(browserManifest).flatMap((x) => x.css)

        const allStyles = [...rscCss, ...clientCss].filter(Boolean)
        return `export default ${JSON.stringify(allStyles)}`
      }
      const allStyles = await collectStyleUrls(server.environments['rsc'], {
        entries: [entry],
      })
      const code = `export default ${JSON.stringify(allStyles)}\n\n`
      // ensure hmr boundary since css module doesn't have `import.meta.hot.accept`
      return code + `if (import.meta.hot) { import.meta.hot.accept() }`
    }),

    createVirtualPlugin('ssr-assets', function () {
      // TODO this should also add other client modules used to speed loading up during build
      assert(this.environment.name === 'ssr')
      let bootstrapModules: string[] = []
      if (this.environment.mode === 'dev') {
        bootstrapModules = ['/@id/__x00__virtual:browser-entry']
      }
      if (this.environment.mode === 'build') {
        bootstrapModules = [browserManifest['virtual:browser-entry'].file]
      }
      return `export const bootstrapModules = ${JSON.stringify(bootstrapModules)}`
    }),
    createVirtualPlugin('browser-entry', function () {
      if (this.environment.mode === 'dev') {
        return `
      import "/@vite/client";
      eval('globalThis.__raw_import = (id) => import(/* @vite-ignore */id)')
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      await import("spiceflow/dist/react/entry.client");
    `
      } else {
        return `import "spiceflow/dist/react/entry.client";`
      }
    }),
    {
      name: 'misc',
      hotUpdate(ctx) {
        if (this.environment.name === 'rsc') {
          const ids = ctx.modules.map((mod) => mod.id).filter((v) => v !== null)
          // console.log('reload', ids, clientReferences)
          if (ids.length > 0) {
            // client reference id is also in react server module graph,
            // but we skip RSC HMR for this case since Client HMR handles it.
            if (!ids.some((id) => clientModules.has(id))) {
              ctx.server.environments.client.hot.send({
                type: 'custom',
                event: 'react-server:update',
                data: {
                  file: ctx.file,
                },
              })
            }
          }
        }
      },

      writeBundle(_options, bundle) {
        if (this.environment.name === 'client') {
          const output = bundle['.vite/manifest.json']
          assert(output.type === 'asset')
          assert(typeof output.source === 'string')
          browserManifest = JSON.parse(output.source)
        }
        if (this.environment.name === 'rsc') {
          const output = bundle['.vite/manifest.json']
          assert(output.type === 'asset')
          assert(typeof output.source === 'string')
          rscManifest = JSON.parse(output.source)
        }
      },
    },
    createVirtualPlugin('build-client-references', () => {
      let result = `export default {\n`
      for (let [filename, id] of clientModules) {
        // Handle virtual modules by removing \0 prefix if present
        const importPath = filename.startsWith('\0')
          ? filename.slice(1)
          : filename
        result += `"${id}": () => import("${importPath}"),\n`
      }
      result += `};\n`

      return { code: result, map: null }
    }),
    createVirtualPlugin('build-server-references', () => {
      let result = `export default {\n`
      for (let [filename, id] of serverModules) {
        // Handle virtual modules by removing \0 prefix if present
        const importPath = filename.startsWith('\0')
          ? filename.slice(1)
          : filename
        result += `"${id}": () => import("${importPath}"),\n`
      }
      result += `};\n`

      return { code: result, map: null }
    }),
    
    // vitePluginSilenceDirectiveBuildWarning(),
  ]

  function createVirtualPlugin(name: string, load: Plugin['load']) {
    name = 'virtual:' + name
    return {
      name: `virtual-${name}`,

      resolveId(source, _importer, _options) {
        return source === name ? '\0' + name : undefined
      },
      load(id, options) {
        if (id === '\0' + name) {
          return (load as Function).apply(this, [id, options])
        }
      },
    } satisfies Plugin
  }

  // silence warning due to "use ..." directives
  // https://github.com/vitejs/vite-plugin-react/blob/814ed8043d321f4b4679a9f4a781d1ed14f185e4/packages/plugin-react/src/index.ts#L303
  function vitePluginSilenceDirectiveBuildWarning(): Plugin {
    return {
      name: vitePluginSilenceDirectiveBuildWarning.name,
      enforce: 'post',
      config(config, _env) {
        return {
          build: {
            rollupOptions: {
              onwarn(warning, defaultHandler) {
                // https://github.com/vitejs/vite/issues/15012#issuecomment-1948550039
                if (
                  warning.code === 'SOURCEMAP_ERROR' &&
                  warning.message.includes('(1:0)')
                ) {
                  return
                }
                // https://github.com/TanStack/query/pull/5161#issuecomment-1506683450
                if (
                  warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                  (warning.message.includes(`use client`) ||
                    warning.message.includes(`use server`))
                ) {
                  return
                }
                if (config.build?.rollupOptions?.onwarn) {
                  config.build.rollupOptions.onwarn(warning, defaultHandler)
                } else {
                  defaultHandler(warning)
                }
              },
            },
          },
        }
      },
    }
  }
}

const USE_CLIENT_RE = /^(("use client")|('use client'))/m

export function debugTransformResult({ transformedCode, envName, id }) {
  // If load() returns undefined, fall back to original code
  if (!process.env.DEBUG_SPICEFLOW) return

  // Create debug folder structure mirroring source
  const relativePath = path.relative(process.cwd(), id.replace(/\0/g, ''))
  // Replace any .. with _ to prevent directory traversal
  const safePath = relativePath
    .split(path.sep)
    .map((segment) => (segment === '..' ? '_' : segment))
    .join(path.sep)

  // Add environment name to debug path
  const debugPath = path.join(process.cwd(), 'debug', envName, safePath)

  // Ensure debug directory exists
  fs.mkdirSync(path.dirname(debugPath), { recursive: true })

  // Write transformed code to debug file
  fs.writeFileSync(debugPath, transformedCode)

  // Return original result to not interfere with build
  return null
}

// TODO this does not work if use client is not used directly in the entrypoint, i could resolve up until 4 levels to add support, worth it?
function useClientNodeModules({ nodeModulesFilesWithUseClient }) {
  const NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX =
    'virtual:use-client-node-module/'

  function wrapId(id: string) {
    return id.startsWith(`/@id`) ? id : `/@id/${id.replace('\0', '__x00__')}`
  }
  let plugins: Plugin[] = [
    {
      name: 'server-virtual-use-client-node-modules',
      enforce: 'pre',
      apply: 'serve',
      applyToEnvironment: (x) => x.name === 'rsc',
      resolveId: memoize(async function (this, source, importer) {
        const debug = createDebug('react-server:plugin:use-client')

        if (
          source[0] !== '.' &&
          source[0] !== '/' &&
          !source.startsWith('virtual') &&
          !source.startsWith('\0virtual')
        ) {
          const resolved = await this.resolve(source, importer, {
            skipSelf: true,
          })
          debug('[rsc.use-client-node-modules.resolveId]', {
            source,
            resolved,
          })
          if (resolved && resolved.id.includes('/node_modules/')) {
            const [id] = resolved.id.split('?v=')
            tinyassert(id)
            const code = await fs.promises.readFile(id!, 'utf-8')

            if (USE_CLIENT_RE.test(code)) {
              console.log(`found use client node module: ${id}`)
              nodeModulesFilesWithUseClient.set(source, {
                id,
                exportNames: new Set(),
              })
              return `\0${NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX}${source}`
            } else {
              if (id.includes('chakra')) {
                console.log(id, code.split('\n').slice(0, 3).join(' '))
              }
            }
          }
        }
        return
      } satisfies Plugin['resolveId']),
      async load(id, _options) {
        if (id.startsWith(`\0${NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX}`)) {
          const source = id.slice(
            `\0${NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX}`.length,
          )
          const meta = nodeModulesFilesWithUseClient.get(source)
          tinyassert(meta)
          // node_modules is already transpiled so we can parse it right away
          const code = await fs.promises.readFile(meta.id, 'utf-8')
          // const ast = await vite.parseAstAsync(code)
          // meta.exportNames = new Set(
          //   getExportNames(ast, { ignoreExportAllDeclaration: true }).exportNames,
          // )
          // we need to transform to client reference directly
          // otherwise `soruce` will be resolved infinitely by recursion
          id = wrapId(id)
          let generateId = (id) => {
            let generated = id

            return generated
          }
          const output = serverTransform(code, id, {
            id: generateId,
            importClient: 'registerClientReference',
            importFrom: 'spiceflow/dist/react/server-dom-optimized',
            importServer: 'registerServerReference',
          })

          tinyassert(output.code)

          debugTransformResult({
            envName: this.environment.name,
            transformedCode: output.code,
            id,
          })
          return output.code
        }
        return
      },
    },

    {
      name: 'browser-node-modules-use-client:dev-external',
      apply: 'serve',
      applyToEnvironment: (x) => x.name !== 'rsc',
      resolveId(source, _importer, _options) {
        if (source.startsWith(NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX)) {
          return '\0' + source
        }
        return
      },
      load(id, _options) {
        if (id.startsWith(`\0${NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX}`)) {
          const source = id.slice(
            `\0${NODE_MODULES_USE_CLIENT_VIRTUAL_PREFIX}`.length,
          )
          return `export * from "${source}"`
          // const meta = nodeModulesFilesWithUseClient.get(source);
          // debug("[parent.use-client-node-modules]", { source, meta });
          // tinyassert(meta);
          // return `export {${[...meta.exportNames].join(", ")}} from "${source}"`;
        }
        return
      },
    },
  ]
  return plugins
}

const EXTENSIONS_TO_TRANSFORM = new Set([
  '.js',
  '.jsx',
  '.cjs',
  '.cjsx',
  '.mjs',
  '.mjsx',
  '.ts',
  '.tsx',
  '.cts',
  '.ctsx',
  '.mts',
  '.mtsx',
])

function moveStaticAssets(
  output: vite.Rollup.RollupOutput,
  outDir: string,
  clientOutDir: string,
) {
  const manifestAsset = output.output.find(
    (asset) => asset.fileName === '.vite/ssr-manifest.json',
  )
  if (!manifestAsset || manifestAsset.type !== 'asset') {
    // console.log(output.output)
    throw new Error('could not find manifest')
  }
  const manifest = JSON.parse(manifestAsset.source as string)

  const processed = new Set<string>()
  for (const assets of Object.values(manifest) as string[][]) {
    for (const asset of assets) {
      const fullPath = path.join(outDir, asset.slice(1))

      // console.log({ fullPath })
      if (asset.endsWith('.js') || processed.has(fullPath)) continue
      processed.add(fullPath)
      if (!fs.existsSync(fullPath)) continue

      const relative = path.relative(outDir, fullPath)
      fs.renameSync(fullPath, path.join(clientOutDir, relative))
    }
  }
}
