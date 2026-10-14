// Prerender plugin: generates .html + .rsc Flight data files at build time for
// staticPage() routes, and plain response files for staticGet() routes.
// Uses buildApp with order:"post" so it runs AFTER @vitejs/plugin-rsc
// writes the real assets manifest — no stub needed.
//
//   Node        import dist/ssr entry ──► entry.fetchHandler(request)
//   Cloudflare  no static route calls in the bundle ──► skip
//               vite.preview() runs the built Worker in workerd ──► fetch(previewUrl)
//
// Cloudflare SSR entries import `cloudflare:*` modules that Node cannot load,
// so that build asks the running Worker for its routes (token-gated endpoint)
// and fetches every page over HTTP. The files go to static assets under
// /cdn-cgi/, which visitors cannot fetch: the Worker runs middleware, then
// reads them through env.ASSETS (prerendered.workerd.ts).
import fs from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Plugin, PluginOption, PreviewServer } from 'vite'
import { formatDuration, logger } from '../logger.js'
import { resolveBuiltEntry } from '../trace-dependencies.js'
import {
  DEPLOYMENT_ID_HEADER,
  PRERENDER_ASSETS_DIR,
  PRERENDER_ORIGIN_HEADER,
  PRERENDER_ROUTES_PATH,
  PRERENDER_TOKEN_HEADER,
  RENDER_MODE_HEADER,
} from './deployment.js'
import type { PrerenderedFile, PrerenderedManifest } from './prerendered.js'

type MaybePromise<T> = Promise<T> | T

export type PrerenderFn = () => MaybePromise<string[]>

export type PrerenderManifest = {
  entries: PrerenderEntry[]
}

type PrerenderEntry = {
  route: string
  html?: string
  data?: string
  file?: string
}

type PrerenderRoute = { path: string; kind?: string }

/** Runs one prerender request against the built app. URL paths are origin-relative. */
type PrerenderFetch = (pathAndQuery: string) => Promise<Response>

const PRERENDER_CONCURRENCY = 8

