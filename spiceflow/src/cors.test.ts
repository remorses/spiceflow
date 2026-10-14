import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { cors } from './cors.js'
import { Spiceflow } from './spiceflow.js'

function request(path, method = 'GET') {
  return new Request(`http://localhost/${path}`, {
    method,
    headers: {
      Origin: 'http://example.com',
    },
  })
}
describe('cors middleware', () => {
  const app = new Spiceflow()
    .state('x', 1)
    .use(cors())
    .get('/ids/:id', ({ state }) => {
      state.x
      // @ts-expect-error
      state.y
      return 'hi'
    })
    .post('/ids/:id', ({ params: { id } }) => id)

  test('GET request returns correct response and CORS headers', async () => {
    const res = await app.handle(request('ids/xxx'))
    expect(res.status).toBe(200)
    expect(await res.json()).toBe('hi')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  test('OPTIONS request returns correct CORS headers', async () => {
    const res = await app.handle(request('ids/xxx', 'OPTIONS'))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET,HEAD,PUT,POST,DELETE,PATCH',
    )
  })

  test('POST request respects CORS and returns correct response', async () => {
    const res = await app.handle(request('ids/123', 'POST'))
    expect(res.status).toBe(200)
    expect(await res.json()).toBe('123')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

test('CORS headers are set when an error is thrown', async () => {
  let errorRouteCallCount = 0
  const errorApp = new Spiceflow()
    .use(cors())
    .get('/error', () => {
      errorRouteCallCount++
      throw new Error('Test error')
    })
    .onError(() => {})

  const res = await errorApp.handle(request('error'))
  expect(res.status).toBe(500)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(await res.text()).toContain('Test error')
  expect(errorRouteCallCount).toBe(1)
})

test('CORS headers are set for OPTIONS request when an error is thrown', async () => {
  let errorRouteCallCount = 0
  const errorApp = new Spiceflow()
    .use(cors())
    .options('/error', () => {
      errorRouteCallCount++
      throw new Error('Test error')
    })
    .onError(() => {})

  const res = await errorApp.handle(request('error', 'OPTIONS'))
  expect(res.status).toBe(204)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
    'GET,HEAD,PUT,POST,DELETE,PATCH',
  )
  expect(errorRouteCallCount).toBe(1)
})

test('CORS headers are set when an error is thrown in middleware', async () => {
  let errorRouteCallCount = 0
  const errorApp = new Spiceflow()
    .use(cors())
    .use((c) => {
      throw new Error('middleware error')
    })
    .get('/error', () => {
      errorRouteCallCount++
      throw new Error('Test error')
    })
    .onError(() => {})

  const res = await errorApp.handle(request('error'))
  expect(res.status).toBe(500)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(await res.text()).toContain('middleware error')
  expect(errorRouteCallCount).toBe(0)
})

describe('cors registered after a middleware that throws', () => {
  let routeCalls = 0
  const app = new Spiceflow()
    .use(({ request }) => {
      if (!request.headers.get('authorization')) {
        throw new Response('unauthorized', { status: 401 })
      }
    })
    .use(({ request, redirect }) => {
      if (new URL(request.url).pathname === '/old') throw redirect('/new')
    })
    .use(cors({ origin: ['http://example.com'], credentials: true }))
    .get('/me', () => {
      routeCalls++
      return { ok: true }
    })
    .get('/old', () => 'old')

  const headers = (extra: Record<string, string> = {}) => ({
    Origin: 'http://example.com',
    ...extra,
  })

  test('401 from the auth middleware has CORS headers', async () => {
    const res = await app.handle(
      new Request('http://localhost/me', { headers: headers() }),
    )
    expect({
      status: res.status,
      body: await res.text(),
      origin: res.headers.get('Access-Control-Allow-Origin'),
      credentials: res.headers.get('Access-Control-Allow-Credentials'),
      vary: res.headers.get('Vary'),
    }).toMatchInlineSnapshot(`
      {
        "body": "unauthorized",
        "credentials": "true",
        "origin": "http://example.com",
        "status": 401,
        "vary": "Origin",
      }
    `)
    expect(routeCalls).toBe(0)
  })

  test('preflight without authorization succeeds', async () => {
    const res = await app.handle(
      new Request('http://localhost/me', {
        method: 'OPTIONS',
        headers: headers({
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization',
        }),
      }),
    )
    expect({
      status: res.status,
      origin: res.headers.get('Access-Control-Allow-Origin'),
      methods: res.headers.get('Access-Control-Allow-Methods'),
      allowHeaders: res.headers.get('Access-Control-Allow-Headers'),
    }).toMatchInlineSnapshot(`
      {
        "allowHeaders": "authorization",
        "methods": "GET,HEAD,PUT,POST,DELETE,PATCH",
        "origin": "http://example.com",
        "status": 204,
      }
    `)
    expect(routeCalls).toBe(0)
  })

  test('thrown redirect has CORS headers', async () => {
    const res = await app.handle(
      new Request('http://localhost/old', {
        headers: headers({ authorization: 'Bearer x' }),
      }),
    )
    expect({
      status: res.status,
      location: res.headers.get('location'),
      origin: res.headers.get('Access-Control-Allow-Origin'),
    }).toMatchInlineSnapshot(`
      {
        "location": "/new",
        "origin": "http://example.com",
        "status": 307,
      }
    `)
  })

  test('authorized request reaches the route with CORS headers', async () => {
    const res = await app.handle(
      new Request('http://localhost/me', {
        headers: headers({ authorization: 'Bearer x' }),
      }),
    )
    expect({
      status: res.status,
      body: await res.json(),
      origin: res.headers.get('Access-Control-Allow-Origin'),
    }).toMatchInlineSnapshot(`
      {
        "body": {
          "ok": true,
        },
        "origin": "http://example.com",
        "status": 200,
      }
    `)
    expect(routeCalls).toBe(1)
  })
})

test('sub-app cors covers errors thrown by a parent middleware', async () => {
  const api = new Spiceflow({ basePath: '/api' })
    .use(cors())
    .post('/hello', () => ({ ok: true }))
  const app = new Spiceflow()
    .use(({ request }) => {
      if (!request.headers.get('authorization')) {
        throw new Response('unauthorized', { status: 401 })
      }
    })
    .use(api)

  const preflight = await app.handle(
    new Request('http://localhost/api/hello', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    }),
  )
  const post = await app.handle(
    new Request('http://localhost/api/hello', {
      method: 'POST',
      headers: { Origin: 'http://example.com' },
    }),
  )
  expect({
    preflight: [preflight.status, preflight.headers.get('Access-Control-Allow-Origin')],
    post: [post.status, post.headers.get('Access-Control-Allow-Origin')],
  }).toMatchInlineSnapshot(`
    {
      "post": [
        401,
        "*",
      ],
      "preflight": [
        204,
        "*",
      ],
    }
  `)
})

test('sub-app with cors handles OPTIONS even when parent app has no cors', async () => {
  const subApp = new Spiceflow({ basePath: '/api' })
    .use(cors())
    .post('/hello', () => ({ ok: true }))

  const mainApp = new Spiceflow().use(subApp)

  const res = await mainApp.handle(
    new Request('http://localhost/api/hello', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    }),
  )

  expect(res.status).toBe(204)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
    'GET,HEAD,PUT,POST,DELETE,PATCH',
  )
})

test('sub-app cors does not leak to neighboring base path prefix', async () => {
  const subApp = new Spiceflow({ basePath: '/api' })
    .use(cors())
    .post('/hello', () => ({ ok: true }))

  const mainApp = new Spiceflow().use(subApp)

  const res = await mainApp.handle(
    new Request('http://localhost/apiary/hello', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    }),
  )

  expect(res.status).toBe(404)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe(null)
})

test('CORS preserves headers on HEAD responses without adding a body', async () => {
  const app = new Spiceflow().use(cors()).get('/hello', () => ({ ok: true }))

  const res = await app.handle(request('hello', 'HEAD'))

  expect(res.status).toBe(200)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.text()).toBe('')
})
