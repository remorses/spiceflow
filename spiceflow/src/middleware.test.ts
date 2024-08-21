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
