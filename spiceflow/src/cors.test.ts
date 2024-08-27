import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, Spiceflow } from './spiceflow.js'
import { cors } from './cors.js'
import { z } from 'zod'

function request(path, method = 'GET') {
	return new Request(`http://localhost/${path}`, {
		method,
		headers: {
			Origin: 'http://example.com',
		},
	})
}
describe('cors middleware', () => {
	const app = new Spiceflow()
		.use(cors())
		.get('/ids/:id', () => 'hi')
		.post('/ids/:id', ({ params: { id } }) => id, {
			params: z.object({ id: z.string() }),
		})

	test('GET request returns correct response and CORS headers', async () => {
		const res = await app.handle(request('ids/xxx'))
		expect(res.status).toBe(200)
		expect(await res.json()).toBe('hi')
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
	})

	test('OPTIONS request returns correct CORS headers', async () => {
		const res = await app.handle(request('ids/xxx', 'OPTIONS'))
		expect(res.status).toBe(204)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
			'GET,HEAD,PUT,POST,DELETE,PATCH',
		)
	})

	test('POST request respects CORS and returns correct response', async () => {
		const res = await app.handle(request('ids/123', 'POST'))
		expect(res.status).toBe(200)
		expect(await res.json()).toBe('123')
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
	})
})
