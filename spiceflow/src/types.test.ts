import { test, describe, expect } from 'vitest'
import { Type } from '@sinclair/typebox'
import { bfs, Spiceflow } from './spiceflow.js'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'
import { Prettify } from './types.js'

test('`use` on non Spiceflow return', async () => {
  function nonSpiceflowReturn() {
    return new Spiceflow() as any
  }
  const app = new Spiceflow().use(nonSpiceflowReturn()).post('/xxx', () => 'hi')
  const res = await app.handle(
    new Request('http://localhost/xxx', { method: 'POST' }),
  )

  let client = createSpiceflowClient(app)

  type ClientType = Prettify<typeof client>
  // @ts-expect-error
  client.something

  client.xxx.post()
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})
test('`use` on Spiceflow return', async () => {
  function nonSpiceflowReturn() {
    return new Spiceflow().post('/usePost', () => 'hi')
  }
  const app = new Spiceflow().use(nonSpiceflowReturn()).post('/xxx', () => 'hi')
  const res = await app.handle(
    new Request('http://localhost/xxx', { method: 'POST' }),
  )

  let client = createSpiceflowClient(app)
  client.xxx.post()
  client.usePost.post()

  type ClientType = Prettify<typeof client>
  // @ts-expect-error
  client.something

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('async generator type with client', async () => {
  const app = new Spiceflow().get('/stream', async function* () {
    yield { message: 'Hello' }
    yield { message: 'World' }
  })

  const client = createSpiceflowClient(app)

  const streamResponse = await client.stream.get()
  if (streamResponse.error) {
    throw streamResponse.error
  }

  // Type check: each yielded item should have the 'message' property
  for await (const item of streamResponse.data) {
    // @ts-expect-error
    item.something

    item.message

    expect(item).toHaveProperty('message')
    expect(typeof item.message).toBe('string')
  }
})
