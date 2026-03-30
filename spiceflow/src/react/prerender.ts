// Prerender plugin: generates .rsc Flight data files at build time for
// staticPage() routes, and plain response files for staticGet() routes.
// Uses buildApp with order:"post" so it runs AFTER @vitejs/plugin-rsc
// writes the real assets manifest — no stub needed.
import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

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

export function prerenderPlugin(): Plugin[] {
  let ssrOutDir = 'dist/ssr'
  let clientOutDir = 'dist/client'
  let isCloudflare = false

  return [
    {
      name: prerenderPlugin.name + ':build',
      enforce: 'post',
      apply: 'build',
      configResolved(config) {
        ssrOutDir = config.environments.ssr?.build?.outDir ?? 'dist/ssr'
        clientOutDir =
          config.environments.client?.build?.outDir ?? 'dist/client'
        isCloudflare = config.plugins.some((p: any) =>
          p.name?.startsWith('vite-plugin-cloudflare:'),
        )
      },
      // order:"post" runs AFTER all other buildApp hooks — including
      // @vitejs/plugin-rsc which writes __vite_rsc_assets_manifest.js
      // at the end of its buildApp. The real manifest exists by the time
      // this handler fires, so prerendered Flight streams include correct
      // CSS/JS resource hints.
      buildApp: {
        order: 'post',
        async handler() {
          if (isCloudflare) return
          await processPrerender({ ssrOutDir, clientOutDir })
        },
      },
    },
    {
      name: prerenderPlugin.name + ':preview',
      apply: (_config, env) => !!env.isPreview,
      configurePreviewServer(server) {
        const outDir = path.resolve(server.config.build.outDir, 'client')

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

function urlPathToHtmlPath(pathname: string) {
  return pathname + (pathname.endsWith('/') ? 'index.html' : '.html')
}

async function processPrerender(dirs: {
  ssrOutDir: string
  clientOutDir: string
}) {
  const prev = (globalThis as any).__SPICEFLOW_PRERENDER
  ;(globalThis as any).__SPICEFLOW_PRERENDER = true
  try {
    console.log('▶▶▶ PRERENDER')
    const entry: typeof import('./entry.ssr.tsx') = await import(
      path.resolve(path.join(dirs.ssrOutDir, 'index.js'))
    )

    const routes = await entry.getPrerenderRoutes()
    const manifest: PrerenderManifest = { entries: [] }
    if (routes.length === 0) {
      await writeFile(
        path.join(dirs.clientOutDir, '__prerender.json'),
        JSON.stringify(manifest, null, 2),
      )
      return
    }
    for (const route of routes) {
      console.log(`  • ${route.path}`)
      const prerenderHeaders = {
        'x-react-server-render-mode': 'prerender',
      }

      if (route.kind === 'staticGet') {
        // staticGet: run the handler and write the raw response body to disk.
        // The route path should include a file extension (e.g. /api/data.json)
        // so serveStatic can resolve the MIME type.
        const url = new URL(route.path, 'https://prerender.local')
        const response = await entry.fetchHandler(
          new Request(url, { headers: prerenderHeaders }),
        )
        if (!response.ok) {
          console.error(`  • Failed to prerender ${route.path}`)
          throw new Error(
            `Failed to prerender ${route.path}: ${response.status} ${response.statusText}`,
          )
        }
        const outFile = route.path
        const outPath = path.join(dirs.clientOutDir, outFile)
        await mkdir(path.dirname(outPath), { recursive: true })
        const buf = Buffer.from(await response.arrayBuffer())
        await writeFile(outPath, buf)

        manifest.entries.push({
          route: route.path,
          file: outFile,
        })
        continue
      }

      // Fetch RSC Flight data — __rsc makes fetchHandler return the raw
      // Flight stream without SSR rendering.
      const rscUrl = new URL(route.path, 'https://prerender.local')
      rscUrl.searchParams.set('__rsc', '')
      const rscResponse = await entry.fetchHandler(
        new Request(rscUrl, { headers: prerenderHeaders }),
      )
      if (!rscResponse.ok) {
        console.error(`  • Failed to prerender ${route.path}`)
        throw new Error(
          `Failed to prerender ${route.path}: ${rscResponse.status} ${rscResponse.statusText}`,
        )
      }

      // Fetch full HTML — without __rsc, fetchHandler SSR-renders the
      // Flight stream into a complete HTML document.
      const htmlUrl = new URL(route.path, 'https://prerender.local')
      const htmlResponse = await entry.fetchHandler(
        new Request(htmlUrl, { headers: prerenderHeaders }),
      )
      if (!htmlResponse.ok) {
        console.error(`  • Failed to prerender ${route.path}`)
        throw new Error(
          `Failed to prerender ${route.path}: ${htmlResponse.status} ${htmlResponse.statusText}`,
        )
      }

      const isRoot = route.path === '/'
      const dataFile = isRoot ? '/index.rsc' : route.path + '.rsc'
      const htmlFile = isRoot ? '/index.html' : route.path + '.html'

      const dataPath = path.join(dirs.clientOutDir, dataFile)
      await mkdir(path.dirname(dataPath), { recursive: true })
      await writeFile(dataPath, await rscResponse.text())

      const htmlPath = path.join(dirs.clientOutDir, htmlFile)
      await mkdir(path.dirname(htmlPath), { recursive: true })
      await writeFile(htmlPath, await htmlResponse.text())

      manifest.entries.push({
        route: route.path,
        html: htmlFile,
        data: dataFile,
      })
    }
    await writeFile(
      path.join(dirs.clientOutDir, '__prerender.json'),
      JSON.stringify(manifest, null, 2),
    )
  } finally {
    if (prev === undefined) delete (globalThis as any).__SPICEFLOW_PRERENDER
    else (globalThis as any).__SPICEFLOW_PRERENDER = prev
  }
}
