import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { Spiceflow } from './spiceflow'
import { req } from './utils'
import { z } from 'zod'

test('body is parsed as json', async () => {
	let name = ''
	const res = await new Spiceflow()
		.state('id', '')

		.post(
			'/post',
			(c) => {
				name = c.body.name
				// @ts-expect-error
				c.body.nonExistingField
				return {
					name,
					nameEcho: c.body.name,
					// add: 3,
				}
			},
			{
				body: z.object({
					name: z.string(),
				}),
				response: z.object({
					name: z.string(),
					nameEcho: z.string(),
				}),
			},
		)
		.post(
			'/post2',
			(c) => {
				name = c.body.name
				// @ts-expect-error
				c.body.nonExistingField
				return {
					name,
					nameEcho: c.body.name,
				}
			},
			{
				body: z.object({
					name: z.string(),
				}),
				response: {
					200: z.object({
						name: z.string(),
						nameEcho: z.string(),
					}),
					400: z.object({
						errorMessage: z.string(),
					}),
				},
			},
		)
		.handle(
			req('/post', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({ name: 'John' }),
			}),
		)
	expect(res.status).toBe(200)
	expect(await res.json()).toEqual({ name: 'John', nameEcho: 'John' })
})
