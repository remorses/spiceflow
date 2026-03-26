// Tests node static file serving and its priority relative to routed handlers.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
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

test('relative static root serves nested asset paths', async () => {
  const root = await createStaticRoot(
    {
      'assets/logo.txt': 'from static',
    },
    process.cwd(),
  )

  const relativeRoot = basename(root)

  try {
    const app = new Spiceflow()
      .use(serveStatic({ root: relativeRoot }))
      .get('/*', () => ({ route: 'catch-all' }))

    const res = await app.handle(
      new Request('http://localhost/assets/logo.txt'),
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"from static"`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

async function createStaticRoot(
  files: Record<string, string | null>,
  parentDir = tmpdir(),
) {
  const root = await mkdtemp(join(parentDir, 'spiceflow-static-'))

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

test('static response includes mime type headers', async () => {
  const root = await createStaticRoot(
    {
      'assets/app.js': 'console.log("ok")',
    },
    process.cwd(),
  )

  try {
    const app = new Spiceflow().use(serveStatic({ root: basename(root) }))

    const res = await app.handle(new Request('http://localhost/assets/app.js'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(
      'text/javascript; charset=utf-8',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('decoded URI paths resolve to matching static files', async () => {
  const root = await createStaticRoot({
    '炎.txt': 'unicode file',
  })

  try {
    const app = new Spiceflow().use(serveStatic({ root }))

    const res = await app.handle(new Request('http://localhost/%E7%82%8E.txt'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await res.text()).toMatchInlineSnapshot(`"unicode file"`)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('encoded backslash traversal falls through instead of serving files', async () => {
  const root = await createStaticRoot({
    'hello.txt': 'from static',
  })

  try {
    const app = new Spiceflow()
      .use(serveStatic({ root }))
      .get('/*', () => ({ route: 'catch-all' }))

    const res = await app.handle(
      new Request('http://localhost/%2e%2e%5Chello.txt'),
    )

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

test('onFound and onNotFound callbacks receive resolved asset paths', async () => {
  const root = await createStaticRoot({
    'hello.txt': 'from static',
  })
  const found: string[] = []
  const missing: string[] = []

  try {
    const app = new Spiceflow()
      .use(
        serveStatic({
          root,
          onFound(path) {
            found.push(path)
          },
          onNotFound(path) {
            missing.push(path)
          },
        }),
      )
      .get('/*', () => ({ route: 'catch-all' }))

    await app.handle(new Request('http://localhost/hello.txt'))
    await app.handle(new Request('http://localhost/missing.txt'))

    expect({ found, missing }).toMatchInlineSnapshot(`
      {
        "found": [
          "${root}/hello.txt",
        ],
        "missing": [
          "${root}/missing.txt",
        ],
      }
    `)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
