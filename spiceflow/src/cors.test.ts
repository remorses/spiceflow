import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { cors } from './cors.js'
import { Spiceflow } from './spiceflow.js'

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
    .state('x', 1)
    .use(cors())
    .get('/ids/:id', ({ state }) => {
      state.x
      // @ts-expect-error
      state.y
      return 'hi'
    })
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

test('CORS headers are set when an error is thrown', async () => {
  let errorRouteCallCount = 0;
  const errorApp = new Spiceflow().use(cors()).get('/error', () => {
    errorRouteCallCount++;
    throw new Error('Test error')
  })

  const res = await errorApp.handle(request('error'))
  expect(res.status).toBe(500)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(await res.text()).toContain('Test error')
  expect(errorRouteCallCount).toBe(1)
})

test('CORS headers are set for OPTIONS request when an error is thrown', async () => {
  let errorRouteCallCount = 0;
  const errorApp = new Spiceflow().use(cors()).options('/error', () => {
    errorRouteCallCount++;
    throw new Error('Test error')
  })

  const res = await errorApp.handle(request('error', 'OPTIONS'))
  expect(res.status).toBe(204)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,HEAD,PUT,POST,DELETE,PATCH')
  expect(errorRouteCallCount).toBe(1)
})

// TODO should middleware errors be handled? errors can be a way to short circuit other middlewares
test('CORS headers are set when an error is thrown in middleware', async () => {
  let errorRouteCallCount = 0;
  const errorApp = new Spiceflow()
    .use((c) => {
      throw new Error('middleware error')
    })
    .use(cors())
    .get('/error', () => {
      errorRouteCallCount++;
      throw new Error('Test error')
    })

  const res = await errorApp.handle(request('error'))
  expect(res.status).toBe(500)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  expect(await res.text()).toContain('middleware error')
  expect(errorRouteCallCount).toBe(0)
})
