import { expect, test } from 'vitest'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.js'

test('middleware can read request body text before handler reads json', async () => {
  let middlewareBody = ''

  const app = new Spiceflow()
    .use(async ({ request }, next) => {
      middlewareBody = await request.text()
      return next()
    })
    .post('/echo', ({ request }) => request.json(), {
      body: z.object({ name: z.string() }),
    })

  const res = await app.handle(
    new Request('http://localhost/echo', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tommy' }),
      headers: { 'content-type': 'application/json' },
    }),
  )

  expect(middlewareBody).toBe('{"name":"Tommy"}')
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ name: 'Tommy' })
})

test('middleware can read validated json before handler reads it again', async () => {
  let middlewareBody: any

  const app = new Spiceflow()
    .use(async ({ request }, next) => {
      middlewareBody = await request.json()
      return next()
    })
    .post('/echo', ({ request }) => request.json(), {
      body: z.object({ name: z.string() }),
    })

  const res = await app.handle(
    new Request('http://localhost/echo', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tommy' }),
      headers: { 'content-type': 'application/json' },
    }),
  )

  expect(middlewareBody).toEqual({ name: 'Tommy' })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ name: 'Tommy' })
})

test('middleware with next changes the response', async () => {
  const res = await new Spiceflow()
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      const res = await next()
      expect(res).toBeInstanceOf(Response)
      if (res) {
        res.headers.set('x-test', 'ok')
      }
      return res
    })
    .get('/ids/:id', () => 'hi')
    .post('/ids/:id', ({ params: { id } }) => id)
    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
  expect(res.headers.get('x-test')).toBe('ok')
})

test('middleware with no handlers works', async () => {
  const res = await new Spiceflow()
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      // expect(res).toBeInstanceOf(Response)
      return new Response('ok')
    })

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.text()).toEqual('ok')
})

