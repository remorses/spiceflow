// Prerender plugin: generates .html + .rsc Flight data files at build time for
// staticPage() routes, and plain response files for staticGet() routes.
// Uses buildApp with order:"post" so it runs AFTER @vitejs/plugin-rsc
// writes the real assets manifest — no stub needed.
//
//   Node        import dist/ssr entry ──► entry.fetchHandler(request)
//   Cloudflare  vite.preview() runs the built Worker in workerd ──► fetch(previewUrl)
//
// Cloudflare SSR entries import `cloudflare:*` modules that Node cannot load,
// so that build asks the running Worker for its routes (token-gated endpoint)
// and fetches every page over HTTP. Cloudflare static assets then serve the
// files before the Worker runs, and the `_headers` file sets their headers.
import fs from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin, PreviewServer } from 'vite'
import { formatDuration, logger } from '../logger.js'
import { resolveBuiltEntry } from '../trace-dependencies.js'
import {
  DEPLOYMENT_ID_HEADER,
  PRERENDER_ORIGIN_HEADER,
  PRERENDER_ROUTES_PATH,
  PRERENDER_TOKEN_HEADER,
  RENDER_MODE_HEADER,
} from './deployment.js'

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
  let configFile: string | false | undefined
  let root = process.cwd()
  let mode = 'production'

  return [
    {
      name: prerenderPlugin.name + ':build',
      enforce: 'post',
      apply: 'build',
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
            await prerenderCloudflare({
              clientOutDir,
              configFile,
              root,
              mode,
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
    await writePrerenderedRoutes({
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
  configFile,
  root,
  mode,
  token,
  origin,
}: {
  clientOutDir: string
  configFile: string | false | undefined
  root: string
  mode: string
  token: string
  origin?: string
}) {
  logger.info('starting the built Worker with vite preview to prerender...')
  const { preview } = await import('vite')
  let server: PreviewServer
  try {
    server = await preview({
      root,
      mode,
      configFile,
      logLevel: 'warn',
      preview: { port: 0, open: false, strictPort: false },
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
    const routes = (await routesResponse.json()) as PrerenderRoute[]
    await writePrerenderedRoutes({ clientOutDir, routes, fetch: fetchFromWorker })
  } finally {
    await server.close()
  }
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

async function writePrerenderedRoutes({
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
  const manifest: PrerenderManifest = { entries: [] }
  let deploymentId = ''

  for (const route of routes) {
    if (route.kind === 'staticGet') {
      // staticGet: run the handler and write the raw response body to disk.
      // The route path should include a file extension (e.g. /api/data.json)
      // so serveStatic can resolve the MIME type.
      const response = await fetch(route.path)
      if (!response.ok) {
        await throwPrerenderError({ response, routePath: route.path })
      }
      await writeOutFile({
        clientOutDir,
        file: route.path,
        body: Buffer.from(await response.arrayBuffer()),
      })
      manifest.entries.push({ route: route.path, file: route.path })
      continue
    }

    // __rsc returns the raw Flight stream without SSR rendering.
    const rscResponse = await fetch(`${route.path}?__rsc=`)
    if (!rscResponse.ok) {
      await throwPrerenderError({ response: rscResponse, routePath: route.path })
    }
    deploymentId ||= rscResponse.headers.get(DEPLOYMENT_ID_HEADER) || ''

    // Without __rsc the Flight stream is SSR-rendered into a complete document.
    const htmlResponse = await fetch(route.path)
    if (!htmlResponse.ok) {
      await throwPrerenderError({ response: htmlResponse, routePath: route.path })
    }

    const isRoot = route.path === '/'
    const dataFile = isRoot ? '/index.rsc' : route.path + '.rsc'
    const htmlFile = isRoot ? '/index.html' : route.path + '.html'
    await writeOutFile({ clientOutDir, file: dataFile, body: await rscResponse.text() })
    await writeOutFile({ clientOutDir, file: htmlFile, body: await htmlResponse.text() })
    manifest.entries.push({ route: route.path, html: htmlFile, data: dataFile })
  }

  await writeFile(
    path.join(clientOutDir, '__prerender.json'),
    JSON.stringify(manifest, null, 2),
  )
  await appendRscHeaders({ clientOutDir, manifest, deploymentId })
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
