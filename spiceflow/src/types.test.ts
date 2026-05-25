import { expect, test } from 'vitest'
import { createSpiceflowFetch } from './client/index.js'
import { Spiceflow } from './spiceflow.js'
import { Prettify } from './types.js'

test('`use` on non Spiceflow return', async () => {
  function nonSpiceflowReturn() {
    return Reflect.get({ value: new Spiceflow() }, 'value')
  }
  const app = new Spiceflow().use(nonSpiceflowReturn()).post('/xxx', () => 'hi')
  const res = await app.handle(
    new Request('http://localhost/xxx', { method: 'POST' }),
  )

  let f = createSpiceflowFetch(app)

  type FetchType = Prettify<typeof f>

  void f('/xxx', { method: 'POST' })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('`handle` accepts state as second argument in object', async () => {
  const app = new Spiceflow().state('counter', 0).post('/state-test', (c) => {
    return { counter: c.state.counter }
  })

  const res = await app.handle(
    new Request('http://localhost/state-test', { method: 'POST' }),
    { state: { counter: 42 } },
  )

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ counter: 42 })

  const invalidRes = await app.handle(
    new Request('http://localhost/state-test', { method: 'POST' }),
    // @ts-expect-error - Invalid state key
    { state: { invalidKey: 100 } },
  )
})

test('`use` on Spiceflow return', async () => {
  function nonSpiceflowReturn() {
    return new Spiceflow().post('/usePost', () => 'hi')
  }
  const app = new Spiceflow().use(nonSpiceflowReturn()).post('/xxx', () => 'hi')
  const res = await app.handle(
    new Request('http://localhost/xxx', { method: 'POST' }),
  )

  let f = createSpiceflowFetch(app)
  void f('/xxx', { method: 'POST' })
  void f('/usePost', { method: 'POST' })

  type FetchType = Prettify<typeof f>
  // @ts-expect-error
  void f('/something')

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('async generator type with client', async () => {
  const app = new Spiceflow().get('/stream', async function* () {
    yield { message: 'Hello' }
    yield { message: 'World' }
  })

  const f = createSpiceflowFetch(app)

  const streamResponse = await f('/stream')
  if (streamResponse instanceof Error) {
    throw streamResponse
  }

  // Type check: each yielded item should have the 'message' property
  for await (const item of streamResponse) {
    // @ts-expect-error
    item.something

    item.message

    expect(item).toHaveProperty('message')
    expect(typeof item.message).toBe('string')
  }
})