test('middleware calling next() without returning it works', async () => {
  const res = await new Spiceflow()
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      // expect(res).toBeInstanceOf(Response)
      await next()
    })
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      // expect(res).toBeInstanceOf(Response)
      return new Response('"hi"')
    })
    .get('/ids/:id', () => 'not hi')

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})
test('middleware calling next() without returning it, calls handler', async () => {
  const res = await new Spiceflow()
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      // expect(res).toBeInstanceOf(Response)
      await next()
    })

    .get('/ids/:id', () => 'hi')

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('middleware state is not shared between requests', async () => {
  const app = await new Spiceflow()
    .state('x', -1)
    .use(async ({ request, state, query }, next) => {
      state.x = Number(query?.x || -1)
    })
    .get('/get', ({ state }) => {
      return state.x
    })
  async function first() {
    const res = await app.handle(new Request('http://localhost/get?x=1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(1)
  }
  async function second() {
    const res = await app.handle(new Request('http://localhost/get?x=2'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(2)
  }
  await Promise.all(
    new Array(100).fill(0).map((_, i) => {
      if (i % 2 === 0) return first()
      return second()
    }),
  )
})

// test('child app that adds state also adds state in the parent app', async () => {
// 	const app = new Spiceflow()
// 		.state('parentState', 'parent value')
// 		.get('/', ({ state }) => {
// 			state.childState
// 			return 'hi'
// 		})
// 		.use(
// 			new Spiceflow({ scoped: false })
// 				.state('childState', 'child value')
// 				.get('/child', ({ state }) => {
// 					return {
// 						childState: state.childState,
// 						parentState: (state as any).parentState,
// 					}
// 				}),
// 		)

// 	const res = await app.handle(
// 		new Request('http://localhost/child', { method: 'GET' }),
// 	)

// 	expect(res.status).toBe(200)
// 	const body = await res.json()
// 	expect(body).toEqual({
// 		childState: 'child value',
// 		parentState: 'parent value',
// 	})
// })

test('middleware next returns a response even for 404, if there are no routes', async () => {
  const res = await new Spiceflow()
    .use(async ({ request }, next) => {
      expect(request.method).toBe('GET')
      const res = await next()
      expect(res).toBeInstanceOf(Response)
      if (res) {
        res.headers.set('x-test', 'ok')
      }
      return res
    })
    .handle(new Request('http://localhost/non-existent', { method: 'GET' }))
  expect(res.status).toBe(404)
  expect(res.headers.get('x-test')).toBe('ok')
  expect(await res.text()).toContain('Not Found')
})

test('middleware without next runs the next middleware and handler', async () => {
  let middlewaresCalled = [] as string[]
  const res = await new Spiceflow()
    .use(async ({ request }) => {
      middlewaresCalled.push('first')
    })
    .use(async ({ request }, next) => {
      middlewaresCalled.push('second')
      const res = await next()
      if (res instanceof Response) {
        res.headers.set('x-test', 'ok')
      }
      return res
    })
    .get('/ids/:id', () => 'hi')

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(middlewaresCalled).toEqual(['first', 'second'])
  expect(await res.json()).toEqual('hi')
  expect(res.headers.get('x-test')).toBe('ok')
})
test('middleware throws response', async () => {
  let middlewaresCalled = [] as string[]
  const res = await new Spiceflow()
    .use(async ({ request }) => {
      middlewaresCalled.push('first')
    })
    .use(async ({ request }, next) => {
      middlewaresCalled.push('second')
      throw new Response('ok')
    })
    .get('/ids/:id', () => 'hi')

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(middlewaresCalled).toEqual(['first', 'second'])
  expect(await res.text()).toEqual('ok')
})

test('middleware stops other middlewares', async () => {
  let middlewaresCalled = [] as string[]
  const res = await new Spiceflow()
    .use(async ({ request }) => {
      middlewaresCalled.push('first')
      return new Response('ok')
    })
    .use(async ({ request }) => {
      middlewaresCalled.push('second')
    })
    .get('/ids/:id', () => 'hi')

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(middlewaresCalled).toEqual(['first'])
  expect(await res.text()).toEqual('ok')
})

test('calling next and then returning a new response works', async () => {
  let middlewaresCalled = [] as string[]
  const res = await new Spiceflow()
    .use(async (ctx, next) => {
      middlewaresCalled.push('first')
      await next()
      return new Response('middleware response')
    })
    .use(async (ctx, next) => {
      middlewaresCalled.push('second')
      return next()
    })
    .get('/ids/:id', () => {
      middlewaresCalled.push('handler')
      return 'handler response'
    })

    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(middlewaresCalled).toEqual(['first', 'second', 'handler'])
  expect(await res.text()).toEqual('middleware response')
})

test('middleware changes handler response body', async () => {
  let middlewaresCalled = [] as string[]
  const res = await new Spiceflow()
    .use(async (ctx, next) => {
      middlewaresCalled.push('first')
      const response = await next()
      if (response) {
        const body = await response.text()
        return new Response(body.toUpperCase(), response)
      }
      return response
    })
    .use(async (ctx, next) => {
      middlewaresCalled.push('second')
      return next()
    })
    .get('/test', () => 'hello world')
    .handle(new Request('http://localhost/test'))

  expect(res.status).toBe(200)
  expect(middlewaresCalled).toEqual(['first', 'second'])
  expect(await res.json()).toEqual('HELLO WORLD')
})

test('mutating response returned by next without returning it works', async () => {
  let handlerCalledTimes = 0
  const res = await new Spiceflow()
    .use(async (ctx, next) => {
      const response = await next()
      if (response) {
        response.headers.set('X-Custom-Header', 'Modified')
      }
      // Not returning the response, letting it pass through
    })
    .use(async (ctx, next) => {
      const response = await next()
      if (response) {
        response.headers.set('X-Another-Header', 'Added')
      }
    })
    .get('/test', () => {
      handlerCalledTimes++
      return 'hello world'
    })
    .handle(new Request('http://localhost/test'))

  expect(res.status).toBe(200)
  expect(handlerCalledTimes).toBe(1)
  expect(await res.json()).toBe('hello world')
  expect(res.headers.get('X-Custom-Header')).toBe('Modified')
  expect(res.headers.get('X-Another-Header')).toBe('Added')
})

test('middleware returning response and middleware adding header', async () => {
  const res = await new Spiceflow()
    .use(async (ctx, next) => {
      // This middleware calls next() and adds a header
      const response = await next()
      if (response) {
        response.headers.set('X-Added-Header', 'HeaderValue')
      }
      return response
    })
    .use(async (ctx, next) => {
      // This middleware returns a response directly
      return new Response('Response from first middleware', { status: 200 })
    })

    .get('/test', () => {
      // This handler should not be called
      return 'This should not be returned'
    })
    .handle(new Request('http://localhost/test'))

  expect(res.status).toBe(200)
  expect(await res.text()).toBe('Response from first middleware')
  expect(res.headers.get('X-Added-Header')).toBe('HeaderValue')
})

test('middleware returning response and middleware adding header with mounted Spiceflow', async () => {
  const res = await new Spiceflow()
    .use(async (ctx, next) => {
      // This middleware calls next() and adds a header
      const response = await next()
      if (response) {
        response.headers.set('X-Added-Header', 'HeaderValue')
      }
      return response
    })
    .use(
      new Spiceflow({ scoped: false }).use(async (ctx, next) => {
        // This middleware returns a response directly
        return new Response('Response from mounted Spiceflow', { status: 200 })
      }),
    )
    .get('/test', () => {
      // This handler should not be called
      return 'This should not be returned'
    })
    .handle(new Request('http://localhost/test'))

  expect(res.status).toBe(200)
  expect(await res.text()).toBe('Response from mounted Spiceflow')
  expect(res.headers.get('X-Added-Header')).toBe('HeaderValue')
})

test('each middleware and route is called exactly once if an error is thrown', async () => {
  const callOrder: string[] = []

  const app = new Spiceflow()
    .use(async (ctx, next) => {
      callOrder.push('middleware1')
      await next()
    })
    .use(async (ctx, next) => {
      callOrder.push('middleware2')
      await next()
    })
    .get('/test', () => {
      callOrder.push('route')
      throw new Error('Route response')
      return 'Route response'
    })
    .use(async (ctx, next) => {
      callOrder.push('middleware3')
      await next()
    })

  const res = await app.handle(new Request('http://localhost/test'))

  expect(res.status).toBe(500)
  const body = JSON.parse(await res.text())
  expect(body.message).toBe('Route response')
  expect(body.stack).toContain('Error: Route response')
  expect(callOrder).toEqual([
    'middleware1',
    'middleware2',
    'middleware3',
    'route',
  ])

  // Check that each middleware and route is called exactly once
  const counts = callOrder.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  expect(counts).toEqual({
    middleware1: 1,
    middleware2: 1,
    middleware3: 1,
    route: 1,
  })
})

test('middleware with try/finally correctly tracks operations even when errors are thrown', async () => {
  let operationCount = 0
  let finallyExecuted = false
  const createTrackingMiddleware = () => {
    return new Spiceflow({ scoped: false }).use(async (_: any, next: any) => {
      operationCount++
      try {
        await next()
      } finally {
        operationCount--
        finallyExecuted = true
      }
    })
  }

  // Test 1: Normal successful request
  operationCount = 0
  finallyExecuted = false
  const app1 = new Spiceflow()
    .use(createTrackingMiddleware())
    .get('/success', () => ({ message: 'success' }))

  const res1 = await app1.handle(new Request('http://localhost/success'))
  expect(res1.status).toBe(200)
  expect(operationCount).toBe(0) // Should be decremented back to 0
  expect(finallyExecuted).toBe(true)

  // Test 2: Route throws an error
  operationCount = 0
  finallyExecuted = false
  const app2 = new Spiceflow()
    .use(createTrackingMiddleware())
    .get('/error', () => {
      throw new Error('Route error')
    })

  const res2 = await app2.handle(new Request('http://localhost/error'))
  expect(res2.status).toBe(500)
  expect(operationCount).toBe(0) // Should be decremented back to 0
  expect(finallyExecuted).toBe(true)

  // Test 3: Route throws a Response
  operationCount = 0
  finallyExecuted = false
  const app3 = new Spiceflow()
    .use(createTrackingMiddleware())
    .get('/response', () => {
      throw new Response('Custom response', { status: 403 })
    })

  const res3 = await app3.handle(new Request('http://localhost/response'))
  expect(res3.status).toBe(403)
  expect(operationCount).toBe(0) // Should be decremented back to 0
  expect(finallyExecuted).toBe(true)

  // Test 4: Multiple concurrent requests
  operationCount = 0
  const app4 = new Spiceflow()
    .use(createTrackingMiddleware())
    .get('/concurrent', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { ok: true }
    })

  // Start 3 concurrent requests
  const concurrentRequests = Promise.all([
    app4.handle(new Request('http://localhost/concurrent')),
    app4.handle(new Request('http://localhost/concurrent')),
    app4.handle(new Request('http://localhost/concurrent')),
  ])

  // Wait a bit to ensure requests are in flight
  await new Promise((resolve) => setTimeout(resolve, 10))

  // Operation count should be 3 while requests are in flight
  expect(operationCount).toBe(3)

  // Wait for all requests to complete
  const results = await concurrentRequests
  results.forEach((res) => expect(res.status).toBe(200))

  // Operation count should be back to 0
  expect(operationCount).toBe(0)
})

test('path-scoped middleware only runs for matching wildcard path', async () => {
  let middlewareCalled = false
  const app = new Spiceflow()
    .use('/api/*', async ({ request }, next) => {
      middlewareCalled = true
      return next()
    })
    .get('/api/users', () => 'users')
    .get('/health', () => 'ok')

  middlewareCalled = false
  const res1 = await app.handle(new Request('http://localhost/api/users'))
  expect(res1.status).toBe(200)
  expect(await res1.json()).toBe('users')
  expect(middlewareCalled).toBe(true)

  middlewareCalled = false
  const res2 = await app.handle(new Request('http://localhost/health'))
  expect(res2.status).toBe(200)
  expect(await res2.json()).toBe('ok')
  expect(middlewareCalled).toBe(false)
})

test('path-scoped middleware matches the prefix itself without trailing slash', async () => {
  let middlewareCalled = false
  const app = new Spiceflow()
    .use('/api/*', async ({ request }, next) => {
      middlewareCalled = true
      return next()
    })
    .get('/api', () => 'api root')

  const res = await app.handle(new Request('http://localhost/api'))
  expect(res.status).toBe(200)
  expect(await res.json()).toBe('api root')
  expect(middlewareCalled).toBe(true)
})

test('exact path-scoped middleware only matches exact path', async () => {
  let middlewareCalled = false
  const app = new Spiceflow()
    .use('/api', async ({ request }, next) => {
      middlewareCalled = true
      return next()
    })
    .get('/api', () => 'api root')
    .get('/api/users', () => 'users')

  middlewareCalled = false
  const res1 = await app.handle(new Request('http://localhost/api'))
  expect(res1.status).toBe(200)
  expect(middlewareCalled).toBe(true)

  middlewareCalled = false
  const res2 = await app.handle(new Request('http://localhost/api/users'))
  expect(res2.status).toBe(200)
  expect(await res2.json()).toBe('users')
  expect(middlewareCalled).toBe(false)
})

test('path-scoped middleware can modify response via next()', async () => {
  const app = new Spiceflow()
    .use('/api/*', async ({ request }, next) => {
      const res = await next()
      res.headers.set('x-api-version', '2')
      return res
    })
    .get('/api/users', () => 'users')
    .get('/health', () => 'ok')

  const res1 = await app.handle(new Request('http://localhost/api/users'))
  expect(res1.headers.get('x-api-version')).toBe('2')

  const res2 = await app.handle(new Request('http://localhost/health'))
  expect(res2.headers.get('x-api-version')).toBeNull()
})

test('multiple path-scoped middlewares each fire for their own path', async () => {
  const called: string[] = []
  const app = new Spiceflow()
    .use('/api/*', async (ctx, next) => {
      called.push('api')
      return next()
    })
    .use('/admin/*', async (ctx, next) => {
      called.push('admin')
      return next()
    })
    .get('/api/users', () => 'users')
    .get('/admin/dashboard', () => 'dashboard')
    .get('/health', () => 'ok')

  called.length = 0
  await app.handle(new Request('http://localhost/api/users'))
  expect(called).toEqual(['api'])

  called.length = 0
  await app.handle(new Request('http://localhost/admin/dashboard'))
  expect(called).toEqual(['admin'])

  called.length = 0
  await app.handle(new Request('http://localhost/health'))
  expect(called).toEqual([])
})

test('path-scoped middleware mixed with global middleware', async () => {
  const called: string[] = []
  const app = new Spiceflow()
    .use(async (ctx, next) => {
      called.push('global')
      return next()
    })
    .use('/api/*', async (ctx, next) => {
      called.push('api-only')
      return next()
    })
    .get('/api/users', () => 'users')
    .get('/health', () => 'ok')

  called.length = 0
  await app.handle(new Request('http://localhost/api/users'))
  expect(called).toEqual(['global', 'api-only'])

  called.length = 0
  await app.handle(new Request('http://localhost/health'))
  expect(called).toEqual(['global'])
})

test('exact path-scoped middleware matches trailing slash', async () => {
  let middlewareCalled = false
  const app = new Spiceflow()
    .use('/api', async ({ request }, next) => {
      middlewareCalled = true
      return next()
    })
    .get('/api', () => 'api root')

  middlewareCalled = false
  const res = await app.handle(new Request('http://localhost/api/'))
  expect(res.status).toBe(200)
  expect(middlewareCalled).toBe(true)
})

test('path-scoped middleware works with basePath child app', async () => {
  let middlewareCalled = false
  const api = new Spiceflow({ basePath: '/api' })
    .use('/users/*', async (ctx, next) => {
      middlewareCalled = true
      return next()
    })
    .get('/users', () => 'users')
    .get('/health', () => 'api health')

  const app = new Spiceflow().use(api)

  middlewareCalled = false
  const res1 = await app.handle(new Request('http://localhost/api/users'))
  expect(res1.status).toBe(200)
  expect(await res1.json()).toBe('users')
  expect(middlewareCalled).toBe(true)

  middlewareCalled = false
  const res2 = await app.handle(new Request('http://localhost/api/health'))
  expect(res2.status).toBe(200)
  expect(await res2.json()).toBe('api health')
  expect(middlewareCalled).toBe(false)
})

test('path-scoped middleware can short-circuit with early return', async () => {
  const app = new Spiceflow()
    .use('/api/*', async ({ request }, next) => {
      return new Response('unauthorized', { status: 401 })
    })
    .get('/api/users', () => 'users')
    .get('/health', () => 'ok')

  const res1 = await app.handle(new Request('http://localhost/api/users'))
  expect(res1.status).toBe(401)
  expect(await res1.text()).toBe('unauthorized')

  const res2 = await app.handle(new Request('http://localhost/health'))
  expect(res2.status).toBe(200)
  expect(await res2.json()).toBe('ok')
})

test('middleware with try/finally tracks operations correctly with child apps', async () => {
  let operationCount = 0
  let finallyExecuted = false

  const createTrackingMiddleware = () => {
    return async (_: any, next: any) => {
      operationCount++
      try {
        await next()
      } finally {
        operationCount--
        finallyExecuted = true
      }
    }
  }

  // Test 1: Middleware on parent, route in child app
  operationCount = 0
  finallyExecuted = false
  const childApp1 = new Spiceflow().get('/child/route', () => ({
    message: 'from child',
  }))

  const parentApp1 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp1)

  const res1 = await parentApp1.handle(
    new Request('http://localhost/child/route'),
  )
  expect(res1.status).toBe(200)
  expect(operationCount).toBe(0)
  expect(finallyExecuted).toBe(true)

  // Test 2: Middleware on parent, error thrown in child route
  operationCount = 0
  finallyExecuted = false
  const childApp2 = new Spiceflow().get('/child/error', () => {
    throw new Error('Child route error')
  })

  const parentApp2 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp2)

  const res2 = await parentApp2.handle(
    new Request('http://localhost/child/error'),
  )
  expect(res2.status).toBe(500)
  expect(operationCount).toBe(0)
  expect(finallyExecuted).toBe(true)

  // Test 3: Multiple nested child apps with middleware
  operationCount = 0
  finallyExecuted = false
  const grandchildApp = new Spiceflow().get('/level3/route', () => ({
    level: 3,
  }))

  const childApp3 = new Spiceflow({ basePath: '/level2' }).use(grandchildApp)

  const parentApp3 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp3)

  const res3 = await parentApp3.handle(
    new Request('http://localhost/level2/level3/route'),
  )
  expect(res3.status).toBe(200)
  expect(operationCount).toBe(0)
  expect(finallyExecuted).toBe(true)

  // Test 4: Middleware on both parent and child
  operationCount = 0
  const childApp4 = new Spiceflow()
    .use(createTrackingMiddleware())
    .get('/child/both', () => ({ from: 'both' }))

  const parentApp4 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp4)

  const res4 = await parentApp4.handle(
    new Request('http://localhost/child/both'),
  )
  expect(res4.status).toBe(200)
  expect(operationCount).toBe(0) // Both middlewares increment and decrement

  // Test 5: Child app with basePath
  operationCount = 0
  finallyExecuted = false
  const childApp5 = new Spiceflow({ basePath: '/api/v1' }).get(
    '/users',
    () => ({ users: [] }),
  )

  const parentApp5 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp5)

  const res5 = await parentApp5.handle(
    new Request('http://localhost/api/v1/users'),
  )
  expect(res5.status).toBe(200)
  expect(operationCount).toBe(0)
  expect(finallyExecuted).toBe(true)

  // Test 6: Concurrent requests to child app routes
  operationCount = 0
  const childApp6 = new Spiceflow().get('/child/slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return { ok: true }
  })

  const parentApp6 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp6)

  // Start 3 concurrent requests
  const concurrentRequests = Promise.all([
    parentApp6.handle(new Request('http://localhost/child/slow')),
    parentApp6.handle(new Request('http://localhost/child/slow')),
    parentApp6.handle(new Request('http://localhost/child/slow')),
  ])

  // Wait a bit to ensure requests are in flight
  await new Promise((resolve) => setTimeout(resolve, 10))

  // Operation count should be 3 while requests are in flight
  expect(operationCount).toBe(3)

  // Wait for all requests to complete
  const results = await concurrentRequests
  results.forEach((res) => expect(res.status).toBe(200))

  // Operation count should be back to 0
  expect(operationCount).toBe(0)

  // Test 7: Child app throws Response
  operationCount = 0
  finallyExecuted = false
  const childApp7 = new Spiceflow().get('/child/response', () => {
    throw new Response('Custom child response', { status: 403 })
  })

  const parentApp7 = new Spiceflow()
    .use(createTrackingMiddleware())
    .use(childApp7)

  const res7 = await parentApp7.handle(
    new Request('http://localhost/child/response'),
  )
  expect(res7.status).toBe(403)
  expect(operationCount).toBe(0)
  expect(finallyExecuted).toBe(true)
})
