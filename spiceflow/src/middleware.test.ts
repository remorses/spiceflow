import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, Spiceflow } from './spiceflow.js'
import { z } from 'zod'

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
    .post('/ids/:id', ({ params: { id } }) => id, {
      params: z.object({ id: z.string() }),
    })
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
  expect(await res.text()).toMatchInlineSnapshot(`"{"message":"Route response"}"`)
  expect(callOrder).toEqual(['middleware1', 'middleware2', 'middleware3', 'route'])
  
  // Check that each middleware and route is called exactly once
  const counts = callOrder.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  expect(counts).toEqual({
    middleware1: 1,
    middleware2: 1,
    middleware3: 1,
    route: 1
  })
})