// Matches `.staticPage(` and `.staticGet(` calls in bundled module code
const STATIC_ROUTE_CALL = /\.static(?:Page|Get)\s*\(/

// Spiceflow's own modules define these methods, so they never count as calls
const spiceflowPackageDir = fileURLToPath(new URL('../../', import.meta.url))

export function prerenderPlugin({
  getPrerenderToken,
  origin,
}: {
  getPrerenderToken: () => string
  /** Deployed origin that prerendered pages see in `request.url`. */
  origin?: string
}): Plugin[] {
  let ssrOutDir = 'dist/ssr'
  let rscOutDir = 'dist/rsc'
  let clientOutDir = 'dist/client'
  let isCloudflare = false
  let configFile: string | undefined
  let root = process.cwd()
  let mode = 'production'
  let base = '/'
  let envDir: string | false = root
  let hasStaticRouteCalls = false

  return [
    {
      name: prerenderPlugin.name + ':build',
      enforce: 'post',
      apply: 'build',
      // Routes are registered at runtime, so the Worker is the only exact source.
      // Starting workerd costs seconds, so skip it when no server module calls
      // staticPage() or staticGet(). Tree-shaken code is excluded, false positives
      // only cost the startup.
      generateBundle(_options, bundle) {
        if (hasStaticRouteCalls || this.environment.name === 'client') return
        hasStaticRouteCalls = Object.values(bundle).some(
          (output) =>
            output.type === 'chunk' &&
            Object.entries(output.modules).some(
              ([id, module]) =>
                !id.startsWith(spiceflowPackageDir) &&
                !!module.code &&
                STATIC_ROUTE_CALL.test(module.code),
            ),
        )
      },
      configResolved(config) {
        ssrOutDir = path.resolve(
          config.root,
          config.environments.ssr?.build?.outDir ?? 'dist/ssr',
        )
        clientOutDir = path.resolve(
          config.root,
          config.environments.client?.build?.outDir ?? 'dist/client',
        )
        rscOutDir = path.resolve(
          config.root,
          config.environments.rsc?.build?.outDir ?? 'dist/rsc',
        )
        isCloudflare = isCloudflareConfig(config.plugins)
        configFile = config.configFile
        root = config.root
        mode = config.mode
        base = config.base
        envDir = config.envDir
      },
      // order:"post" runs AFTER all other buildApp hooks — including
      // @vitejs/plugin-rsc which writes __vite_rsc_assets_manifest.js
      // at the end of its buildApp. The real manifest exists by the time
      // this handler fires, so prerendered Flight streams include correct
      // CSS/JS resource hints.
      buildApp: {
        order: 'post',
        async handler() {
          if (isCloudflare) {
            if (!hasStaticRouteCalls) {
              logger.info('no staticPage() or staticGet() calls, skipping prerender')
              return
            }
            await prerenderCloudflare({
              clientOutDir,
              rscOutDir,
              configFile,
              root,
              mode,
              base,
              envDir,
              token: getPrerenderToken(),
              origin: origin ?? (await readCloudflareRouteOrigin(rscOutDir)),
            })
            return
          }
          await prerenderNode({ ssrOutDir, clientOutDir, origin })
        },
      },
    },
    {
      name: prerenderPlugin.name + ':preview',
      apply: (_config, env) => !!env.isPreview,
      configurePreviewServer(server) {
        // Cloudflare's preview serves dist/client through its own asset handling
        // (/abc → abc.html). Rewriting to /abc.html there makes it redirect back to /abc.
        if (isCloudflareConfig(server.config.plugins)) return
        const outDir = path.resolve(
          server.config.root,
          server.config.environments.client.build.outDir,
        )

        server.middlewares.use((req, _res, next) => {
          // rewrite `/abc` to `/abc.html` since Vite "mpa" mode doesn't support this
          const url = new URL(req.url!, 'https://test.local')
          const htmlFile = urlPathToHtmlPath(url.pathname)
          if (fs.existsSync(path.join(outDir, htmlFile))) {
            req.url = htmlFile
          }
          next()
        })
      },
    },
  ]
}

function isCloudflareConfig(plugins: readonly Plugin[]): boolean {
  return plugins.some((p) => p.name.startsWith('vite-plugin-cloudflare'))
}

function urlPathToHtmlPath(pathname: string) {
  return pathname + (pathname.endsWith('/') ? 'index.html' : '.html')
}

/** The single host the built Worker is routed to (`routes` in dist/rsc/wrangler.json),
 *  so absolute URLs in prerendered pages (og:url, canonical) use the real domain.
 *  `CLOUDFLARE_ENV=preview` builds flatten the preview env, so its domain is used there. */
async function readCloudflareRouteOrigin(rscOutDir: string): Promise<string | undefined> {
  const configPath = path.join(rscOutDir, 'wrangler.json')
  const config = JSON.parse(await readFile(configPath, 'utf8').catch(() => '{}')) as {
    routes?: Array<string | { pattern: string; custom_domain?: boolean }>
  }
  const hosts = new Set<string>()
  for (const route of config.routes ?? []) {
    const pattern = typeof route === 'string' ? route : route.pattern
    const host = pattern.replace(/^https?:\/\//, '').split('/')[0]
    if (host && !host.includes('*')) hosts.add(host)
  }
  if (hosts.size === 1) return `https://${[...hosts][0]}`
  logger.warn(
    hosts.size === 0
      ? 'no custom domain in wrangler routes: prerendered pages use the local preview origin in absolute URLs. Pass `prerenderOrigin` to spiceflow() to fix.'
      : `several hosts in wrangler routes (${[...hosts].join(', ')}): pass \`prerenderOrigin\` to spiceflow() to pick the one prerendered pages use.`,
  )
  return undefined
}

async function prerenderNode(dirs: {
  ssrOutDir: string
  clientOutDir: string
  origin?: string
}) {
  const prev = globalThis.__SPICEFLOW_PRERENDER
  globalThis.__SPICEFLOW_PRERENDER = true
  try {
    const entryPath = await resolveBuiltEntry(dirs.ssrOutDir)
    const entry: typeof import('./entry.ssr.tsx') = await import(
      path.resolve(entryPath)
    )
    const routes = await entry.getPrerenderRoutes()
    await writePublicFiles({
      clientOutDir: dirs.clientOutDir,
      routes,
      fetch: (pathAndQuery) =>
        entry.fetchHandler(
          new Request(new URL(pathAndQuery, dirs.origin ?? 'https://prerender.local'), {
            headers: { [RENDER_MODE_HEADER]: 'prerender' },
          }),
        ),
    })
  } finally {
    if (prev === undefined) delete globalThis.__SPICEFLOW_PRERENDER
    else globalThis.__SPICEFLOW_PRERENDER = prev
  }
}

async function prerenderCloudflare({
  clientOutDir,
  rscOutDir,
  configFile,
  root,
  mode,
  base,
  envDir,
  token,
  origin,
}: {
  clientOutDir: string
  rscOutDir: string
  configFile: string | undefined
  root: string
  mode: string
  base: string
  envDir: string | false
  token: string
  origin?: string
}) {
  logger.info('starting the built Worker with vite preview to prerender...')
  const { preview } = await import('vite')
  const { cloudflare } = await importCloudflarePlugin(configFile ?? path.join(root, 'package.json'))
  let server: PreviewServer
  try {
    // Only the Cloudflare plugin: user plugins (and their watchers) never start.
    // Preview reads the built Worker from .wrangler/deploy/config.json, not plugin options.
    server = await preview({
      root,
      mode,
      base,
      envDir,
      configFile: false,
      logLevel: 'warn',
      preview: { port: 0, open: false, strictPort: false },
      plugins: [
        cloudflare({
          // Local bindings are enough to render; remote-only ones (AI) throw only when called.
          // Remote bindings also start a proxy session that preview close never disposes,
          // so `vite build` would never exit. https://github.com/cloudflare/workers-sdk/issues/15173
          remoteBindings: false,
          inspectorPort: false,
        }),
      ],
    })
  } catch (cause) {
    throw new Error('Failed to start vite preview for prerendering', { cause })
  }
  try {
    const previewUrl = server.resolvedUrls?.local[0]
    if (!previewUrl) throw new Error('vite preview has no local URL for prerendering')
    if (origin) logger.info(`prerendering for origin ${origin}`)

    const headers = new Headers({
      [RENDER_MODE_HEADER]: 'prerender',
      [PRERENDER_TOKEN_HEADER]: token,
    })
    if (origin) headers.set(PRERENDER_ORIGIN_HEADER, origin)
    const fetchFromWorker: PrerenderFetch = (pathAndQuery) =>
      fetch(new URL(pathAndQuery, previewUrl), { headers, redirect: 'manual' })

    const routesResponse = await fetchFromWorker(PRERENDER_ROUTES_PATH)
    if (
      !routesResponse.ok ||
      !routesResponse.headers.get('content-type')?.includes('application/json')
    ) {
      await throwPrerenderError({
        response: routesResponse,
        routePath: PRERENDER_ROUTES_PATH,
      })
    }
    const { deploymentId, routes } = (await routesResponse.json()) as {
      deploymentId: string
      routes: PrerenderRoute[]
    }
    if (routes.length) await warnIfNoAssetsBinding(rscOutDir)
    await writeWorkerOnlyFiles({
      outDir: path.join(clientOutDir, PRERENDER_ASSETS_DIR, deploymentId),
      routes,
      fetch: fetchFromWorker,
    })
  } finally {
    await server.close()
  }
}

type CloudflarePluginModule = {
  cloudflare: (options: { remoteBindings?: boolean; inspectorPort?: number | false }) => PluginOption
}

/** Imports `@cloudflare/vite-plugin` the way the user's vite config resolves it.
 *  Not a spiceflow dependency, and its exports have only an `import` condition,
 *  so `createRequire().resolve()` cannot find it. */
async function importCloudflarePlugin(from: string): Promise<CloudflarePluginModule> {
  const name = '@cloudflare/vite-plugin'
  // TODO: use module.findPackageJSON() once Node 22.14 is the minimum (Vite 8 allows 20.19)
  const packageJsonPath = createRequire(from)
    .resolve.paths(name)
    ?.map((dir) => path.join(dir, name, 'package.json'))
    .find((file) => fs.existsSync(file))
  if (!packageJsonPath) throw new Error(`Cannot find ${name} from ${from}`)
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    exports: { '.': { import: string } }
  }
  const entry = path.resolve(path.dirname(packageJsonPath), packageJson.exports['.'].import)
  return import(pathToFileURL(entry).href)
}

/** The Worker reads prerendered files through `env.ASSETS`. Without it, pages still work but render on every request. */
async function warnIfNoAssetsBinding(rscOutDir: string) {
  const config = JSON.parse(
    await readFile(path.join(rscOutDir, 'wrangler.json'), 'utf8').catch(() => '{}'),
  ) as { assets?: { binding?: string } }
  if (config.assets?.binding === 'ASSETS') return
  logger.warn(
    'staticPage() routes render on every request: add `"assets": { "binding": "ASSETS" }` to wrangler.jsonc so the Worker can serve the prerendered files.',
  )
}
async function throwPrerenderError({
  response,
  routePath,
}: {
  response: Response
  routePath: string
}): Promise<never> {
  logger.error(`failed to prerender ${routePath}`)
  const body = (await response.text()).trim().replace(/\s+/g, ' ')
  const details = body ? `\n${body}` : ''
  throw new Error(
    `Failed to prerender ${routePath}: ${response.status} ${response.statusText}${details}`,
  )
}

type RenderedRoute =
  | { kind: 'get'; route: string; body: Response }
  | { kind: 'page'; route: string; html: Response; rsc: Response }

async function renderRoute({
  route,
  fetch,
}: {
  route: PrerenderRoute
  fetch: PrerenderFetch
}): Promise<RenderedRoute> {
  if (route.kind === 'staticGet') {
    // The route path should include a file extension (e.g. /api/data.json)
    // so serveStatic can resolve the MIME type.
    const body = await fetch(route.path)
    if (!body.ok) await throwPrerenderError({ response: body, routePath: route.path })
    return { kind: 'get', route: route.path, body }
  }

  const [rsc, html] = await Promise.all([
    // __rsc returns the raw Flight stream without SSR rendering.
    fetch(`${route.path}?__rsc=`),
    // Without __rsc the Flight stream is SSR-rendered into a complete document.
    fetch(route.path),
  ])
  if (!rsc.ok) await throwPrerenderError({ response: rsc, routePath: route.path })
  if (!html.ok) await throwPrerenderError({ response: html, routePath: route.path })
  return { kind: 'page', route: route.path, html, rsc }
}

/** Renders routes with at most PRERENDER_CONCURRENCY in flight. Results keep route order. */
async function renderRoutes<T>({
  routes,
  fetch,
  write,
}: {
  routes: PrerenderRoute[]
  fetch: PrerenderFetch
  write: (rendered: RenderedRoute, index: number) => Promise<T>
}): Promise<T[]> {
  const results: T[] = []
  let next = 0
  let failed = false
  const worker = async () => {
    while (next < routes.length && !failed) {
      const index = next++
      try {
        results[index] = await write(await renderRoute({ route: routes[index]!, fetch }), index)
      } catch (error) {
        failed = true
        throw error
      }
    }
  }
  // Wait for every worker so the caller never closes the server mid-render
  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(PRERENDER_CONCURRENCY, routes.length) }, worker),
  )
  const failure = settled.find((result) => result.status === 'rejected')
  if (failure) throw failure.reason
  return results
}

