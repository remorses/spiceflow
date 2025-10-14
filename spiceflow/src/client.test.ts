import { z } from 'zod'
import { createSpiceflowClient } from './client/index.ts'
import { Spiceflow } from './spiceflow.ts'
import { SpiceflowFetchError } from './client/errors.ts'

import { describe, expect, it, vi } from 'vitest'
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
    method: 'POST',
    path: '/zodAny',
    handler: async ({ request }) => await request.json(),
    body: z.object({ body: z.array(z.any()) }),
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
    throw new Response(JSON.stringify({ reason: 'Payment required', code: 4021 }), {
      status: 402,
      headers: { 'content-type': 'application/json' },
    })
  })
  .use(
    new Spiceflow({ basePath: '/nested' }).get('/data', ({ params }) => 'hi'),
  )
  // .get('/error', ({ error }) => error("I'm a teapot", 'Kirifuji Nagisa'), {
  // 	response: {
  // 		200: t.Void(),
  // 		418: t.Literal('Kirifuji Nagisa'),
  // 		420: t.Literal('Snoop Dogg')
  // 	}
  // })
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

  // TODO ajv does not accept dates for some reason
  // .post('/date', ({ body: { date } }) => date, {
  // 	body: t.Object({
  // 		date: t.Date()
  // 	})
  // })
  .get('/dateObject', () => ({ date: new Date() }))
  .get('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'))
  .post('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'), {
    body: z.object({
      username: z.string(),
    }),
  })
  // .get('/formdata', () => ({
  // 	image: Bun.file('./test/kyuukurarin.mp4')
  // }))

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

const client = createSpiceflowClient(app)

describe('client can pass state to app', () => {
  const client = createSpiceflowClient(app, { state: { someState: 3 } })
  it('should return state value 3', async () => {
    const { data } = await client.someState.get({})
    expect(data).toBe(3)
  })
})

describe('client', () => {
  it('get index', async () => {
    const { data, error } = await client.index.get({})

    expect(data).toBe('a')
    expect(error).toBeNull()
  })

  it('post index', async () => {
    const { data, error } = await client.index.post()

    expect(data).toBe('a')
    expect(error).toBeNull()
  })

  it('parse number', async () => {
    const { data } = await client.number.get()

    expect(data).toEqual(1)
  })

  it('parse true', async () => {
    const { data } = await client.true.get()

    expect(data).toEqual(true)
  })

  it('parse false', async () => {
    const { data } = await client.false.get()

    expect(data).toEqual(false)
  })

  it.todo('parse object with date', async () => {
    const { data } = await client.dateObject.get()

    expect(data?.date).toBeInstanceOf(Date)
  })

  it('post array', async () => {
    const { data } = await client.array.post(['a', 'b'])

    expect(data).toEqual(['a', 'b'])
  })

  it('post body', async () => {
    const { data } = await client.body.post('a')

    expect(data).toEqual('a')
  })

  it('post mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const { data } = await client.mirror.post(body)

    expect(data).toEqual(body)
  })

  it('delete empty', async () => {
    const { data } = await client.empty.delete()

    expect(data).toEqual({ body: null })
  })

  it('post deep nested mirror', async () => {
    const body = { username: 'A', password: 'B' }

    const { data } = await client.deep.nested.mirror.post(body)

    expect(data).toEqual(body)
  })

  it('get nested data', async () => {
    const { data } = await client.nested.data.get()

    expect(data).toEqual('hi')
  })

  it('handles thrown response', async () => {
    const { data, error } = await client.throws.get()

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(400)
    expect(error?.message).toBe('Custom error')
  })

  it('handles thrown response with 307', async () => {
    const { data, error } = await client['throws-307'].get()

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(307)
    expect(error?.message).toBe('Redirect')
  })

  it('handles thrown response with 200', async () => {
    const { data, error } = await client['throws-200'].get()
    // @ts-expect-error data should not be AsyncGenerator type
    data satisfies AsyncGenerator
    expect(data).toMatchInlineSnapshot(
      `"this string will not be parsed as json"`,
    )
    expect(error).toMatchInlineSnapshot(`null`)
  })

  it('surfaces json payload in error value for 402 responses', async () => {
    const { data, error } = await client['throws-402-json'].get()

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(402)
    expect(error).toBeInstanceOf(SpiceflowFetchError)
    expect(error?.value).toEqual({ reason: 'Payment required', code: 4021 })
  })

  it('stream ', async () => {
    const { data } = await client.stream.get()
    let all = ''
    for await (const chunk of data!) {
      // console.log(chunk)
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })
  it('stream async', async () => {
    const { data } = await client['stream-async'].get()
    let all = ''
    for await (const chunk of data!) {
      // console.log(chunk)
      all += chunk + '-'
    }
    expect(all).toEqual('a-b-c-')
  })

  it('stream return', async () => {
    const { data } = await client['stream-return'].get()
    let all = ''
    for await (const chunk of data!) {
      all += chunk
    }
    expect(all).toEqual('a')
  })
  it('stream return async', async () => {
    const { data } = await client['stream-return-async'].get()
    let all = ''
    for await (const chunk of data!) {
      all += chunk
    }
    expect(all).toEqual('a')
  })
  it('post zodAny', async () => {
    const body = [{ key: 'value' }, 123, 'string', true, null]

    const { data } = await client.zodAny.post({ body })

    expect(data).toEqual({ body })
  })

  // it('handle error', async () => {
  // 	const { data, error } = await client.error.get()

  // 	let value

  // 	if (error)
  // 		switch (error.status) {
  // 			case 418:
  // 				value = error.value
  // 				break

  // 			case 420:
  // 				value = error.value
  // 				break
  // 		}

  // 	expect(data).toBeNull()
  // 	expect(value).toEqual('Kirifuji Nagisa')
  // })
})

describe('client as promise', () => {
  it('should work with async client', async () => {
    const asyncClient = Promise.resolve(client)
    const { data } = await (await asyncClient).mirror.post({ test: 'value' })
    expect(data).toEqual({ test: 'value' })
  }, 200)
})

describe('client retries', () => {
  it('should retry on 500 errors and succeed on third attempt', async () => {
    let attemptCount = 0
    const retryApp = new Spiceflow().get('/retry-success', () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Response('Server error', { status: 500 })
      }
      return { success: true, attempts: attemptCount }
    })

    const retryClient = createSpiceflowClient(retryApp, { retries: 2 })
    const { data, error } = await retryClient['retry-success'].get()

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

    const retryClient = createSpiceflowClient(retryApp, { retries: 2 })
    const { data, error } = await retryClient['retry-fail'].get()

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

    const retryClient = createSpiceflowClient(retryApp, { retries: 2 })
    const { data, error } = await retryClient['retry-400'].get()

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.status).toBe(400)
    expect(attemptCount).toBe(1)
  })
})
