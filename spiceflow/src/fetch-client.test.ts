import { z } from 'zod'
import { createSpiceflowFetch } from './client/fetch.ts'
import { Spiceflow } from './spiceflow.ts'
import { SpiceflowFetchError } from './client/errors.ts'

import { describe, expect, it } from 'vitest'

const app = new Spiceflow()
  .state('someState', 1 as number | undefined)
  .get('/', () => 'a')
  .post('/', () => 'a')
  .get('/number', () => 1)
  .get('/someState', ({ state }) => state.someState)
  .get('/true', () => true)
  .get('/false', () => false)
  .post('/array', async ({ request }) => await request.json(), {
    body: z.array(z.string()),
  })
  .route({
    method: 'POST',
    path: '/mirror',
    handler: async ({ request }) => await request.json(),
  })
  .route({
    method: 'POST',
    path: '/body',
    handler: async ({ request }) => await request.text(),
    body: z.string(),
  })
  .route({
    method: 'DELETE',
    path: '/empty',
    handler: async ({ request }) => {
      const body = await request.text()
      return { body: body || null }
    },
  })
  .route({
    method: 'POST',
    path: '/deep/nested/mirror',
    handler: async ({ request }) => await request.json(),
    body: z.object({
      username: z.string(),
      password: z.string(),
    }),
  })
  .get('/throws', () => {
    throw new Response('Custom error', { status: 400 })
  })
  .get('/throws-307', () => {
    throw new Response('Redirect', {
      status: 307,
      headers: { location: 'http://example.com' },
    })
  })
  .get('/throws-200', () => {
    throw new Response('this string will not be parsed as json', {
      status: 200,
    })
  })
  .get('/throws-402-json', () => {
    throw new Response(
      JSON.stringify({ reason: 'Payment required', code: 4021 }),
      {
        status: 402,
        headers: { 'content-type': 'application/json' },
      },
    )
  })
  .use(
    new Spiceflow({ basePath: '/nested' }).get('/data', ({ params }) => 'hi'),
  )
  .get(
    '/validationError',
    // @ts-expect-error
    () => {
      return 'this errors because validation is wrong'
    },
    {
      response: {
        200: z.object({
          x: z.string(),
        }),
      },
    },
  )
  .get('/dateObject', () => ({ date: new Date() }))
  .get('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'))
  .post('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'), {
    body: z.object({
      username: z.string(),
    }),
  })
  .get('/stream', function* stream() {
    yield 'a'
    yield 'b'
    yield 'c'
  })
  .get('/stream-async', async function* stream() {
    yield 'a'
    yield 'b'
    yield 'c'
  })
  .get('/stream-return', function* stream() {
    return 'a'
  })
  .get('/stream-return-async', function* stream() {
    return 'a'
  })
  .get('/id/:id', ({ params: { id } }) => id)
  .get('/items/:id/:id2', ({ params }) => params)
  .get(
    '/search',
    ({ query }) => query,
    { query: z.object({ q: z.string(), page: z.coerce.number().optional() }) },
  )

const f = createSpiceflowFetch(app)

