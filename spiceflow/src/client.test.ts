import { createSpiceflowClient } from './client'
import { Elysia, t } from './spiceflow'

import { describe, expect, it } from 'vitest'

const randomObject = {
	a: 'a',
	b: 2,
	c: true,
	d: false,
	e: null,
	f: new Date(0)
}
const randomArray = [
	'a',
	2,
	true,
	false,
	null,
	new Date(0),
	{ a: 'a', b: 2, c: true, d: false, e: null, f: new Date(0) }
]

const app = new Elysia()
	.get('/', () => 'a')
	.post('/', () => 'a')
	.get('/number', () => 1)
	.get('/true', () => true)
	.get('/false', () => false)
	.post('/array', ({ body }) => body, {
		body: t.Array(t.String())
	})
	.post('/mirror', ({ body }) => body)
	.post('/body', ({ body }) => body, {
		body: t.String()
	})
	.delete('/empty', ({ body }) => ({ body: body ?? null }))
	.post('/deep/nested/mirror', ({ body }) => body, {
		body: t.Object({
			username: t.String(),
			password: t.String()
		})
	})

	.use(new Elysia({ basePath: '/nested' }).get('/data', ({ params }) => 'hi'))
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
				200: t.Object({
					x: t.String()
				})
			}
		}
	)

	.post('/date', ({ body: { date } }) => date, {
		body: t.Object({
			date: t.Date()
		})
	})
	.get('/dateObject', () => ({ date: new Date() }))
	.get('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'))
	.post(
		'/redirect',
		({ redirect }) => redirect('http://localhost:8083/true'),
		{
			body: t.Object({
				username: t.String()
			})
		}
	)
	.get('/formdata', () => ({
		image: Bun.file('./test/kyuukurarin.mp4')
	}))

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
		const { data, error } = await client.index.get()

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
		expect(data).toEqual('a')
	})
	it('stream return async', async () => {
		const { data } = await client['stream-return-async'].get()
		// console.log(data)
		expect(data).toEqual('a')
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
