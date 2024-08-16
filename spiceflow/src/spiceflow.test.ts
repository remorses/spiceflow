import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, Spiceflow } from './spiceflow'

test('works', async () => {
	const res = await new Spiceflow()
		.post('/xxx', () => 'hi')
		.handle(new Request('http://localhost/xxx', { method: 'POST' }))
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual('hi')
})
test('dynamic route', async () => {
	const res = await new Spiceflow()
		.post('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/xxx', { method: 'POST' }))
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual('hi')
})
test('GET dynamic route', async () => {
	const res = await new Spiceflow()
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual('hi')
})

test('missing route is not found', async () => {
	const res = await new Spiceflow()
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/zxxx', { method: 'GET' }))
	expect(res.status).toBe(404)
})
test('state works', async () => {
	const res = await new Spiceflow()
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
	const res = await new Spiceflow()
		.state('id', '')

		.post('/post', async (c) => {
			body = await c.request.json()
			// console.log({request})
			return body
		})
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({ name: 'John' }),
			}),
		)
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual({ name: 'John' })
})

test('validate body works, request success', async () => {
	const res = await new Spiceflow()

		.post(
			'/post',
			async ({ request }) => {
				// console.log({request})
				let body = await request.json()
				expect(body).toEqual({ name: 'John' })
				return 'ok'
			},
			{
				body: Type.Object({
					name: Type.String(),
				}),
			},
		)
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({ name: 'John' }),
			}),
		)
	expect(res.status).toBe(200)
	expect(await res.text()).toMatchInlineSnapshot(`""ok""`)
})

test('validate body works, request fails', async () => {
	const res = await new Spiceflow()

		.post(
			'/post',
			async ({ request, redirect }) => {
				// console.log({request})
				let body = await request.json()
				expect(body).toEqual({ name: 'John' })
			},
			{
				body: Type.Object({
					name: Type.String(),
					requiredField: Type.String(),
				}),
			},
		)
		.handle(
			new Request('http://localhost/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({ name: 'John' }),
			}),
		)
	expect(res.status).toBe(422)
	expect(await res.text()).toMatchInlineSnapshot(
		`"data must have required property 'requiredField'"`,
	)
})

test('run onRequest', async () => {
	const res = await new Spiceflow()
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
	const res = await new Spiceflow()
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
	const res = await new Spiceflow({ basePath: '/one' })
		.get('/ids/:id', () => 'hi')
		.handle(new Request('http://localhost/one/ids/xxx', { method: 'GET' }))
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual('hi')
})

test('basPath works with use', async () => {
	let app = new Spiceflow({ basePath: '/one' }).use(
		new Spiceflow({})
			.get('/two', () => 'hi')
			.use(
				new Spiceflow({ basePath: '/three' }).get('/four', () => 'hi'),
			),
	)
	{
		const res = await app.handle(
			new Request('http://localhost/one/two', { method: 'GET' }),
		)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual('hi')
	}
	{
		const res = await app.handle(
			new Request('http://localhost/one/three/four', { method: 'GET' }),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual('hi')
	}
})

test('getRouteAndParents', async () => {
	let app = new Spiceflow({ basePath: '/one' })
		.get('/ids/:id', () => 'hi')
		.use(
			new Spiceflow({ basePath: '/two' }).use(
				new Spiceflow({ basePath: '/three' }).get('/four', () => 'hi'),
			),
		)

	let routers = bfs(app['routerTree'])
	let last = routers[routers.length - 1]

	expect(app['getRouteAndParents'](last).map((x) => x.prefix))
		.toMatchInlineSnapshot(`
			[
			  "/three",
			  "/two",
			  "/one",
			]
		`)
})
test('use with 2 basPath works', async () => {
	let oneOnReq = false
	let twoOnReq = false
	let onReqCalled: string[] = []
	const app = await new Spiceflow()
		.onRequest(({ request }) => {
			onReqCalled.push('root')
		})
		.use(
			new Spiceflow({ basePath: '/one' })
				.onRequest(({ request }) => {
					oneOnReq = true
					onReqCalled.push('one')
				})
				.get('/ids/:id', ({ params }) => params.id),
		)
		.use(
			new Spiceflow({ basePath: '/two' })
				.onRequest((c) => {
					twoOnReq = true
					onReqCalled.push('two')
				})
				.get('/ids/:id', ({ params }) => params.id),
		)

	{
		const res = await app.handle(
			new Request('http://localhost/one/ids/one'),
		)
		expect(res.status).toBe(200)

		expect(await res.json()).toEqual('one')
	}
	expect(onReqCalled).toEqual(['root', 'one'])
	{
		const res = await app.handle(
			new Request('http://localhost/two/ids/two'),
		)
		expect(res.status).toBe(200)

		expect(await res.json()).toEqual('two')
	}
	expect(oneOnReq).toBe(true)
	expect(twoOnReq).toBe(true)
})

test('use with nested basPath works', async () => {
	const app = await new Spiceflow({ basePath: '/zero' })
		.use(
			new Spiceflow({ basePath: '/one' }).get(
				'/ids/:id',
				({ params }) => params.id,
			),
		)
		.use(
			new Spiceflow({ basePath: '/two' }).use(
				new Spiceflow({ basePath: '/nested' }).get(
					'/ids/:id',
					({ params }) => params.id,
				),
			),
		)
	{
		const res = await app.handle(
			new Request('http://localhost/zero/one/ids/one'),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual('one')
	}

	{
		const res = await app.handle(
			new Request('http://localhost/zero/two/nested/ids/nested'),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual('nested')
	}
})

test('errors inside basPath works', async () => {
	let onErrorTriggered = [] as string[]
	let onReqTriggered = [] as string[]
	const app = await new Spiceflow({ basePath: '/zero' })
		.onError(({ error }) => {
			onErrorTriggered.push('root')
			// return new Response('root', { status: 500 })
		})
		.onRequest(({ request }) => {
			onReqTriggered.push('root')
			// return new Response('root', { status: 500 })
		})

		.use(
			new Spiceflow({ basePath: '/two' })
				.onError(({ error }) => {
					onErrorTriggered.push('two')
					// return new Response('two', { status: 500 })
				})
				.onRequest(({ request }) => {
					onReqTriggered.push('two')
					// return new Response('two', { status: 500 })
				})
				.use(
					new Spiceflow({ basePath: '/nested' })
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
						}),
				),
		)

	{
		const res = await app.handle(
			new Request('http://localhost/zero/two/nested/ids/nested'),
		)
		expect(onErrorTriggered).toEqual(['root', 'two', 'nested'])
		expect(onReqTriggered).toEqual(['root', 'two', 'nested'])
		expect(res.status).toBe(500)
		expect(await res.text()).toBe('error message')
		// expect(await res.json()).toEqual('nested'))
	}
})
