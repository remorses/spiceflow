import { z } from 'zod'
import { createSpiceflowFetch } from './client/fetch.ts'
import { Spiceflow } from './spiceflow.tsx'
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
    const { data, error } = await f('/')

    expect(data).toBe('a')
    expect(error).toBeNull()
  })

  it('post index', async () => {
    const { data, error } = await f('/', { method: 'POST' })

    expect(data).toBe('a')
    expect(error).toBeNull()
  })

  it('parse number', async () => {
    const { data } = await f('/number')

    expect(data).toEqual(1)
  })

  it('parse true', async () => {
    const { data } = await f('/true')

    expect(data).toEqual(true)
  })

  it('parse false', async () => {
    const { data } = await f('/false')

    expect(data).toEqual(false)
  })

  it('post array', async () => {
    const { data } = await f('/array', {
      method: 'POST',
      body: ['a', 'b'],
    })

    expect(data).toEqual(['a', 'b'])
  })

  it('post body', async () => {
    const { data } = await f('/body', {
      method: 'POST',
      body: 'a',
    })

    expect(data).toEqual('a')
  })

  it('post mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const { data } = await f('/mirror', {
      method: 'POST',
      body,
    })

    expect(data).toEqual(body)
  })

  it('delete empty', async () => {
    const { data } = await f('/empty', { method: 'DELETE' })

    expect(data).toEqual({ body: null })
  })

  it('post deep nested mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const { data } = await f('/deep/nested/mirror', {
      method: 'POST',
      body,
    })

    expect(data).toEqual(body)
  })

  it('get nested data', async () => {
    const { data } = await f('/nested/data')

    expect(data).toEqual('hi')
  })

  it('handles thrown response', async () => {
    const { data, error } = await f('/throws')

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(400)
    expect(error?.message).toBe('Custom error')
  })

  it('handles thrown response with 307', async () => {
    const { data, error } = await f('/throws-307')

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(307)
    expect(error?.message).toBe('Redirect')
  })

  it('handles thrown response with 200', async () => {
    const { data, error } = await f('/throws-200')

    expect(data).toMatchInlineSnapshot(
      `"this string will not be parsed as json"`,
    )
    expect(error).toMatchInlineSnapshot(`null`)
  })

  it('surfaces json payload in error value for 402 responses', async () => {
    const { data, error } = await f('/throws-402-json')

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(402)
    expect(error).toBeInstanceOf(SpiceflowFetchError)
    expect(error?.value).toEqual({ reason: 'Payment required', code: 4021 })
  })

  it('stream', async () => {
    const { data } = await f('/stream')
    let all = ''
    for await (const chunk of data!) {
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })

  it('stream async', async () => {
    const { data } = await f('/stream-async')
    let all = ''
    for await (const chunk of data!) {
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })

  it('stream return', async () => {
    const { data } = await f('/stream-return')
    let all = ''
    for await (const chunk of data!) {
      all += chunk
    }
    expect(all).toEqual('a')
  })

  it('stream return async', async () => {
    const { data } = await f('/stream-return-async')
    let all = ''
    for await (const chunk of data!) {
      all += chunk
    }
    expect(all).toEqual('a')
  })

  it('path params', async () => {
    const { data } = await f('/id/:id', {
      params: { id: '123' },
    })

    expect(data).toEqual('123')
  })

  it('query params', async () => {
    const { data } = await f('/search', {
      query: { q: 'hello', page: 1 },
    })

    expect(data).toEqual({ q: 'hello', page: 1 })
  })

  it('overlapping param names', async () => {
    const { data } = await f('/items/:id/:id2', {
      params: { id: 'A', id2: 'B' },
    })

    expect(data).toEqual({ id: 'A', id2: 'B' })
  })

  it('untyped URL falls back gracefully', async () => {
    const untypedFetch = createSpiceflowFetch(app)
    const { data } = await (untypedFetch as any)('/number')
    expect(data).toEqual(1)
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
    const { data } = await f('/number')
    expect(data).toEqual(1)
  })
})

describe('fetch client with state', () => {
  it('should return state value', async () => {
    // @ts-expect-error state type not exposed on Config (pre-existing issue, works at runtime)
    const f = createSpiceflowFetch(app, { state: { someState: 3 } })
    const { data } = await f('/someState')
    expect(data).toBe(3)
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
    const { data, error } = await retryFetch('/retry-success')

    expect(error).toBeNull()
    expect(data).toEqual({ success: true, attempts: 3 })
    expect(attemptCount).toBe(3)
  })

  it('should fail after all retries are exhausted', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-fail', () => {
      attemptCount++
      throw new Response('Server error', { status: 500 })
    })

    const retryFetch = createSpiceflowFetch(retryApp, { retries: 2 })
    const { data, error } = await retryFetch('/retry-fail')

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(500)
    expect(attemptCount).toBe(3)
  })

  it('should not retry on non-500 errors', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-400', () => {
      attemptCount++
      throw new Response('Bad request', { status: 400 })
    })

    const retryFetch = createSpiceflowFetch(retryApp, { retries: 2 })
    const { data, error } = await retryFetch('/retry-400')

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(400)
    expect(attemptCount).toBe(1)
  })
})