describe('fetch client', () => {
  it('get index', async () => {
    const result = await f('/')
    if (result instanceof Error) throw result

    expect(result).toBe('a')
  })

  it('post index', async () => {
    const result = await f('/', { method: 'POST' })
    if (result instanceof Error) throw result

    expect(result).toBe('a')
  })

  it('parse number', async () => {
    const result = await f('/number')
    if (result instanceof Error) throw result

    expect(result).toEqual(1)
  })

  it('parse true', async () => {
    const result = await f('/true')
    if (result instanceof Error) throw result

    expect(result).toEqual(true)
  })

  it('parse false', async () => {
    const result = await f('/false')
    if (result instanceof Error) throw result

    expect(result).toEqual(false)
  })

  it('post array', async () => {
    const result = await f('/array', {
      method: 'POST',
      body: ['a', 'b'],
    })
    if (result instanceof Error) throw result

    expect(result).toEqual(['a', 'b'])
  })

  it('post body', async () => {
    const result = await f('/body', {
      method: 'POST',
      body: 'a',
    })
    if (result instanceof Error) throw result

    expect(result).toEqual('a')
  })

  it('post mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const result = await f('/mirror', {
      method: 'POST',
      body,
    })
    if (result instanceof Error) throw result

    expect(result).toEqual(body)
  })

  it('delete empty', async () => {
    const result = await f('/empty', { method: 'DELETE' })
    if (result instanceof Error) throw result

    expect(result).toEqual({ body: null })
  })

  it('post deep nested mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const result = await f('/deep/nested/mirror', {
      method: 'POST',
      body,
    })
    if (result instanceof Error) throw result

    expect(result).toEqual(body)
  })

  it('get nested data', async () => {
    const result = await f('/nested/data')
    if (result instanceof Error) throw result

    expect(result).toEqual('hi')
  })

  it('handles thrown response', async () => {
    const result = await f('/throws')

    expect(result).toBeInstanceOf(SpiceflowFetchError)
    if (!(result instanceof Error)) throw new Error('Expected error')
    expect(result.status).toBe(400)
    expect(result.message).toBe('Custom error')
  })

  it('handles thrown response with 307', async () => {
    const result = await f('/throws-307')

    expect(result).toBeInstanceOf(SpiceflowFetchError)
    if (!(result instanceof Error)) throw new Error('Expected error')
    expect(result.status).toBe(307)
    expect(result.message).toBe('Redirect')
  })

  it('handles thrown response with 200', async () => {
    const result = await f('/throws-200')
    if (result instanceof Error) throw result

    expect(result).toMatchInlineSnapshot(
      `"this string will not be parsed as json"`,
    )
  })

  it('surfaces json payload in error value for 402 responses', async () => {
    const result = await f('/throws-402-json')

    expect(result).toBeInstanceOf(SpiceflowFetchError)
    if (!(result instanceof SpiceflowFetchError)) throw new Error('Expected SpiceflowFetchError')
    expect(result.status).toBe(402)
    expect(result.value).toEqual({ reason: 'Payment required', code: 4021 })
  })

  it('stream', async () => {
    const result = await f('/stream')
    if (result instanceof Error) throw result

    let all = ''
    for await (const chunk of result) {
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })

  it('stream async', async () => {
    const result = await f('/stream-async')
    if (result instanceof Error) throw result

    let all = ''
    for await (const chunk of result) {
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })

  it('stream return', async () => {
    const result = await f('/stream-return')
    if (result instanceof Error) throw result

    let all = ''
    for await (const chunk of result) {
      all += chunk
    }
    expect(all).toEqual('a')
  })

  it('stream return async', async () => {
    const result = await f('/stream-return-async')
    if (result instanceof Error) throw result

    let all = ''
    for await (const chunk of result) {
      all += chunk
    }
    expect(all).toEqual('a')
  })

  it('path params', async () => {
    const result = await f('/id/:id', {
      params: { id: '123' },
    })
    if (result instanceof Error) throw result

    expect(result).toEqual('123')
  })

  it('query params', async () => {
    const result = await f('/search', {
      query: { q: 'hello', page: 1 },
    })
    if (result instanceof Error) throw result

    expect(result).toEqual({ q: 'hello', page: 1 })
  })

  it('overlapping param names', async () => {
    const result = await f('/items/:id/:id2', {
      params: { id: 'A', id2: 'B' },
    })
    if (result instanceof Error) throw result

    expect(result).toEqual({ id: 'A', id2: 'B' })
  })

  it('untyped URL falls back gracefully', async () => {
    const untypedFetch = createSpiceflowFetch(app)
    const result = await (untypedFetch as any)('/number')
    if (result instanceof Error) throw result
    expect(result).toEqual(1)
  })
})

describe('fetch client type safety', () => {
  it('requires params for parameterized paths', () => {
    // @ts-expect-error - missing required params for /id/:id
    f('/id/:id')
  })

  it('requires query when route schema demands it', () => {
    // @ts-expect-error - missing required query for /search
    f('/search')
  })

  it('requires body for POST with typed body schema', () => {
    // @ts-expect-error - missing required body for /deep/nested/mirror POST
    f('/deep/nested/mirror', { method: 'POST' })
  })

  it('allows GET without options on routes with no required fields', async () => {
    const result = await f('/number')
    if (result instanceof Error) throw result
    expect(result).toEqual(1)
  })
})

describe('fetch client with state', () => {
  it('should return state value', async () => {
    const f = createSpiceflowFetch(app, { state: { someState: 3 } })
    const result = await f('/someState')
    if (result instanceof Error) throw result
    expect(result).toBe(3)
  })
})

describe('fetch client retries', () => {
  it('should retry on 500 errors and succeed on third attempt', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-success', () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Response('Server error', { status: 500 })
      }
      return { success: true, attempts: attemptCount }
    })

    const retryFetch = createSpiceflowFetch(retryApp, { retries: 2 })
    const result = await retryFetch('/retry-success')
    if (result instanceof Error) throw result

    expect(result).toEqual({ success: true, attempts: 3 })
    expect(attemptCount).toBe(3)
  })

  it('should fail after all retries are exhausted', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-fail', () => {
      attemptCount++
      throw new Response('Server error', { status: 500 })
    })

    const retryFetch = createSpiceflowFetch(retryApp, { retries: 2 })
    const result = await retryFetch('/retry-fail')

    expect(result).toBeInstanceOf(SpiceflowFetchError)
    if (!(result instanceof Error)) throw new Error('Expected error')
    expect(result.status).toBe(500)
    expect(attemptCount).toBe(3)
  })

  it('should not retry on non-500 errors', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-400', () => {
      attemptCount++
      throw new Response('Bad request', { status: 400 })
    })

    const retryFetch = createSpiceflowFetch(retryApp, { retries: 2 })
    const result = await retryFetch('/retry-400')

    expect(result).toBeInstanceOf(SpiceflowFetchError)
    if (!(result instanceof Error)) throw new Error('Expected error')
    expect(result.status).toBe(400)
    expect(attemptCount).toBe(1)
  })
})
