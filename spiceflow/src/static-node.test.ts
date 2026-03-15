// Tests node static file serving and its priority relative to routed handlers.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test, expect } from 'vitest'

import { Spiceflow } from './spiceflow.js'
import { serveStatic } from './static-node.js'

test('directory without index falls through instead of throwing EISDIR', async () => {
  const root = await createStaticRoot({
    docs: null,
  })

  try {
    const app = new Spiceflow()
      .use(serveStatic({ root }))
      .get('/*', () => ({ route: 'catch-all' }))

    const res = await app.handle(new Request('http://localhost/docs'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "route": "catch-all",
      }
    `)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('concrete route wins over static file with the same path', async () => {
  const root = await createStaticRoot({
    hello: 'from static',
  })

  try {
    const app = new Spiceflow()
      .use(serveStatic({ root }))
      .get('/hello', () => ({ route: 'handler' }))
      .get('/*', () => ({ route: 'catch-all' }))

    const res = await app.handle(new Request('http://localhost/hello'))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "route": "handler",
      }
    `)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('static file beats root catch-all route', async () => {
  const root = await createStaticRoot({
    'logo.txt': 'from static',
  })

  try {
    const app = new Spiceflow()
      .use(serveStatic({ root }))
      .get('/*', () => ({ route: 'catch-all' }))

    const res = await app.handle(new Request('http://localhost/logo.txt'))

    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"from static"`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('HEAD serves static headers without a body', async () => {
  const root = await createStaticRoot({
    'logo.txt': 'from static',
  })

  try {
    const app = new Spiceflow().use(serveStatic({ root }))

    const res = await app.handle(
      new Request('http://localhost/logo.txt', { method: 'HEAD' }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-length')).toBe('11')
    expect(await res.text()).toBe('')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

async function createStaticRoot(files: Record<string, string | null>) {
  const root = await mkdtemp(join(tmpdir(), 'spiceflow-static-'))

  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = join(root, relativePath)
    await mkdir(join(fullPath, '..'), { recursive: true })

    if (contents === null) {
      await mkdir(fullPath, { recursive: true })
      continue
    }

    await writeFile(fullPath, contents)
  }

  return root
}
