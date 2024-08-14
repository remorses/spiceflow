import { test, describe, expect } from 'vitest'
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
test('group works', async () => {
	let oneOnReq = false
	let twoOnReq = false
	const app = await new Elysia()
		.group('/one', () => {
			return new Elysia()
				.onRequest(({ request }) => {
					oneOnReq = true
				})
				.get('/ids/:id', ({ params }) => params.id)
		})
		.group('/two', () => {
			return new Elysia()
				.onRequest((c) => {
					twoOnReq = true
				})
				.get('/ids/:id', ({ params }) => params.id)
		})

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
