import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { Elysia } from './spiceflow'

test('works', async () => {
	const res = await new Elysia()
		.post('/xxx', () => 'hi')
		.handle(new Request('http://localhost/xxx', { method: 'POST' }))
	expect(res.status).toBe(200)
	expect(await res.text()).toBe(JSON.stringify('hi'))
})
test('dynamic route', async () => {
	const res = await new Elysia()
		.post('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/xxx', { method: 'POST' }))
	expect(res.status).toBe(200)
	expect(await res.text()).toBe(JSON.stringify('hi'))
})
test('GET dynamic route', async () => {
	const res = await new Elysia()
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
	expect(res.status).toBe(200)
	expect(await res.text()).toBe(JSON.stringify('hi'))
})

test('missing route is not found', async () => {
	const res = await new Elysia()
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/zxxx', { method: 'GET' }))
	expect(res.status).toBe(404)
})
test('state works', async () => {
	const res = await new Elysia()
		.state('id', '')
		.onRequest(({ store, request }) => {
			store.id = 'xxx'
		})
		.get('/get', ({ store }) => {
			expect(store.id).toBe('xxx')
		})
		.handle(new Request('http://localhost/get'))
	expect(res.status).toBe(200)
})

test('body is parsed as json', async () => {
	let body
	const res = await new Elysia()
		.state('id', '')

		.post('/post', (c) => {
			body = c.body
			// console.log({ body })
			return body
		})
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ name: 'John' })
			})
		)
	expect(res.status).toBe(200)
	expect(await res.text()).toBe(JSON.stringify({ name: 'John' }))
})

test('validate body works, request success', async () => {
	const res = await new Elysia()

		.post(
			'/post',
			({ body }) => {
				// console.log({ body })
				expect(body).toEqual({ name: 'John' })
				return 'ok'
			},
			{
				body: Type.Object({
					name: Type.String()
				})
			}
		)
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ name: 'John' })
			})
		)
	expect(res.status).toBe(200)
	expect(await res.text()).toMatchInlineSnapshot(`""ok""`)
})

test('validate body works, request fails', async () => {
	const res = await new Elysia()

		.post(
			'/post',
			({ body, redirect, error }) => {
				// console.log({ body })
				expect(body).toEqual({ name: 'John' })
			},
			{
				body: Type.Object({
					name: Type.String(),
					requiredField: Type.String()
				})
			}
		)
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ name: 'John' })
			})
		)
	expect(res.status).toBe(400)
	expect(await res.text()).toMatchInlineSnapshot(
		`"data must have required property 'requiredField'"`
	)
})

test('run onRequest', async () => {
	const res = await new Elysia()
		.onRequest(({ request }) => {
			expect(request.method).toBe('HEAD')
			return new Response('ok', { status: 401 })
		})
		.onRequest(({ request }) => {
			expect(request.method).toBe('HEAD')
			return 'second one'
		})
		.head('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/zxxx', { method: 'HEAD' }))
	expect(res.status).toBe(401)
	expect(await res.text()).toBe('ok')
})

test('run onRequest', async () => {
	const res = await new Elysia()
		.onRequest(({ request }) => {
			expect(request.method).toBe('HEAD')
			return new Response('ok', { status: 401 })
		})
		.onRequest(({ request }) => {
			expect(request.method).toBe('HEAD')
			return 'second one'
		})
		.head('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/zxxx', { method: 'HEAD' }))
	expect(res.status).toBe(401)
	expect(await res.text()).toBe('ok')
})

test('basPath works', async () => {
	const res = await new Elysia({ basePath: '/one' })
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/one/ids/xxx', { method: 'GET' }))
	expect(res.status).toBe(200)
	expect(await res.text()).toBe(JSON.stringify('hi'))
})

test('use with 2 basPath works', async () => {
	let oneOnReq = false
	let twoOnReq = false
	const app = await new Elysia()
		.use(
			new Elysia({ basePath: '/one' })
				.onRequest(({ request }) => {
					oneOnReq = true
				})
				.get('/ids/:id', ({ params }) => params.id)
		)
		.use(
			new Elysia({ basePath: '/two' })
				.onRequest((c) => {
					twoOnReq = true
				})
				.get('/ids/:id', ({ params }) => params.id)
		)

	{
		const res = await app.handle(
			new Request('http://localhost/one/ids/one')
		)
		expect(res.status).toBe(200)

		expect(await res.text()).toBe(JSON.stringify('one'))
	}
	{
		const res = await app.handle(
			new Request('http://localhost/two/ids/two')
		)
		expect(res.status).toBe(200)

		expect(await res.text()).toBe(JSON.stringify('two'))
	}
	expect(oneOnReq).toBe(true)
	expect(twoOnReq).toBe(true)
})

test('use with nested basPath works', async () => {
	const app = await new Elysia({ basePath: '/zero' })
		.use(
			new Elysia({ basePath: '/one' }).get(
				'/ids/:id',
				({ params }) => params.id
			)
		)
		.use(
			new Elysia({ basePath: '/two' }).use(
				new Elysia({ basePath: '/nested' }).get(
					'/ids/:id',
					({ params }) => params.id
				)
			)
		)
	{
		const res = await app.handle(
			new Request('http://localhost/zero/one/ids/one')
		)
		expect(res.status).toBe(200)
		expect(await res.text()).toBe(JSON.stringify('one'))
	}

	{
		const res = await app.handle(
			new Request('http://localhost/zero/two/nested/ids/nested')
		)
		expect(res.status).toBe(200)
		expect(await res.text()).toBe(JSON.stringify('nested'))
	}
})

test('errors inside basPath works', async () => {
	let onErrorTriggered = [] as string[]
	let onReqTriggered = [] as string[]
	const app = await new Elysia({ basePath: '/zero' })
		.onError(({ error }) => {
			onErrorTriggered.push('root')
			// return new Response('root', { status: 500 })
		})
		.onRequest(({ request }) => {
			onReqTriggered.push('root')
			// return new Response('root', { status: 500 })
		})

		.use(
			new Elysia({ basePath: '/two' })
				.onError(({ error }) => {
					onErrorTriggered.push('two')
					// return new Response('two', { status: 500 })
				})
				.onRequest(({ request }) => {
					onReqTriggered.push('two')
					// return new Response('two', { status: 500 })
				})
				.use(
					new Elysia({ basePath: '/nested' })
						.onError(({ error }) => {
							onErrorTriggered.push('nested')
							// return new Response('nested', { status: 500 })
						})
						.onRequest(({ request }) => {
							onReqTriggered.push('nested')
							// return new Response('nested', { status: 500 })
						})
						.get('/ids/:id', ({ params }) => {
							throw new Error('error message')
						})
				)
		)

	{
		const res = await app.handle(
			new Request('http://localhost/zero/two/nested/ids/nested')
		)
		expect(onErrorTriggered).toEqual(['nested', 'two', 'root'])
		expect(onReqTriggered).toEqual(['nested', 'two', 'root'])
		expect(res.status).toBe(500)
		expect(await res.text()).toBe('error message')
		// expect(await res.text()).toBe(JSON.stringify('nested'))
	}
})
