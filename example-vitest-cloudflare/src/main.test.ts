// Tests running inside the Cloudflare Workers runtime (workerd) via
// @cloudflare/vitest-pool-workers. Validates Spiceflow pages, API routes,
// cloudflare:workers APIs, and D1 database behavior inside workerd.
// Uses createSpiceflowFetch for type-safe API and page testing.
import { describe, test, expect, beforeEach } from 'vitest'
import { waitUntil, env } from 'cloudflare:workers'
import { SpiceflowTestResponse } from 'spiceflow/testing'
import { createSpiceflowFetch } from 'spiceflow/client'
import { app, resetStore } from './main.js'

const f = createSpiceflowFetch(app)
const authed = createSpiceflowFetch(app, {
  headers: { authorization: 'Bearer test-token' },
})

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
    const res = await f('/')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(res.status).toBe(200)
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>Home</h1><p>Running on Workers</p></div></body></html>"`)
  })

  test('GET /about renders about page', async () => {
    const res = await f('/about')
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>About</h1><p>Cloudflare Workers + Spiceflow</p></div></body></html>"`)
  })

  test('GET /users/:id renders with params', async () => {
    const res = await f('/users/:id', { params: { id: '42' } })
    if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected SpiceflowTestResponse')
    expect(await res.text()).toMatchInlineSnapshot(`"<html lang="en"><head></head><body><div><h1>User 42</h1><p>Profile for 42</p></div></body></html>"`)
  })

  test('res.page gives raw JSX for inline snapshots', async () => {
    const res = await f('/about')
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
    const result = await f('/api/hello')
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "hello from workers",
      }
    `)
  })

  test('GET /api/greet/:name with typed params', async () => {
    const result = await f('/api/greet/:name', { params: { name: 'tommy' } })
    expect(result).toMatchInlineSnapshot(`
      {
        "greeting": "hello tommy",
      }
    `)
  })

  test('GET /api/headers reads request headers', async () => {
    const result = await f('/api/headers', {
      headers: { 'x-custom': 'foobar' },
    })
    expect(result).toMatchInlineSnapshot(`
      {
        "custom": "foobar",
        "userAgent": null,
      }
    `)
  })

  test('GET /api/redirect returns 302', async () => {
    const res = await app.handle(new Request('http://localhost/api/redirect'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toMatchInlineSnapshot(`"http://localhost/api/hello"`)
  })

  test('GET /api/env-check confirms env is available', async () => {
    const result = await f('/api/env-check')
    expect(result).toMatchInlineSnapshot(`
      {
        "hasEnv": true,
      }
    `)
  })
})

describe('CRUD routes', () => {
  test('POST /api/items creates an item', async () => {
    const res = await app.handle(new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test-item' }),
    }))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id": "1",
        "name": "test-item",
      }
    `)
  })

  test('GET /api/items/:id returns 404 for missing', async () => {
    const result = await f('/api/items/:id', { params: { id: '999' } })
    expect(result).toBeInstanceOf(Error)
  })

  test('GET /api/items lists all items', async () => {
    await app.handle(new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'alpha' }),
    }))
    await app.handle(new Request('http://localhost/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'beta' }),
    }))
    const result = await f('/api/items') as { items: { name: string }[] }
    expect(result.items.map((i) => i.name)).toMatchInlineSnapshot(`
      [
        "alpha",
        "beta",
      ]
    `)
  })
})

describe('waitUntil in route handler', () => {
  test('GET /api/wait-until calls waitUntil without error', async () => {
    const result = await f('/api/wait-until')
    expect(result).toMatchInlineSnapshot(`
      {
        "queued": true,
      }
    `)
  })
})

describe('middleware auth', () => {
  test('GET /api/admin/secret without auth returns error', async () => {
    const result = await f('/api/admin/secret')
    expect(result).toBeInstanceOf(Error)
  })

  test('GET /api/admin/secret with auth returns data', async () => {
    const result = await authed('/api/admin/secret')
    expect(result).toMatchInlineSnapshot(`
      {
        "secret": 42,
      }
    `)
  })
})

describe('D1 database', () => {
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
    const count = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
    expect(count!.count).toBe(1)
  })
})

// Type safety: invalid paths are compile errors
// @ts-expect-error - path does not exist on this app
void f('/this/path/does/not/exist')
// @ts-expect-error - missing required params
void f('/api/greet/:name')
