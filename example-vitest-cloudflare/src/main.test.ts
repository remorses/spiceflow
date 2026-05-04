// Tests running inside the Cloudflare Workers runtime (workerd) via
// @cloudflare/vitest-pool-workers. Validates Spiceflow pages, API routes,
// cloudflare:workers APIs, and D1 database behavior inside workerd.
import { describe, test, expect, beforeEach } from 'vitest'
import { waitUntil, env } from 'cloudflare:workers'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { app, resetStore } from './main.js'

function req(path: string, init?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, init))
}

beforeEach(() => {
  resetStore()
})

describe('cloudflare:workers APIs', () => {
  test('waitUntil is a callable function', () => {
    expect(typeof waitUntil).toBe('function')
    expect(() => waitUntil(Promise.resolve('done'))).not.toThrow()
  })

  test('env is defined', () => {
    expect(env).toBeDefined()
  })
})

describe('pages', () => {
  test('GET / renders home page with layout', async () => {
    const res = await req('/')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Running on Workers</p></div></body></html>"`)
  })

  test('GET /about renders about page', async () => {
    const res = await req('/about')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>About</h1><p>Cloudflare Workers + Spiceflow</p></div></body></html>"`)
  })

  test('GET /users/:id renders with params', async () => {
    const res = await req('/users/42')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>User 42</h1><p>Profile for 42</p></div></body></html>"`)
  })

  test('res.page gives raw JSX for inline snapshots', async () => {
    const res = await req('/about')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.page).toMatchInlineSnapshot(`
      <div>
        <h1>
          About
        </h1>
        <p>
          Cloudflare Workers + Spiceflow
        </p>
      </div>
    `)
  })
})

describe('API routes', () => {
  test('GET /api/hello', async () => {
    const res = await req('/api/hello')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "message": "hello from workers",
      }
    `)
  })

  test('GET /api/greet/:name', async () => {
    const res = await req('/api/greet/tommy')
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "greeting": "hello tommy",
      }
    `)
  })

  test('GET /api/headers reads request headers', async () => {
    const res = await req('/api/headers', {
      headers: { 'x-custom': 'foobar' },
    })
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "custom": "foobar",
        "userAgent": null,
      }
    `)
  })

  test('GET /api/redirect returns 302', async () => {
    const res = await req('/api/redirect')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toMatchInlineSnapshot(`"http://localhost/api/hello"`)
  })

  test('GET /api/env-check confirms env is available', async () => {
    const res = await req('/api/env-check')
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "hasEnv": true,
      }
    `)
  })
})

describe('CRUD routes', () => {
  test('POST /api/items creates an item', async () => {
    const res = await req('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test-item' }),
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id": "1",
        "name": "test-item",
      }
    `)
  })

  test('GET /api/items/:id returns 404 for missing', async () => {
    const res = await req('/api/items/999')
    expect(res.status).toBe(404)
  })

  test('GET /api/items lists all items', async () => {
    await req('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'alpha' }),
    })
    await req('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'beta' }),
    })
    const res = await req('/api/items')
    const body = (await res.json()) as { items: { name: string }[] }
    expect(body.items.map((i) => i.name)).toMatchInlineSnapshot(`
      [
        "alpha",
        "beta",
      ]
    `)
  })
})

describe('waitUntil in route handler', () => {
  test('GET /api/wait-until calls waitUntil without error', async () => {
    const res = await req('/api/wait-until')
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "queued": true,
      }
    `)
  })
})

describe('middleware auth', () => {
  test('GET /api/admin/secret without auth returns 401', async () => {
    const res = await req('/api/admin/secret')
    expect(res.status).toBe(401)
    expect(await res.text()).toMatchInlineSnapshot(`"unauthorized"`)
  })

  test('GET /api/admin/secret with auth returns data', async () => {
    const res = await req('/api/admin/secret', {
      headers: { authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "secret": 42,
      }
    `)
  })
})

describe('D1 database', () => {
  // Migrations are applied automatically by the setup file (apply-migrations.ts)
  // which reads SQL files from the migrations/ folder via readD1Migrations()

  test('insert and query a user', async () => {
    await env.DB.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
      .bind('Alice', 'alice@test.com')
      .run()

    const result = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind('alice@test.com')
      .first()

    expect(result).toMatchObject({ name: 'Alice', email: 'alice@test.com' })
  })

  test('D1 starts clean each run (count is always 1)', async () => {
    // Alice was inserted in the previous test within this run.
    // If D1 leaked across runs the count would accumulate.
    // Run `pnpm test` multiple times — this should always be 1.
    const count = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
    expect(count!.count).toBe(1)
  })
})
