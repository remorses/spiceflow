// Integration tests for the Cloudflare example across build, dev, preview, and deploy.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { getPageSummary, runCommand, startServer, stopServer } from './test-server.js'

const cwd = process.cwd()
const spiceflowCwd = path.resolve(cwd, '../spiceflow')
const deployedUrl =
  process.env.CLOUDFLARE_DEPLOYED_URL ??
  'https://spiceflow-cloudflare-example-1.remorses.workers.dev'

const devPort = 46273
const previewPort = 46274

const runningServers: Array<Parameters<typeof stopServer>[0]> = []

afterEach(async () => {
  await Promise.all(runningServers.splice(0, runningServers.length).map(stopServer))
})

describe('cloudflare example', () => {
  test('build emits worker-compatible SSR output', async () => {
    await rebuildSpiceflow()
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
      usesCreateRequire: rscSsrSource.includes('createRequire(import.meta.url)'),
    }).toMatchInlineSnapshot(`
      {
        "hasRscSsrEntry": true,
        "hasSiblingSsrEntry": false,
        "usesCreateRequire": false,
      }
    `)
  })

  test('dev serves the home page', async () => {
    await rebuildSpiceflow()
    const server = await startServer({
      command: 'pnpm',
      args: ['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(devPort)],
      cwd,
    })
    runningServers.push({ process: server.process })

    const summary = await getPageSummary({ url: server.baseUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
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
    await rebuildSpiceflow()
    await runCommand({
      command: 'pnpm',
      args: ['build'],
      cwd,
    })

    const server = await startServer({
      command: 'pnpm',
      args: ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort)],
      cwd,
    })
    runningServers.push({ process: server.process })

    const summary = await getPageSummary({ url: server.baseUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
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

  test('deployed worker serves the home page', async () => {
    const summary = await getPageSummary({ url: deployedUrl })

    expect(summary).toMatchInlineSnapshot(`
      {
        "contentType": "text/html;charset=utf-8",
        "has1101": false,
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

async function rebuildSpiceflow() {
  await runCommand({
    command: 'pnpm',
    args: ['tsc', '--noCheck'],
    cwd: spiceflowCwd,
  })
}
