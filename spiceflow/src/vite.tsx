import assert from 'node:assert'
import fs from 'node:fs'
import url from 'node:url'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import {
  type Manifest,
  type Plugin,
  PluginOption,
  type RunnableDevEnvironment,
  UserConfig,
  ViteDevServer,
  createRunnableDevEnvironment,
  createServerModuleRunner,
  defineConfig,
} from 'vite'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import reactServerDOM from './vite-jacob.js'
import { serverTransform, clientTransform } from 'unplugin-rsc'
import { noramlizeClientReferenceId } from './react/utils/normalize.js'

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
  const clientModules = new Map<string, string>()
  const serverModules = new Map<string, string>()
  let buildScan = false

  let command: string = ''
  let server: ViteDevServer

  return [
    react(),

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
        if (id === '\0virtual:react-manifest') {
          debugTransformResult({
            envName: this.environment.name,
            transformedCode: code,
            id,
          })
        }
        let result = code
        const ext = id.slice(id.lastIndexOf('.'))
        if (
          EXTENSIONS_TO_TRANSFORM.has(ext) &&
          code.match(/['"]use (client|server)['"]/g)
        ) {
          const mod = await server.moduleGraph.getModuleByUrl(id)
          let generateId = (filename, directive) => {
            let id = ''
            if (command === 'build') {
              id = makeHash(filename)
            } else {
              id = noramlizeClientReferenceId(filename, server, mod)
            }
            console.log('generateId', id)
            if (directive === 'use server') {
              serverModules.set(filename, id)
              return id
            }

            clientModules.set(filename, id)
            return id
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
          } else if (
            this.environment.name === 'client' ||
            this.environment.name === 'ssr'
          ) {
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
      configureServer(_server) {
        server = _server
      },
      config: () => ({
        appType: 'custom',
        environments: {
          client: {
            optimizeDeps: {
              include: [
                'react-dom/client',
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
              outDir: 'dist/ssr',
              rollupOptions: {
                input: { index: 'spiceflow/dist/react/entry.ssr' },
              },
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
              // noExternal: ['spiceflow'],
            },
            dev: {
              createEnvironment(name, config) {
                return createRunnableDevEnvironment(name, config, {
                  hot: false, // TODO investigate how to enable hmr for server
                })
              },
            },
            build: {
              outDir: 'dist/rsc',
              ssr: true,
              rollupOptions: {
                input: { index: 'spiceflow/dist/react/entry.rsc' },
              },
            },
          },
        },
        builder: {
          sharedPlugins: true,
          async buildApp(builder) {
            buildScan = true
            await builder.build(builder.environments.rsc)
            buildScan = false
            await builder.build(builder.environments.rsc)
            await builder.build(builder.environments.client)
            await builder.build(builder.environments.ssr)
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
      },
    },
    createVirtualPlugin('build-client-references', () => {
      const code = Array.from(clientModules.keys())
        .map(
          (id) => `${JSON.stringify(id)}: () => import(${JSON.stringify(id)}),`,
        )
        .join('\n')

      return `export default {${code}}`
    }),
    createVirtualPlugin('build-server-references', () => {
      const code = Array.from(serverModules.keys())
        .map(
          (id) => `${JSON.stringify(id)}: () => import(${JSON.stringify(id)}),`,
        )
        .join('\n')
      return `export default {${code}}`
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

export function debugTransformResult({ transformedCode, envName, id }) {
  // If load() returns undefined, fall back to original code

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
