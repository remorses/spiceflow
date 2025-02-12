import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { Plugin } from 'vite'

type MaybePromise<T> = Promise<T> | T

export type PrerenderFn = () => MaybePromise<string[]>

export type PrerenderManifest = {
  entries: PrerenderEntry[]
}

type PrerenderEntry = {
  route: string
  html: string
  data: string
}

export function prerenderPlugin(): Plugin[] {
  return [
    {
      name: prerenderPlugin.name + ':build',
      enforce: 'post',
      apply: 'build',
      applyToEnvironment: (x) => x.name === 'ssr',
      writeBundle: {
        sequential: true,
        handler() {
          return processPrerender('dist')
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

async function processPrerender(outDir: string) {
  process.env.SPICEFLOW_PRERENDER = '1'
  console.log('▶▶▶ PRERENDER')
  const entry: typeof import('./entry.ssr.tsx') = await import(
    path.resolve(path.join(outDir, 'ssr', 'index.js'))
  )

  const routes = await entry.getPrerenderRoutes()

  const manifest: PrerenderManifest = { entries: [] }
  for (const route of routes) {
    console.log(`  • ${route.path}`)
    const url = new URL(route.path, 'https://prerender.local')
    const request = new Request(url, {
      headers: {
        'x-react-server-render-mode': 'prerender',
      },
    })
    const { rscResponse, html } = await entry.prerender(request)
    if (!rscResponse.ok) {
      console.error(`  • Failed to prerender ${route.path}`)
      throw new Error(
        `Failed to prerender ${route.path}: ${rscResponse.status} ${rscResponse.statusText}`,
      )
      continue
    }

    const htmlFile = urlPathToHtmlPath(route.path)
    const dataFile = route.path + '.rsc'
    await mkdir(path.dirname(path.join(outDir, 'client', htmlFile)), {
      recursive: true,
    })
    await writeFile(path.join(outDir, 'client', htmlFile), html)
    await writeFile(
      path.join(outDir, 'client', dataFile),
      await rscResponse.text(),
    )
    manifest.entries.push({
      route: route.path,
      html: htmlFile,
      data: dataFile,
    })
  }
  await writeFile(
    path.join(outDir, 'client', '__prerender.json'),
    JSON.stringify(manifest, null, 2),
  )
}
