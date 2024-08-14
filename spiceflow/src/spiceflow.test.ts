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
