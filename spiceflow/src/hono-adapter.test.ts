import { describe, expect, test } from 'vitest'
import { Spiceflow } from './spiceflow.js'
import { honoMiddleware } from './hono-adapter.js'
import { cors } from 'hono/cors'
import type { MiddlewareHandler as HonoMiddlewareHandler } from 'hono'

describe('honoMiddleware adapter', () => {
  test('hono cors middleware sets CORS headers', async () => {
    const app = new Spiceflow()
      .use(honoMiddleware(cors({ origin: 'http://example.com' })))
      .get('/api/data', () => ({ ok: true }))

    const res = await app.handle(
      new Request('http://localhost/api/data', {
        headers: { origin: 'http://example.com' },
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://example.com',
    )
  })

  test('hono cors middleware handles preflight OPTIONS', async () => {
    const app = new Spiceflow()
      .use(honoMiddleware(cors({ origin: '*' })))
      .get('/api/data', () => ({ ok: true }))

    const res = await app.handle(
      new Request('http://localhost/api/data', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://example.com',
          'access-control-request-method': 'POST',
        },
      }),
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })

  test('hono middleware can set headers via c.header()', async () => {
    const addHeader: HonoMiddlewareHandler = async (c, next) => {
      c.header('x-custom', 'hono-value')
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(addHeader))
      .get('/hello', () => 'world')

    const res = await app.handle(new Request('http://localhost/hello'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-custom')).toBe('hono-value')
  })

  test('hono middleware can return early with c.json()', async () => {
    const earlyReturn: HonoMiddlewareHandler = async (c) => {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const app = new Spiceflow()
      .use(honoMiddleware(earlyReturn))
      .get('/protected', () => 'secret')

    const res = await app.handle(new Request('http://localhost/protected'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  test('hono middleware can return early with c.text()', async () => {
    const textResponse: HonoMiddlewareHandler = async (c) => {
      return c.text('blocked', 403)
    }

    const app = new Spiceflow()
      .use(honoMiddleware(textResponse))
      .get('/hello', () => 'world')

    const res = await app.handle(new Request('http://localhost/hello'))
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('blocked')
  })

  test('hono middleware can read request headers via c.req.header()', async () => {
    let captured = ''
    const readHeader: HonoMiddlewareHandler = async (c, next) => {
      captured = c.req.header('x-api-key') || ''
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(readHeader))
      .get('/hello', () => 'world')

    await app.handle(
      new Request('http://localhost/hello', {
        headers: { 'x-api-key': 'secret-123' },
      }),
    )
    expect(captured).toBe('secret-123')
  })

  test('hono middleware can read query params via c.req.query()', async () => {
    let captured = ''
    const readQuery: HonoMiddlewareHandler = async (c, next) => {
      captured = c.req.query('name') || ''
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(readQuery))
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello?name=Tommy'))
    expect(captured).toBe('Tommy')
  })

  test('hono middleware can use c.set() and c.get() for variables', async () => {
    const setVar: HonoMiddlewareHandler = async (c, next) => {
      c.set('userId', '42')
      await next()
    }

    let gotValue = ''
    const readVar: HonoMiddlewareHandler = async (c, next) => {
      gotValue = c.get('userId') || ''
      await next()
    }

    // Two hono middlewares sharing state via c.set/c.get won't work because
    // each gets its own Context. But within a single middleware, set/get works.
    const combined: HonoMiddlewareHandler = async (c, next) => {
      c.set('userId', '42')
      gotValue = c.get('userId') || ''
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(combined))
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(gotValue).toBe('42')
  })

  test('hono middleware can modify response after await next()', async () => {
    const addTiming: HonoMiddlewareHandler = async (c, next) => {
      const start = Date.now()
      await next()
      c.header('x-response-time', `${Date.now() - start}ms`)
    }

    const app = new Spiceflow()
      .use(honoMiddleware(addTiming))
      .get('/hello', () => 'world')

    const res = await app.handle(new Request('http://localhost/hello'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-response-time')).toMatch(/\d+ms/)
  })

  test('hono middleware can use c.redirect()', async () => {
    const redirectMiddleware: HonoMiddlewareHandler = async (c) => {
      return c.redirect('/new-location')
    }

    const app = new Spiceflow()
      .use(honoMiddleware(redirectMiddleware))
      .get('/old', () => 'old page')

    const res = await app.handle(new Request('http://localhost/old'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/new-location')
  })

  test('c.env is accessible when provided via options', async () => {
    type Bindings = { API_KEY: string; DB_URL: string }

    let capturedKey = ''
    const useEnv: HonoMiddlewareHandler<{ Bindings: Bindings }> = async (
      c,
      next,
    ) => {
      capturedKey = c.env.API_KEY
      await next()
    }

    const app = new Spiceflow()
      .use(
        honoMiddleware(useEnv, {
          env: { API_KEY: 'sk-123', DB_URL: 'postgres://...' },
        }),
      )
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(capturedKey).toBe('sk-123')
  })

  test('c.env from function reads spiceflow state', async () => {
    let capturedKey = ''
    const useEnv: HonoMiddlewareHandler = async (c, next) => {
      capturedKey = c.env.API_KEY
      await next()
    }

    const app = new Spiceflow()
      .state('env', { API_KEY: 'from-state' })
      .use(
        honoMiddleware(useEnv, {
          env: (ctx) => (ctx.state as any).env,
        }),
      )
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(capturedKey).toBe('from-state')
  })

  test('c.req.raw gives the original Request', async () => {
    let isRequest = false
    const checkRaw: HonoMiddlewareHandler = async (c, next) => {
      isRequest = c.req.raw instanceof Request
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(checkRaw))
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(isRequest).toBe(true)
  })

  test('hono middleware with path-scoped .use()', async () => {
    let called = false
    const tracker: HonoMiddlewareHandler = async (c, next) => {
      called = true
      await next()
    }

    const app = new Spiceflow()
      .use('/api/*', honoMiddleware(tracker))
      .get('/api/users', () => 'users')
      .get('/health', () => 'ok')

    await app.handle(new Request('http://localhost/health'))
    expect(called).toBe(false)

    await app.handle(new Request('http://localhost/api/users'))
    expect(called).toBe(true)
  })

  test('multiple hono middlewares compose correctly', async () => {
    const order: string[] = []

    const first: HonoMiddlewareHandler = async (c, next) => {
      order.push('first-before')
      await next()
      order.push('first-after')
    }

    const second: HonoMiddlewareHandler = async (c, next) => {
      order.push('second-before')
      await next()
      order.push('second-after')
    }

    const app = new Spiceflow()
      .use(honoMiddleware(first))
      .use(honoMiddleware(second))
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(order).toEqual([
      'first-before',
      'second-before',
      'second-after',
      'first-after',
    ])
  })

  test('hono middleware mixed with spiceflow middleware', async () => {
    const order: string[] = []

    const honoMw: HonoMiddlewareHandler = async (c, next) => {
      order.push('hono')
      await next()
    }

    const app = new Spiceflow()
      .use(async (ctx, next) => {
        order.push('spiceflow-before')
        const res = await next()
        order.push('spiceflow-after')
        return res
      })
      .use(honoMiddleware(honoMw))
      .get('/hello', () => {
        order.push('handler')
        return 'world'
      })

    await app.handle(new Request('http://localhost/hello'))
    expect(order).toEqual([
      'spiceflow-before',
      'hono',
      'handler',
      'spiceflow-after',
    ])
  })

  test('c.req.method and c.req.path are correct', async () => {
    let method = ''
    let path = ''
    const inspect: HonoMiddlewareHandler = async (c, next) => {
      method = c.req.method
      path = c.req.path
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(inspect))
      .post('/api/submit', () => 'ok')

    await app.handle(
      new Request('http://localhost/api/submit', { method: 'POST' }),
    )
    expect(method).toBe('POST')
    expect(path).toBe('/api/submit')
  })

  test('c.executionCtx.waitUntil is available', async () => {
    let waitUntilCalled = false
    const useWaitUntil: HonoMiddlewareHandler = async (c, next) => {
      c.executionCtx.waitUntil(
        Promise.resolve().then(() => {
          waitUntilCalled = true
        }),
      )
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(useWaitUntil))
      .get('/hello', () => 'world')

    const res = await app.handle(new Request('http://localhost/hello'))
    expect(res.status).toBe(200)
    // waitUntil runs async, give it a tick
    await new Promise((r) => setTimeout(r, 10))
    expect(waitUntilCalled).toBe(true)
  })

  test('streaming response passes through with hono headers', async () => {
    const addHeader: HonoMiddlewareHandler = async (c, next) => {
      c.header('x-stream', 'yes')
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(addHeader))
      .get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('chunk1'))
            controller.enqueue(new TextEncoder().encode('chunk2'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: { 'content-type': 'text/plain' },
        })
      })

    const res = await app.handle(new Request('http://localhost/stream'))
    expect(res.headers.get('x-stream')).toBe('yes')
    expect(await res.text()).toBe('chunk1chunk2')
  })

  test('multiple handlers in single honoMiddleware share c.set/c.get', async () => {
    let gotValue = ''

    const setVar: HonoMiddlewareHandler = async (c, next) => {
      c.set('shared', 'hello')
      await next()
    }
    const readVar: HonoMiddlewareHandler = async (c, next) => {
      gotValue = c.get('shared') || ''
      await next()
    }

    const app = new Spiceflow()
      .use(honoMiddleware(setVar, readVar))
      .get('/hello', () => 'world')

    await app.handle(new Request('http://localhost/hello'))
    expect(gotValue).toBe('hello')
  })
})
