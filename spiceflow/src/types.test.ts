import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, Spiceflow } from './spiceflow.js'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'
import { Prettify } from './elysia-fork/types.js'

test('use on non Spiceflow return', async () => {
	function nonSpiceflowReturn() {
		return new Spiceflow() as any
	}
	const app = new Spiceflow()
		.use(nonSpiceflowReturn())
		.post('/xxx', () => 'hi')
	const res = await app.handle(
		new Request('http://localhost/xxx', { method: 'POST' }),
	)

	let client = createSpiceflowClient(app)

	type ClientType = Prettify<typeof client>
	// @ts-expect-error
	client.something

	// client.xxx.post()
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual('hi')
})
