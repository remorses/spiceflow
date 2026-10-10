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
  test('build emits worker-compatible SSR output', async () => {
    await runCommand({
      command: 'pnpm',
      args: ['build'],
      cwd,
    })

    const rscSsrEntry = path.join(cwd, 'dist/rsc/ssr/index.js')
    const siblingSsrEntry = path.join(cwd, 'dist/ssr/index.js')
    const rscSsrSource = fs.readFileSync(rscSsrEntry, 'utf8')

    expect({
      hasRscSsrEntry: fs.existsSync(rscSsrEntry),
      hasSiblingSsrEntry: fs.existsSync(siblingSsrEntry),
      usesCreateRequire: rscSsrSource.includes(
        'createRequire(import.meta.url)',
      ),
    }).toMatchInlineSnapshot(`
      {
        "hasRscSsrEntry": true,
        "hasSiblingSsrEntry": false,
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

    // staticPage routes are prerendered into dist/client. run_worker_first
    // runs the middleware, then serveAssets returns the prerendered file
    // (asset responses carry an etag, Worker renders do not).
    const [html, rsc, redirect] = await Promise.all([
      fetch(new URL('/about', server.baseUrl)),
      fetch(new URL('/about.rsc?__rsc=', server.baseUrl)),
      fetch(new URL('/about-us', server.baseUrl), { redirect: 'manual' }),
    ])
    expect({
      htmlStatus: html.status,
      htmlFromAssets: html.headers.has('etag'),
      htmlMiddleware: html.headers.get('x-middleware'),
      htmlHasContent: (await html.text()).includes('Static about page'),
      rscStatus: rsc.status,
      rscFromAssets: rsc.headers.has('etag'),
      rscMiddleware: rsc.headers.get('x-middleware'),
      rscContentType: rsc.headers.get('content-type'),
      rscHasDeploymentId: rsc.headers.has('x-spiceflow-deployment-id'),
      redirectStatus: redirect.status,
      redirectLocation: redirect.headers.get('location'),
    }).toMatchInlineSnapshot(`
      {
        "htmlFromAssets": true,
        "htmlHasContent": true,
        "htmlMiddleware": "spiceflow",
        "htmlStatus": 200,
        "redirectLocation": "/about",
        "redirectStatus": 307,
        "rscContentType": "text/x-component;charset=utf-8",
        "rscFromAssets": true,
        "rscHasDeploymentId": true,
        "rscMiddleware": "spiceflow",
        "rscStatus": 200,
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
  })
})