/** Node: public files that serveStatic serves after middleware. */
async function writePublicFiles({
  clientOutDir,
  routes,
  fetch,
}: {
  clientOutDir: string
  routes: PrerenderRoute[]
  fetch: PrerenderFetch
}) {
  const start = performance.now()
  logger.info('prerendering static routes...')
  let deploymentId = ''

  const entries = await renderRoutes({
    routes,
    fetch,
    async write(rendered): Promise<PrerenderEntry> {
      if (rendered.kind === 'get') {
        const body = Buffer.from(await rendered.body.arrayBuffer())
        await writeOutFile({ clientOutDir, file: rendered.route, body })
        return { route: rendered.route, file: rendered.route }
      }
      deploymentId ||= rendered.rsc.headers.get(DEPLOYMENT_ID_HEADER) || ''
      const isRoot = rendered.route === '/'
      const dataFile = isRoot ? '/index.rsc' : rendered.route + '.rsc'
      const htmlFile = isRoot ? '/index.html' : rendered.route + '.html'
      await writeOutFile({ clientOutDir, file: dataFile, body: await rendered.rsc.text() })
      await writeOutFile({ clientOutDir, file: htmlFile, body: await rendered.html.text() })
      return { route: rendered.route, html: htmlFile, data: dataFile }
    },
  })
  const manifest: PrerenderManifest = { entries }

  await writeFile(
    path.join(clientOutDir, '__prerender.json'),
    JSON.stringify(manifest, null, 2),
  )
  await appendRscHeaders({ clientOutDir, manifest, deploymentId })
  logger.success(
    `prerendered ${routes.length} static routes in ${formatDuration(performance.now() - start)}`,
  )
}

