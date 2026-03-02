import { expect, test } from 'vitest'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.js'
import { req } from './utils.js'

test('body is parsed as json', async () => {
  let name = ''
  const res = await new Spiceflow()
    .state('id', '')

    .post(
      '/post',
      async (c) => {
        const body = await c.request.json()
        name = body.name
        // @ts-expect-error
        body.nonExistingField
        return {
          name,
          nameEcho: body.name,
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
      async (c) => {
        const body = await c.request.json()
        name = body.name
        // @ts-expect-error
        body.nonExistingField
        return {
          name,
          nameEcho: body.name,
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
