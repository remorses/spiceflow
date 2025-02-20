import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'
import { Spiceflow } from './spiceflow.js'
import { Type as t } from '@sinclair/typebox'

import { describe, expect, it } from 'vitest'
const app = new Spiceflow()
  .get('/', () => 'a')
  .post('/', () => 'a')
  .get('/number', () => 1)
  .get('/true', () => true)
  .get('/false', () => false)
  .post('/array', async ({ request }) => await request.json(), {
    body: z.array(z.string()),
  })
  .post('/mirror', async ({ request }) => await request.json())
  .post('/body', async ({ request }) => await request.text(), {
    body: z.string(),
  })
  .post('/zodAny', async ({ request }) => await request.json(), {
    body: z.object({ body: z.array(z.any()) }),
  })
  .delete('/empty', async ({ request }) => {
    const body = await request.text()
    return { body: body || null }
  })
  .post('/deep/nested/mirror', async ({ request }) => await request.json(), {
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
  .get('/id/:id?', ({ params: { id = 'unknown' } }) => id)

const client = createSpiceflowClient(app)

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