/** Cloudflare: files under /cdn-cgi/ that only the Worker can read, so middleware always runs first.
 *  Names have no extension: the asset server redirects `x.html` and `index.html` to pretty URLs. */
async function writeWorkerOnlyFiles({
  outDir,
  routes,
  fetch,
}: {
  outDir: string
  routes: PrerenderRoute[]
  fetch: PrerenderFetch
}) {
  const start = performance.now()
  logger.info('prerendering static routes...')
  const store = async (response: Response, file: string): Promise<PrerenderedFile> => {
    await writeOutFile({
      clientOutDir: outDir,
      file,
      body: Buffer.from(await response.arrayBuffer()),
    })
    // Other headers are not stored: preview adds its own, and middleware runs again per request
    return { file, contentType: response.headers.get('content-type') || undefined }
  }

  const stored = await renderRoutes({
    routes,
    fetch,
    // File names use the route position, so they do not depend on which fetch finishes first
    async write(rendered, index) {
      const prefix = index + 1
      const files =
        rendered.kind === 'get'
          ? { body: await store(rendered.body, `${prefix}-body`) }
          : {
              html: await store(rendered.html, `${prefix}-html`),
              rsc: await store(rendered.rsc, `${prefix}-rsc`),
            }
      return [rendered.route, files] as const
    },
  })
  const manifest: PrerenderedManifest = { routes: Object.fromEntries(stored) }

  await writeOutFile({
    clientOutDir: outDir,
    file: 'manifest.json',
    body: JSON.stringify(manifest, null, 2),
  })
  logger.success(
    `prerendered ${routes.length} static routes in ${formatDuration(performance.now() - start)}`,
  )
}

async function writeOutFile({
  clientOutDir,
  file,
  body,
}: {
  clientOutDir: string
  file: string
  body: string | Buffer
}) {
  const outPath = path.join(clientOutDir, file)
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, body)
}

/** Hosts that serve *.rsc without the Worker (Cloudflare assets, `_headers` format)
 *  need the Flight content type, which the client checks, and the deployment id.
 *  One wildcard rule: Cloudflare allows only 100 `_headers` rules. */
async function appendRscHeaders({
  clientOutDir,
  manifest,
  deploymentId,
}: {
  clientOutDir: string
  manifest: PrerenderManifest
  deploymentId: string
}) {
  if (!manifest.entries.some((e) => e.data)) return
  const headersBody = [
    '/*.rsc',
    '  Content-Type: text/x-component;charset=utf-8',
    ...(deploymentId ? [`  ${DEPLOYMENT_ID_HEADER}: ${deploymentId}`] : []),
    '',
  ].join('\n')
  const headersPath = path.join(clientOutDir, '_headers')
  const existingHeaders = await readFile(headersPath, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return ''
      throw error
    },
  )
  await writeFile(
    headersPath,
    existingHeaders ? `${existingHeaders.trimEnd()}\n\n${headersBody}` : headersBody,
  )
}
