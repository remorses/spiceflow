// Integration tests for the Cloudflare example across build, dev, preview, and deploy.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import {
  getPageSummary,
  runCommand,
  startServer,
  stopServer,
} from './test-server.js'

const cwd = process.cwd()
const deployedUrl =
  process.env.CLOUDFLARE_DEPLOYED_URL ??
  'https://spiceflow-cloudflare-example-1.remorses.workers.dev'

const devPort = 46273
const previewPort = 46274

const runningServers: Array<Parameters<typeof stopServer>[0]> = []

afterEach(async () => {
  await Promise.all(
    runningServers.splice(0, runningServers.length).map(stopServer),
  )
})

describe('cloudflare example', () => {
  // A remote-only binding (AI) used to make the prerender step start a remote
  // proxy session that never closes, so `vite build` hung forever.
  test('build emits worker-compatible SSR output and exits with remote bindings', async () => {
    const { stdout, stderr } = await runCommand({
      command: 'pnpm',
      args: ['build'],
      cwd,
      env: { CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH: 'wrangler.remote-bindings.jsonc' },
    })
    const output = stdout + stderr

    const rscSsrEntry = path.join(cwd, 'dist/rsc/ssr/index.js')
    const siblingSsrEntry = path.join(cwd, 'dist/ssr/index.js')
    const rscSsrSource = fs.readFileSync(rscSsrEntry, 'utf8')

    expect({
      hasRscSsrEntry: fs.existsSync(rscSsrEntry),
      hasSiblingSsrEntry: fs.existsSync(siblingSsrEntry),
      usesCreateRequire: rscSsrSource.includes(
        'createRequire(import.meta.url)',
      ),
      startsRemoteBindings: output.includes('remote connection'),
      prerendered: output.includes('prerendered 2 static routes'),
    }).toMatchInlineSnapshot(`
      {
        "hasRscSsrEntry": true,
        "hasSiblingSsrEntry": false,
        "prerendered": true,
        "startsRemoteBindings": false,
        "usesCreateRequire": false,
      }
    `)
  })

  test('dev serves the home page', async () => {
    const server = await startServer({
      command: 'pnpm',
      args: [
        'exec',
        'vite',
        'dev',
        '--host',
        '127.0.0.1',
        '--port',
        String(devPort),
      ],
      cwd,
    })
    runningServers.push({ process: server.process })

    const summary = await getPageSummary({ url: server.baseUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
        "hasCssLink": true,
        "hasHeading": true,
        "hasKvText": true,
        "hasMissingModuleError": false,
        "hasRscText": true,
        "hasWorkerException": false,
        "pokemonLinks": 0,
        "status": 200,
      }
    `)
  })

  test('preview serves the home page', async () => {
    await runCommand({
      command: 'pnpm',
      args: ['build'],
      cwd,
    })

    const server = await startServer({
      command: 'pnpm',
      args: [
        'exec',
        'vite',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        String(previewPort),
      ],
      cwd,
    })
    runningServers.push({ process: server.process })

    const summary = await getPageSummary({ url: server.baseUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
        "hasCssLink": true,
        "hasHeading": true,
        "hasKvText": true,
        "hasMissingModuleError": false,
        "hasRscText": true,
        "hasWorkerException": false,
        "pokemonLinks": 0,
        "status": 200,
      }
    `)

    expect(await getPrerenderSummary(server.baseUrl)).toMatchInlineSnapshot(`
      {
        "forgedTokenPrerendered": "1",
        "htmlHasContent": true,
        "htmlMiddleware": "spiceflow",
        "htmlPrerendered": "1",
        "htmlStatus": 200,
        "redirectLocation": "/about",
        "redirectStatus": 307,
        "rscContentType": "text/x-component;charset=utf-8",
        "rscHasDeploymentId": true,
        "rscMiddleware": "spiceflow",
        "rscPrerendered": "1",
        "rscStatus": 200,
        "staticGetContentType": "application/json",
        "staticGetMiddleware": "spiceflow",
        "staticGetPrerendered": "1",
      }
    `)

    // Prerendered files live under /cdn-cgi/, never at the public page URL,
    // so Cloudflare cannot serve them before the Worker runs the middleware.
    expect({
      publicAboutHtml: fs.existsSync(path.join(cwd, 'dist/client/about.html')),
      publicHeadersFile: fs.existsSync(path.join(cwd, 'dist/client/_headers')),
      workerOnlyFiles: fs
        .readdirSync(path.join(cwd, 'dist/client/cdn-cgi/_spiceflow/prerender'), {
          recursive: true,
        })
        .map((file) => String(file).replace(/^[^/]+/, '<deployment-id>'))
        .sort(),
    }).toMatchInlineSnapshot(`
      {
        "publicAboutHtml": false,
        "publicHeadersFile": false,
        "workerOnlyFiles": [
          "<deployment-id>",
          "<deployment-id>/1-html",
          "<deployment-id>/1-rsc",
          "<deployment-id>/2-body",
          "<deployment-id>/manifest.json",
        ],
      }
    `)
  })

  test('deployed worker serves the home page', async () => {
    const summary = await getPageSummary({ url: deployedUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
        "hasCssLink": true,
        "hasHeading": true,
        "hasKvText": true,
        "hasMissingModuleError": false,
        "hasRscText": true,
        "hasWorkerException": false,
        "pokemonLinks": 12,
        "status": 200,
      }
    `)

    // Only production blocks public /cdn-cgi/ requests; vite preview serves them.
    const rsc = await fetch(new URL('/about.rsc?__rsc=', deployedUrl))
    const deploymentId = rsc.headers.get('x-spiceflow-deployment-id')
    const [manifest, storedHtml] = await Promise.all(
      ['manifest.json', '1-html'].map((file) =>
        fetch(new URL(`/cdn-cgi/_spiceflow/prerender/${deploymentId}/${file}`, deployedUrl)),
      ),
    )
    expect({
      ...(await getPrerenderSummary(deployedUrl)),
      publicManifestStatus: manifest!.status,
      publicStoredHtmlStatus: storedHtml!.status,
    }).toMatchInlineSnapshot(`
      {
        "forgedTokenPrerendered": "1",
        "htmlHasContent": true,
        "htmlMiddleware": "spiceflow",
        "htmlPrerendered": "1",
        "htmlStatus": 200,
        "publicManifestStatus": 404,
        "publicStoredHtmlStatus": 404,
        "redirectLocation": "/about",
        "redirectStatus": 307,
        "rscContentType": "text/x-component;charset=utf-8",
        "rscHasDeploymentId": true,
        "rscMiddleware": "spiceflow",
        "rscPrerendered": "1",
        "rscStatus": 200,
        "staticGetContentType": "application/json",
        "staticGetMiddleware": "spiceflow",
        "staticGetPrerendered": "1",
      }
    `)
  })
})

/** staticPage and staticGet responses must come from the prerendered files, after middleware. */
async function getPrerenderSummary(baseUrl: string) {
  const [html, rsc, staticGet, forgedToken, redirect] = await Promise.all([
    fetch(new URL('/about', baseUrl)),
    fetch(new URL('/about.rsc?__rsc=', baseUrl)),
    fetch(new URL('/build-info.json', baseUrl)),
    // A wrong prerender token must not force a live render
    fetch(new URL('/build-info.json', baseUrl), {
      headers: { 'x-spiceflow-prerender-token': 'forged' },
    }),
    fetch(new URL('/about-us', baseUrl), { redirect: 'manual' }),
  ])
  return {
    htmlStatus: html.status,
    htmlPrerendered: html.headers.get('x-spiceflow-prerendered'),
    htmlMiddleware: html.headers.get('x-middleware'),
    htmlHasContent: (await html.text()).includes('Static about page'),
    rscStatus: rsc.status,
    rscPrerendered: rsc.headers.get('x-spiceflow-prerendered'),
    rscMiddleware: rsc.headers.get('x-middleware'),
    rscContentType: rsc.headers.get('content-type'),
    rscHasDeploymentId: rsc.headers.has('x-spiceflow-deployment-id'),
    staticGetPrerendered: staticGet.headers.get('x-spiceflow-prerendered'),
    staticGetMiddleware: staticGet.headers.get('x-middleware'),
    staticGetContentType: staticGet.headers.get('content-type'),
    forgedTokenPrerendered: forgedToken.headers.get('x-spiceflow-prerendered'),
    redirectStatus: redirect.status,
    redirectLocation: redirect.headers.get('location'),
  }
}
