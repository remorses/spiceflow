import { test, describe, expect, vi } from 'vitest'

import { bfs, cloneDeep, createSafePath, extractWildcardParam, Spiceflow } from './spiceflow.tsx'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.js'
import { createSpiceflowFetch } from './client/fetch.ts'

test('works', async () => {
  const res = await new Spiceflow()
    .post('/xxx', () => 'hi')
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('* param is a path without front slash', async () => {
  const app = new Spiceflow().post('/upload/*', ({ params }) => {
    return params['*']
  })

  {
    // /upload/ with trailing slash matches /upload/* (trie router matches /* for parent path too)
    // wildcard param is undefined since there's nothing after /upload
    const res = await app.handle(
      new Request('http://localhost/upload/', {
        method: 'POST',
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  }
  {
    const res = await app.handle(
      new Request('http://localhost/upload/some/nested/key.txt', {
        method: 'POST',
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(`some/nested/key.txt`)
  }
})

test('* param in .route() does not contain leading slash', async () => {
  const app = new Spiceflow().route({
    method: 'GET',
    path: '/repos/:owner/:repo/:branch/file/*',
    handler: async ({ params }) => {
      const { owner, repo, branch, '*': filePath } = params
      return { owner, repo, branch, filePath }
    },
  })

  const res = await app.handle(
    new Request(
      'http://localhost/repos/user/myrepo/main/file/src/components/Button.tsx',
      {
        method: 'GET',
      },
    ),
  )
  expect(res.status).toBe(200)
  const result = await res.json()
  expect(result).toMatchInlineSnapshot(`
    {
      "branch": "main",
      "filePath": "src/components/Button.tsx",
      "owner": "user",
      "repo": "myrepo",
    }
  `)
  expect(result.filePath).not.toMatch(/^\//)
})

// test('should error if passing .request option to .route with method GET', () => {
//   new Spiceflow().route({
//     method: 'GET',
//     path: '/abc',
//     handler: () => 'ok',
//     // @ts-expect-error .request is not allowed for GET routes
//     request: z.object({
//       abc: z.string(),
//     }),
//   })
// })

test('* method listens on all HTTP methods', async () => {
  const app = new Spiceflow().route({
    method: '*',
    path: '/wildcard',
    handler: ({ request }) => ({ method: request.method }),
  })

  // Test different HTTP methods
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

  for (const method of methods) {
    const res = await app.handle(
      new Request('http://localhost/wildcard', { method }),
    )
    expect(res.status).toBe(200)
    const result = await res.json()
    expect(result).toEqual({ method })
  }
})

test('route without method defaults to * (all methods)', async () => {
  const app = new Spiceflow().route({
    path: '/default',
    handler: ({ request }) => ({ method: request.method }),
  })

  // Test different HTTP methods
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

  for (const method of methods) {
    const res = await app.handle(
      new Request('http://localhost/default', { method }),
    )
    expect(res.status).toBe(200)
    const result = await res.json()
    expect(result).toEqual({ method })
  }
})

test('this works to reference app in handler', async () => {
  const res = await new Spiceflow()
    .route({
      method: 'POST',
      path: '/another',
      handler() {
        return 'ok'
      },
    })
    .route({
      method: 'POST',
      path: '/href',
      handler() {
        return this.safePath('/another')
      },
    })
    .handle(new Request('http://localhost/href', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('/another')
})

test('routes works', async () => {
  const res = await new Spiceflow()
    .route({
      method: 'POST',
      path: '/xxx',
      handler: () => 'hi',
    })
    .handle(new Request('http://localhost/xxx', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

describe('cloneDeep', () => {
  test('works on promises', async () => {
    const obj = {
      promise: Promise.resolve({ value: 'hi' }),
    }
    const res = cloneDeep(obj)
    expect(res.promise).toBeInstanceOf(Promise)
    expect(await res.promise).toEqual({ value: 'hi' })
    // expect(await res.promise).not.toBe(await obj.promise)
    expect(res).toMatchInlineSnapshot(`
      {
        "promise": Promise {},
      }
    `)
  })
})

test('can encode superjson types', async () => {
  const app = new Spiceflow().post('/superjson', () => {
    const item = {
      date: new Date('2025-01-20T18:01:57.852Z'),
      map: new Map([['a', 1]]),
      set: new Set([1, 2, 3]),
      bigint: BigInt(123),
    }
    return { items: Array(2).fill(item) }
  })
  // Plain request without RPC header gets regular JSON (BigInt can't be serialized)
  const plainRes = await app.handle(
    new Request('http://localhost/superjson', { method: 'POST' }),
  )
  expect(plainRes.status).toBe(500)

  // RPC request with x-spiceflow-agent header gets superjson
  const res = await app.handle(
    new Request('http://localhost/superjson', {
      method: 'POST',
      headers: { 'x-spiceflow-agent': 'spiceflow-client' },
    }),
  )
  expect(res.status).toBe(200)
  const client = createSpiceflowClient(app)
  expect(await client.superjson.post().then((x) => x.data))
    .toMatchInlineSnapshot(`
      {
        "items": [
          {
            "bigint": 123n,
            "date": 2025-01-20T18:01:57.852Z,
            "map": Map {
              "a" => 1,
            },
            "set": Set {
              1,
              2,
              3,
            },
          },
          {
            "bigint": 123n,
            "date": 2025-01-20T18:01:57.852Z,
            "map": Map {
              "a" => 1,
            },
            "set": Set {
              1,
              2,
              3,
            },
          },
        ],
      }
    `)
  expect(await res.json()).toMatchInlineSnapshot(`
    {
      "__superjsonMeta": {
        "referentialEqualities": {
          "items.0": [
            "items.1",
          ],
        },
        "values": {
          "items.0.bigint": [
            "bigint",
          ],
          "items.0.date": [
            "Date",
          ],
          "items.0.map": [
            "map",
          ],
          "items.0.set": [
            "set",
          ],
          "items.1.bigint": [
            "bigint",
          ],
          "items.1.date": [
            "Date",
          ],
          "items.1.map": [
            "map",
          ],
          "items.1.set": [
            "set",
          ],
        },
      },
      "items": [
        {
          "bigint": "123",
          "date": "2025-01-20T18:01:57.852Z",
          "map": [
            [
              "a",
              1,
            ],
          ],
          "set": [
            1,
            2,
            3,
          ],
        },
        {
          "bigint": "123",
          "date": "2025-01-20T18:01:57.852Z",
          "map": [
            [
              "a",
              1,
            ],
          ],
          "set": [
            1,
            2,
            3,
          ],
        },
      ],
    }
  `)
})
test('dynamic route', async () => {
  const res = await new Spiceflow()
    .post('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/ids/xxx', { method: 'POST' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})
test('handler returns url encoded data', async () => {
  const params = new URLSearchParams()
  params.append('name', 'test')
  params.append('value', '123')

  const res = await new Spiceflow()
    .post('/form', () => params, {
      type: 'application/x-www-form-urlencoded',
    })
    .handle(
      new Request('http://localhost/form', {
        method: 'POST',
      }),
    )

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe(
    'application/x-www-form-urlencoded',
  )
  const text = await res.text()
  const responseParams = new URLSearchParams(text)
  expect(responseParams.get('name')).toBe('test')
  expect(responseParams.get('value')).toBe('123')
})
test('GET dynamic route', async () => {
  const res = await new Spiceflow()
    .get('/ids/:id', () => 'hi')
    .post('/ids/:id', ({ params: { id } }) => id, {
      params: z.object({ id: z.string() }),
    })
    .handle(new Request('http://localhost/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('onError does not fire on 404', async () => {
  let errorFired = false
  const app = new Spiceflow()
    .get('/test', () => 'Hello')
    .onError(() => {
      errorFired = true
      return new Response('Error', { status: 500 })
    })

  const res = await app.handle(
    new Request('http://localhost/non-existent', { method: 'GET' }),
  )

  expect(res.status).toBe(404)
  expect(errorFired).toBe(false)
  expect(await res.text()).toBe('Not Found')
})

test('onError fires on validation errors', async () => {
  let errorMessage = ''
  const app = new Spiceflow()
    .post(
      '/test',
      async ({ request }) => {
        await request.json()
        return 'Success'
      },
      {
        body: z.object({
          name: z.string(),
        }),
      },
    )
    .onError(({ error }) => {
      errorMessage = error.message
      return new Response('Error', { status: 400 })
    })

  const res = await app.handle(
    new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 1 }), // Invalid type for 'name'
    }),
  )

  expect(res.status).toBe(400)
  expect(errorMessage).toMatchInlineSnapshot(
    `"name: Invalid input: expected string, received number"`,
  )
  expect(await res.text()).toMatchInlineSnapshot(`"Error"`)
})

test('HEAD uses GET route metadata but does not add body', async () => {
  const app = new Spiceflow().get('/ids/:id', () => {
    return {
      message: 'hi',
      length: 10,
    }
  })

  const res = await app.handle(
    new Request('http://localhost/ids/xxx', { method: 'HEAD' }),
  )
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.text()).toBe('')

  // Compare with GET to ensure HEAD is using GET route
  const getRes = await app.handle(
    new Request('http://localhost/ids/xxx', { method: 'GET' }),
  )
  expect(getRes.status).toBe(200)
  expect(await getRes.json()).toEqual({ message: 'hi', length: 10 })
})

test('HEAD keeps GET error status instead of forcing 200', async () => {
  const app = new Spiceflow().get('/boom', () => {
    throw Object.assign(new Error('boom'), { status: 418 })
  })

  const res = await app.handle(
    new Request('http://localhost/boom', { method: 'HEAD' }),
  )

  expect(res.status).toBe(418)
  expect(await res.text()).toBe('')
})

test('GET with query, untyped', async () => {
  const res = await new Spiceflow()
    .get('/query', ({ query }) => {
      return query.id
    })
    .handle(new Request('http://localhost/query?id=hi', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('GET with query, zod, fails validation', async () => {
  const res = await new Spiceflow()
    .get(
      '/query',
      ({ query }) => {
        return query.id
      },
      {
        query: z.object({
          id: z.number(),
        }),
      },
    )
    .handle(new Request('http://localhost/query?id=hi', { method: 'GET' }))
  expect(res.status).toBe(422)
})

test('GET with query and zod', async () => {
  const res = await new Spiceflow()
    .get(
      '/query',
      ({ query }) => {
        return query.id
        // @ts-expect-error
        void query.sdfsd
      },
      {
        query: z.object({
          id: z.string(),
        }),
      },
    )
    .handle(new Request('http://localhost/query?id=hi', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('GET with repeated empty query values preserves all values', async () => {
  const res = await new Spiceflow()
    .get('/query', ({ query }) => query.tag)
    .handle(new Request('http://localhost/query?tag=&tag=two', { method: 'GET' }))

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual(['', 'two'])
})

test('GET dynamic route, params are typed', async () => {
  const res = await new Spiceflow()
    .get('/ids/:id', ({ params }) => {
      let id = params.id
      // @ts-expect-error
      params.sdfsd
      return id
    })
    .handle(new Request('http://localhost/ids/hi', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('GET wildcard path param is typed as optional', async () => {
  const res = await new Spiceflow()
    .get('/files/*', ({ params }) => {
      // @ts-expect-error
      params['*'].toUpperCase()
      return params['*'] ?? 'none'
    })
    .handle(new Request('http://localhost/files/path/to/file.txt', { method: 'GET' }))

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('path/to/file.txt')
})

test('GET trailing optional path param is typed as optional', async () => {
  const res = await new Spiceflow()
    .get('/users/:id?', ({ params }) => {
      // @ts-expect-error
      params.id.toUpperCase()
      return params.id ?? 'none'
    })
    .handle(new Request('http://localhost/users/123', { method: 'GET' }))

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('123')
})

test('GET non-trailing ? stays in the param key type', async () => {
  const res = await new Spiceflow()
    .get('/users/:id?/details', ({ params }) => {
      // @ts-expect-error
      params.id
      return params['id?']
    })
    .handle(new Request('http://localhost/users/123/details', { method: 'GET' }))

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('123')
})

test('GET dynamic route with .route(), params are typed', async () => {
  const res = await new Spiceflow()
    .route({
      handler: ({ params }) => {
        let id = params.id
        // @ts-expect-error
        params.sdfsd
        return id
      },
      method: 'GET',
      path: '/ids/:id',
    })
    .handle(new Request('http://localhost/ids/hi', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('GET dynamic route, params are typed with schema', async () => {
  const res = await new Spiceflow()
    .get(
      '/ids/:id',
      ({ params }) => {
        let id = params.id
        // @ts-expect-error
        params.sdfsd
        return id
      },
      {
        params: z.object({
          id: z.string(),
        }),
      },
    )
    .handle(new Request('http://localhost/ids/hi', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})
test('GET route with param and wildcard, both are captured', async () => {
  const res = await new Spiceflow()
    .state('id', '')
    .use(({ state }) => {
      state.id = '123'
    })
    .onError(({ error }) => {
      expect(error).toBe(undefined)
      throw error
      // return new Response('root', { status: 500 })
    })
    .get('/files/:id/*', ({ params, state }) => {
      expect(params.id).toBe('123')
      expect(state.id).toBe('123')
      // expect(params['*']).toBe('path/to/file.txt')
      expect(params).toMatchInlineSnapshot(`
        {
          "*": "path/to/file.txt",
          "id": "123",
        }
      `)
      return params
    })
    .handle(
      new Request('http://localhost/files/123/path/to/file.txt', {
        method: 'GET',
      }),
    )
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchInlineSnapshot(
    {
      id: '123',
      '*': 'path/to/file.txt',
    },
    `
    {
      "*": "path/to/file.txt",
      "id": "123",
    }
  `,
  )
})

test('extractWildcardParam correctly extracts wildcard segments', () => {
  expect(extractWildcardParam('/files/123/path/to/file.txt', '/files/:id/*'))
    .toMatchInlineSnapshot(`
    {
      "*": "path/to/file.txt",
    }
  `)

  expect(extractWildcardParam('/files/path/to/file.txt', '/files/*'))
    .toMatchInlineSnapshot(`
    {
      "*": "path/to/file.txt",
    }
  `)

  expect(
    extractWildcardParam('/files/123', '/files/:id'),
  ).toMatchInlineSnapshot('null')

  expect(
    extractWildcardParam('/files/123/', '/files/:id/*'),
  ).toMatchInlineSnapshot(`null`)

  expect(extractWildcardParam('/files/123/deep/path/', '/files/:id/*/'))
    .toMatchInlineSnapshot(`
    {
      "*": "deep/path",
    }
  `)

  expect(extractWildcardParam('/files/123/path/to/file.txt', '/files/:id/*'))
    .toMatchInlineSnapshot(`
    {
      "*": "path/to/file.txt",
    }
  `)

  expect(extractWildcardParam('/files/123/path/to/file.txt', '/files/:id/*'))
    .toMatchInlineSnapshot(`
    {
      "*": "path/to/file.txt",
    }
  `)
})

test('extractWildcardParam only captures the middle wildcard segment', () => {
  expect(extractWildcardParam('/layout/foo/page', '/layout/*/page'))
    .toMatchInlineSnapshot(`
    {
      "*": "foo",
    }
  `)
})

test('specific wildcard route wins over root catch-all', async () => {
  const app = new Spiceflow()
    .get('/*', ({ params }) => ({ route: 'catch-all', params }))
    .get('/files/:id/*', ({ params }) => ({ route: 'file', params }))

  const res = await app.handle(
    new Request('http://localhost/files/123/path/to/file.txt', {
      method: 'GET',
    }),
  )

  expect(res.status).toBe(200)
  expect(await res.json()).toMatchInlineSnapshot(`
    {
      "params": {
        "*": "path/to/file.txt",
        "id": "123",
      },
      "route": "file",
    }
  `)
})

test('regex constrained route is more specific than a generic param route', async () => {
  const app = new Spiceflow()
    .get('/:id{[0-9]+}', () => 'digits')
    .get('/:id', () => 'generic')

  const res = await app.handle(new Request('http://localhost/123'))

  expect(res.status).toBe(200)
  expect(await res.json()).toBe('digits')
})

test('renderReact passes layout params to layouts instead of page params', async () => {
  let payload: any
  let pageProps: any
  let layoutProps: any

  vi.doMock('#rsc-runtime', () => ({
    renderToReadableStream(value) {
      payload = value
      return new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
    },
    createTemporaryReferenceSet: () => ({}),
    decodeReply: async () => null,
    decodeAction: async () => () => null,
    decodeFormState: async () => undefined,
    loadServerAction: async () => undefined,
  }))

  try {
    const app = new Spiceflow()
    const Page = (props: any) => {
      pageProps = props
      return null
    }
    const Layout = (props: any) => {
      layoutProps = props
      return null
    }

    await (app as any).renderReact({
      request: new Request('http://localhost/layouts/parent/pages/child', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: { pageId: 'child' },
          route: {
            id: 'page',
            kind: 'page',
            handler: Page,
          },
        },
        {
          app,
          params: { layoutId: 'parent' },
          route: {
            id: 'layout',
            kind: 'layout',
            handler: Layout,
          },
        },
      ],
    })

    expect(payload.root.page).toBeNull()
    expect(payload.root.layouts[0]?.element).toBeNull()
    expect(pageProps.params).toEqual({ pageId: 'child' })
    expect(layoutProps.params).toEqual({
      layoutId: 'parent',
    })
    expect(pageProps.response).toHaveProperty('headers')
    expect(pageProps.response).toHaveProperty('status', 200)
    expect(layoutProps.response).toHaveProperty('headers')
    expect(layoutProps.response).toHaveProperty('status', 200)
    expect(layoutProps.response).not.toBe(pageProps.response)
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('renderReact merges page response headers into the flight response', async () => {
  vi.resetModules()
  vi.doMock('#rsc-runtime', () => ({
    renderToReadableStream() {
      return new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
    },
    createTemporaryReferenceSet: () => ({}),
    decodeReply: async () => null,
    decodeAction: async () => () => null,
    decodeFormState: async () => undefined,
    loadServerAction: async () => undefined,
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const app = new FreshSpiceflow()
    const response = await (app as any).renderReact({
      request: new Request('http://localhost/headers', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: {},
          route: {
            id: 'page',
            kind: 'page',
            handler: ({ response }: any) => {
              response.headers.set('cache-control', 'private, max-age=60')
              response.headers.append('set-cookie', 'a=1; Path=/')
              response.headers.append('set-cookie', 'b=2; Path=/')
              return null
            },
          },
        },
      ],
    })

    expect(response.headers.get('cache-control')).toBe('private, max-age=60')
    const getSetCookie = (response.headers as Headers & {
      getSetCookie?: () => string[]
    }).getSetCookie
    expect(getSetCookie?.call(response.headers)).toEqual([
      'a=1; Path=/',
      'b=2; Path=/',
    ])
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('renderReact merges layout and page headers in route order', async () => {
  vi.resetModules()
  vi.doMock('#rsc-runtime', () => ({
    renderToReadableStream() {
      return new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
    },
    createTemporaryReferenceSet: () => ({}),
    decodeReply: async () => null,
    decodeAction: async () => () => null,
    decodeFormState: async () => undefined,
    loadServerAction: async () => undefined,
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const app = new FreshSpiceflow()
    const response = await (app as any).renderReact({
      request: new Request('http://localhost/headers', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: { layoutId: 'outer' },
          route: {
            id: 'layout',
            kind: 'layout',
            handler: ({ children, response }: any) => {
              response.headers.set('cache-control', 'layout')
              response.headers.append('set-cookie', 'layout=1; Path=/')
              return children
            },
          },
        },
        {
          app,
          params: {},
          route: {
            id: 'page',
            kind: 'page',
            handler: ({ response }: any) => {
              response.headers.set('cache-control', 'page')
              response.headers.append('set-cookie', 'page=1; Path=/')
              return null
            },
          },
        },
      ],
    })

    expect(response.headers.get('cache-control')).toBe('page')
    const getSetCookie = (response.headers as Headers & {
      getSetCookie?: () => string[]
    }).getSetCookie
    expect(getSetCookie?.call(response.headers)).toEqual([
      'layout=1; Path=/',
      'page=1; Path=/',
    ])
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('renderReact uses page response.status over layout response.status', async () => {
  vi.resetModules()
  vi.doMock('#rsc-runtime', () => ({
    renderToReadableStream() {
      return new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
    },
    createTemporaryReferenceSet: () => ({}),
    decodeReply: async () => null,
    decodeAction: async () => () => null,
    decodeFormState: async () => undefined,
    loadServerAction: async () => undefined,
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const app = new FreshSpiceflow()
    const response = await (app as any).renderReact({
      request: new Request('http://localhost/status-precedence', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: {},
          route: {
            id: 'layout',
            kind: 'layout',
            handler: ({ children, response }: any) => {
              response.status = 418
              return children
            },
          },
        },
        {
          app,
          params: {},
          route: {
            id: 'page',
            kind: 'page',
            handler: ({ response }: any) => {
              response.status = 202
              return null
            },
          },
        },
      ],
    })

    expect(response.status).toBe(202)
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('renderReact falls back to nearest layout response.status when page does not set status', async () => {
  vi.resetModules()
  vi.doMock('#rsc-runtime', () => ({
    renderToReadableStream() {
      return new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
    },
    createTemporaryReferenceSet: () => ({}),
    decodeReply: async () => null,
    decodeAction: async () => () => null,
    decodeFormState: async () => undefined,
    loadServerAction: async () => undefined,
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const app = new FreshSpiceflow()
    const response = await (app as any).renderReact({
      request: new Request('http://localhost/layout-status', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: {},
          route: {
            id: 'outer-layout',
            kind: 'layout',
            handler: ({ children, response }: any) => {
              response.status = 451
              return children
            },
          },
        },
        {
          app,
          params: {},
          route: {
            id: 'inner-layout',
            kind: 'layout',
            handler: ({ children, response }: any) => {
              response.status = 429
              return children
            },
          },
        },
        {
          app,
          params: {},
          route: {
            id: 'page',
            kind: 'page',
            handler: () => null,
          },
        },
      ],
    })

    // Nearest layout wins (last matched layout in render order)
    expect(response.status).toBe(429)
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('renderReact starts layouts and page concurrently', async () => {
  const createDeferred = () => {
    let resolve!: () => void
    const promise = new Promise<void>((resolvePromise) => {
      resolve = resolvePromise
    })
    return { promise, resolve }
  }

  try {
    vi.resetModules()
    vi.doMock('#rsc-runtime', () => ({
      renderToReadableStream() {
        return new ReadableStream({
          start(controller) {
            controller.close()
          },
        })
      },
      createTemporaryReferenceSet: () => ({}),
      decodeReply: async () => null,
      decodeAction: async () => () => null,
      decodeFormState: async () => undefined,
      loadServerAction: async () => undefined,
    }))
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const app = new FreshSpiceflow()
    const events: string[] = []
    const layoutDeferred = createDeferred()
    const pageDeferred = createDeferred()

    const renderPromise = (app as any).renderReact({
      request: new Request('http://localhost/concurrent', {
        method: 'GET',
      }),
      context: {
        request: undefined,
        state: {},
        query: {},
        params: {},
        path: '/',
        response: new Response(null),
      },
      reactRoutes: [
        {
          app,
          params: { layoutId: 'outer' },
          route: {
            id: 'layout',
            kind: 'layout',
            handler: async ({ children }: any) => {
              events.push('layout:start')
              await layoutDeferred.promise
              events.push('layout:end')
              return children
            },
          },
        },
        {
          app,
          params: {},
          route: {
            id: 'page',
            kind: 'page',
            handler: async () => {
              events.push('page:start')
              await pageDeferred.promise
              events.push('page:end')
              throw new Response(null, { status: 204 })
            },
          },
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events).toEqual(['layout:start', 'page:start'])
    })

    layoutDeferred.resolve()
    await Promise.resolve()
    expect(events).toEqual(['layout:start', 'page:start', 'layout:end'])

    pageDeferred.resolve()
    const response = await renderPromise
    expect(events).toEqual([
      'layout:start',
      'page:start',
      'layout:end',
      'page:end',
    ])
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toMatchInlineSnapshot(`200`)
  } finally {
    vi.doUnmock('#rsc-runtime')
    vi.resetModules()
  }
})

test('api routes can set response headers through context.response', async () => {
  const app = new Spiceflow().get('/headers', ({ response }) => {
    response.headers.set('x-api-header', 'ok')
    response.headers.append('set-cookie', 'api-cookie=1; Path=/')
    return { ok: true }
  })

  const response = await app.handle(new Request('http://localhost/headers'))

  expect(response.headers.get('x-api-header')).toBe('ok')
  expect((await response.json())?.ok).toBe(true)
  const getSetCookie = (response.headers as Headers & {
    getSetCookie?: () => string[]
  }).getSetCookie
  expect(getSetCookie?.call(response.headers)).toEqual(['api-cookie=1; Path=/'])
})

test('api routes can set response status through context.response', async () => {
  const app = new Spiceflow().get('/status', ({ response }) => {
    response.status = 201
    return { ok: true }
  })

  const response = await app.handle(new Request('http://localhost/status'))

  expect(response.status).toBe(201)
  expect(await response.json()).toEqual({ ok: true })
})

test('returned Response status takes precedence over context.response.status in api routes', async () => {
  const app = new Spiceflow().get('/response-wins', ({ response }) => {
    response.status = 418
    return new Response('accepted', { status: 202 })
  })

  const response = await app.handle(new Request('http://localhost/response-wins'))

  expect(response.status).toBe(202)
  expect(await response.text()).toBe('accepted')
})

test('missing route is not found', async () => {
  const res = await new Spiceflow()
    .get('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/zxxx', { method: 'GET' }))
  expect(res.status).toBe(404)
})

test('document requests set a deployment cookie when a deployment id is available', async () => {
  vi.resetModules()
  vi.doMock('#deployment-id', () => ({
    getDeploymentId: async () => 'deploy-123',
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const res = await new FreshSpiceflow().get('/', () => 'ok').handle(
      new Request('http://localhost/', {
        headers: {
          'sec-fetch-dest': 'document',
        },
      }),
    )

    expect(res.headers.get('set-cookie')).toContain(
      'spiceflow-deployment=deploy-123',
    )
  } finally {
    vi.doUnmock('#deployment-id')
    vi.resetModules()
  }
})

test('rsc deployment mismatch returns a same-origin relative reload path', async () => {
  vi.resetModules()
  vi.doMock('#deployment-id', () => ({
    getDeploymentId: async () => 'deploy-123',
  }))

  try {
    const { Spiceflow: FreshSpiceflow } = await import('./spiceflow.js')
    const res = await new FreshSpiceflow().get('/', () => 'ok').handle(
      new Request('http://internal-proxy/app/page?__rsc=&q=1', {
        headers: {
          cookie: 'spiceflow-deployment=deploy-old',
        },
      }),
    )

    expect(res.status).toBe(409)
    expect(res.headers.get('x-spiceflow-reload')).toBe('/app/page?q=1')
  } finally {
    vi.doUnmock('#deployment-id')
    vi.resetModules()
  }
})

test('state works', async () => {
  const res = await new Spiceflow()
    .state('id', '')
    .use(({ state, request }) => {
      state.id = 'xxx'
    })
    .get('/get', ({ state: state }) => {
      expect(state.id).toBe('xxx')
    })
    .handle(new Request('http://localhost/get'))
  expect(res.status).toBe(200)
})

test('body is parsed as json', async () => {
  let body
  const res = await new Spiceflow()
    .state('id', '')

    .post('/post', async (c) => {
      body = await c.request.json()
      // console.log({request})
      return body
    })
    .handle(
      new Request('http://localhost/post', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'John' }),
      }),
    )
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ name: 'John' })
})

test('validate body works, request success', async () => {
  const res = await new Spiceflow()

    .post(
      '/post',
      async ({ request }) => {
        // console.log({request})
        let body = await request.json()
        expect(body).toEqual({ name: 'John' })
        return 'ok'
      },
      {
        body: z.object({
          name: z.string(),
        }),
      },
    )
    .handle(
      new Request('http://localhost/post', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'John' }),
      }),
    )
  expect(res.status).toBe(200)
  expect(await res.text()).toMatchInlineSnapshot(`""ok""`)
})

test('validate body works, request fails', async () => {
  const res = await new Spiceflow()

    .post(
      '/post',
      async ({ request, redirect }) => {
        // console.log({request})
        let body = await request.json()
        expect(body).toEqual({ name: 'John' })
      },
      {
        request: z.object({
          name: z.string(),
          requiredField: z.string(),
        }),
      },
    )
    .handle(
      new Request('http://localhost/post', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'John' }),
      }),
    )
  expect(res.status).toBe(422)
  expect(await res.text()).toMatchInlineSnapshot(
    `"{"code":"VALIDATION","status":422,"message":"requiredField: Invalid input: expected string, received undefined"}"`,
  )
})

test('run use', async () => {
  const res = await new Spiceflow()
    .use(({ request }) => {
      expect(request.method).toBe('HEAD')
      return new Response('ok', { status: 401 })
    })
    .use(({ request }) => {
      expect(request.method).toBe('HEAD')
      return 'second one'
    })
    .head('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/ids/zxxx', { method: 'HEAD' }))
  expect(res.status).toBe(401)
  expect(await res.text()).toBe('')
})

test('run use', async () => {
  const res = await new Spiceflow()
    .use(({ request }) => {
      expect(request.method).toBe('HEAD')
      return new Response('ok', { status: 401 })
    })
    .use(({ request }) => {
      expect(request.method).toBe('HEAD')
      return 'second one'
    })
    .head('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/ids/zxxx', { method: 'HEAD' }))
  expect(res.status).toBe(401)
  expect(await res.text()).toBe('')
})

test('basPath works', async () => {
  const res = await new Spiceflow({ basePath: '/one' })
    .get('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/one/ids/xxx', { method: 'GET' }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual('hi')
})

test('basPath works with use', async () => {
  let app = new Spiceflow({ basePath: '/one' }).use(
    new Spiceflow({})
      .get('/two', () => 'hi')
      .use(new Spiceflow({ basePath: '/three' }).get('/four', () => 'hi')),
  )
  {
    const res = await app.handle(
      new Request('http://localhost/one/two', { method: 'GET' }),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('hi')
  }
  {
    const res = await app.handle(
      new Request('http://localhost/one/three/four', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('hi')
  }
})

test('getRouteAndParents', async () => {
  let app = new Spiceflow({ basePath: '/one' })
    .get('/ids/:id', () => 'hi')
    .use(
      new Spiceflow({ basePath: '/two' }).use(
        new Spiceflow({ basePath: '/three' }).get('/four', () => 'hi'),
      ),
    )

  let routers = bfs(app)
  let last = routers[routers.length - 1]

  expect(app['getAppAndParents'](last).map((x) => x.basePath))
    .toMatchInlineSnapshot(`
			[
			  "/one",
			  "/two",
			  "/three",
			]
		`)
})

test('getAppsInScope include all parent apps', async () => {
  let app = new Spiceflow({ basePath: '/one' })
    .get('/ids/:id', () => 'hi')
    .use(
      new Spiceflow({ basePath: '/two' }).use(
        new Spiceflow({ basePath: '/three' }).use(
          new Spiceflow({ basePath: '/four' })
            .get('/five', () => 'hi')
            .use(({ request }) => {}),
        ),
      ),
    )

  let routers = bfs(app)
  let secondLast = routers[routers.length - 2]

  expect(app['getAppsInScope'](secondLast).map((x) => x.basePath))
    .toMatchInlineSnapshot(`
			[
			  "/one",
			  "/two",
			  "/three",
			]
		`)
})

test('getAppsInScope include all parent apps and non scoped apps', async () => {
  let app = new Spiceflow({ basePath: '/one' })
    .get('/ids/:id', () => 'hi')
    .use(
      new Spiceflow({ basePath: '/two' }).use(
        new Spiceflow({ basePath: '/three' }).use(
          new Spiceflow({ basePath: '/four', scoped: false })
            .get('/five', () => 'hi')
            .use(({ request }) => {}),
        ),
      ),
    )

  let routers = bfs(app)
  let secondLast = routers[routers.length - 2]

  expect(app['getAppsInScope'](secondLast).map((x) => x.basePath))
    .toMatchInlineSnapshot(`
			[
			  "/one",
			  "/two",
			  "/three",
			  "/four",
			]
		`)
})

test('use with 2 basPath works', async () => {
  let oneOnReq = false
  let twoOnReq = false
  let onReqCalled: string[] = []
  const app = await new Spiceflow()
    .use(({ request }) => {
      onReqCalled.push('root')
    })
    .use(
      new Spiceflow({ basePath: '/one' })

        .use(({ request }) => {
          oneOnReq = true
          onReqCalled.push('one')
        })
        .get('/ids/:id', ({ params }) => params.id),
    )
    .use(
      new Spiceflow({ basePath: '/two' })
        .use((c) => {
          twoOnReq = true
          onReqCalled.push('two')
        })
        .get('/ids/:id', ({ params }) => params.id, {}),
    )

  {
    const res = await app.handle(new Request('http://localhost/one/ids/one'))
    expect(res.status).toBe(200)

    expect(await res.json()).toEqual('one')
  }
  expect(onReqCalled).toEqual(['root', 'one'])
  {
    const res = await app.handle(new Request('http://localhost/two/ids/two'))
    expect(res.status).toBe(200)

    expect(await res.json()).toEqual('two')
  }
  expect(oneOnReq).toBe(true)
  expect(twoOnReq).toBe(true)
})

test('use with nested basPath works', async () => {
  const app = await new Spiceflow({ basePath: '/zero' })
    .use(
      new Spiceflow({ basePath: '/one' }).get(
        '/ids/:id',
        ({ params }) => params.id,
      ),
    )
    .use(
      new Spiceflow({ basePath: '/two' }).use(
        new Spiceflow({ basePath: '/nested' }).get(
          '/ids/:id',
          ({ params }) => params.id,
        ),
      ),
    )
  {
    const res = await app.handle(
      new Request('http://localhost/zero/one/ids/one'),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('one')
  }

  {
    const res = await app.handle(
      new Request('http://localhost/zero/two/nested/ids/nested'),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('nested')
  }
})

test('does not append subapp basePath if it is the same as parent app', async () => {
  const app = new Spiceflow({ basePath: '/api' })
    .use(new Spiceflow({ basePath: '/api' }).get('/users', () => 'users'))
    .use(
      new Spiceflow({ basePath: '/api' }).use(
        new Spiceflow({ basePath: '/v1' }).get('/posts', () => 'posts'),
      ),
    )

  // Test that /api/users works (not /api/api/users)
  {
    const res = await app.handle(
      new Request('http://localhost/api/users', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('users')
  }

  // Test that /api/v1/posts works (not /api/api/v1/posts)
  {
    const res = await app.handle(
      new Request('http://localhost/api/v1/posts', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('posts')
  }

  // Test that getAllRoutes() doesn't contain duplicate basePaths
  const allRoutes = app.getAllRoutes()
  expect(allRoutes.map((route) => route.path)).toMatchInlineSnapshot(`
    [
      "/api/users",
      "/api/v1/posts",
    ]
  `)
})

test('does not append subapp basePath if parent is prefix of subapp path', async () => {
  const app = new Spiceflow({ basePath: '/api' })
    .use(new Spiceflow({ basePath: '/api/sub' }).get('/users', () => 'users'))
    .use(
      new Spiceflow({ basePath: '/api' }).use(
        new Spiceflow({ basePath: '/api/v2' }).get('/posts', () => 'posts'),
      ),
    )

  // Test that /api/sub/users works (not /api/api/sub/users)
  {
    const res = await app.handle(
      new Request('http://localhost/api/sub/users', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('users')
  }

  // Test that /api/v2/posts works (not /api/api/v2/posts)
  {
    const res = await app.handle(
      new Request('http://localhost/api/v2/posts', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual('posts')
  }

  // Test that getAllRoutes() contains the correct paths
  const allRoutes = app.getAllRoutes()
  expect(allRoutes.map((route) => route.path)).toMatchInlineSnapshot(`
    [
      "/api/sub/users",
      "/api/v2/posts",
    ]
  `)
})

test('errors inside basPath works', async () => {
  let onErrorTriggered = [] as string[]
  let onReqTriggered = [] as string[]
  let handlerCalledNTimes = 0
  const app = await new Spiceflow({ basePath: '/zero' })
    .onError(({ error }) => {
      onErrorTriggered.push('root')
      // return new Response('root', { status: 500 })
    })
    .use(({ request }) => {
      onReqTriggered.push('root')
      // return new Response('root', { status: 500 })
    })

    .use(
      new Spiceflow({ basePath: '/two' })
        .onError(({ error }) => {
          onErrorTriggered.push('two')
          // return new Response('two', { status: 500 })
        })
        .use(({ request }) => {
          onReqTriggered.push('two')
          // return new Response('two', { status: 500 })
        })
        .use(
          new Spiceflow({ basePath: '/nested' })
            .onError(({ error }) => {
              onErrorTriggered.push('nested')
              // return new Response('nested', { status: 500 })
            })
            .use(({ request }) => {
              onReqTriggered.push('nested')
              // return new Response('nested', { status: 500 })
            })
            .get('/ids/:id', ({ params }) => {
              handlerCalledNTimes++
              throw new Error('error message')
            }),
        ),
    )

  {
    const res = await app.handle(
      new Request('http://localhost/zero/two/nested/ids/nested'),
    )
    expect(handlerCalledNTimes).toBe(1)
    expect(onErrorTriggered).toEqual(['root', 'two', 'nested'])
    expect(onReqTriggered).toEqual(['root', 'two', 'nested'])
    expect(res.status).toBe(500)
    expect(await res.text()).toMatchInlineSnapshot(
      `"{"message":"error message"}"`,
    )
    // expect(await res.json()).toEqual('nested'))
  }
})

test('basepath with root route', async () => {
  let handlerCalled = false
  const app = new Spiceflow({ basePath: '/api' }).get('/', ({ request }) => {
    handlerCalled = true
    return new Response('Root route of API')
  })

  const res = await app.handle(new Request('http://localhost/api'))
  expect(handlerCalled).toBe(true)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('Root route of API')

  // Test that non-root paths are not matched
  handlerCalled = false
  const res2 = await app.handle(new Request('http://localhost/api/other'))
  expect(handlerCalled).toBe(false)
  expect(res2.status).toBe(404)
})

describe('Trailing slashes and base paths', () => {
  test('App without trailing slash, request with trailing slash', async () => {
    const app = new Spiceflow({ basePath: '/api' }).get(
      '/users',
      () => new Response('Users list'),
    )

    const res = await app.handle(new Request('http://localhost/api/users/'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Users list')
  })

  test('App with trailing slash, request without trailing slash', async () => {
    const app = new Spiceflow({ basePath: '/api/' }).get(
      '/users/',
      () => new Response('Users list'),
    )

    const res = await app.handle(new Request('http://localhost/api/users'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Users list')
  })

  test('Nested routes with and without trailing slashes', async () => {
    const app = new Spiceflow({ basePath: '/api' }).use(
      new Spiceflow()
        .get('/products', () => new Response('Products list'))
        .get('/categories/', () => new Response('Categories list')),
    )

    const resProducts = await app.handle(
      new Request('http://localhost/api/products/'),
    )
    expect(resProducts.status).toBe(200)
    expect(await resProducts.text()).toBe('Products list')

    const resCategories = await app.handle(
      new Request('http://localhost/api/categories'),
    )
    expect(resCategories.status).toBe(200)
    expect(await resCategories.text()).toBe('Categories list')
  })
})

test('async generators handle non-ASCII characters correctly', async () => {
  const app = new Spiceflow()
    .get('/cyrillic', async function* () {
      yield 'Привет' // Hello in Russian
      yield 'Κόσμος' // World in Greek
    })
    .get('/mixed-scripts', async function* () {
      // Mix of Cyrillic and Greek letters that look like Latin
      yield { text: 'РΡ' } // Cyrillic and Greek P
      yield { text: 'ΟО' } // Greek and Cyrillic O
      yield { text: 'КΚ' } // Cyrillic and Greek K
    })

  const client = createSpiceflowClient(app)

  const { data: cyrillicData } = await client.cyrillic.get()
  let cyrillicText = ''
  for await (const chunk of cyrillicData!) {
    cyrillicText += chunk
  }
  expect(cyrillicText).toBe('ПриветΚόσμος')

  const { data: mixedData } = await client['mixed-scripts'].get()
  const mixedResults = [] as any[]
  for await (const chunk of mixedData!) {
    mixedResults.push(chunk)
  }
  expect(mixedResults).toEqual([{ text: 'РΡ' }, { text: 'ΟО' }, { text: 'КΚ' }])
})

test('can pass additional props to body schema', async () => {
  const app = new Spiceflow().post('/user', ({ request }) => request.json(), {
    body: z
      .object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      })
      .passthrough(),
  })

  const res = await app.handle(
    new Request('http://localhost/user', {
      method: 'POST',

      body: JSON.stringify({
        name: 'John',
        age: 25,
        email: 'john@example.com',
        additionalProp: 'extra data',
      }),
    }),
  )

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    name: 'John',
    age: 25,
    email: 'john@example.com',
    additionalProp: 'extra data',
  })
})

describe('safePath', () => {
  test('handles simple paths without parameters', () => {
    const app = new Spiceflow()
      .get('/users', () => 'users')
      .get('/posts', () => 'posts')
      .get('/posts/*', () => 'posts')

    expect(app.safePath('/users')).toBe('/users')
    expect(app.safePath('/posts')).toBe('/posts')
    // @ts-expect-error
    app.safePath('/posts/*')
    expect(app.safePath('/posts/*', { '*': 'some/key' })).toBe(
      '/posts/some/key',
    )
  })

  test('safePath with .route works for static and wildcard paths', () => {
    const app = new Spiceflow()
      .route({
        path: '/users',
        handler: () => 'users',
      })
      .route({
        method: 'POST',
        path: '/posts',
        handler: () => 'posts',
      })
      .route({
        method: 'GET',
        path: '/files/*',
        handler: () => 'files',
      })

    expect(app.safePath('/users')).toBe('/users')
    expect(app.safePath('/posts')).toBe('/posts')
    // @ts-expect-error
    app.safePath('/files/*')
    // @ts-expect-error
    app.safePath('/nonexistent', {})
    // @ts-expect-error
    app.safePath('/nonexistent')
    expect(app.safePath('/files/*', { '*': 'a/b.txt' })).toBe('/files/a/b.txt')
  })

  test('handles paths with required parameters', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
      .get('/posts/:postId/comments/:commentId', ({ params }) => params)

    expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
    // @ts-expect-error
    app.safePath('/nonusers/:id', { id: '123' })
    // @ts-expect-error
    app.safePath('/users/:nonid', { nonid: '123' })
    expect(
      app.safePath('/posts/:postId/comments/:commentId', {
        postId: 'abc',
        commentId: '456',
      }),
    ).toBe('/posts/abc/comments/456')
  })

  test('handles numeric parameter values', () => {
    const app = new Spiceflow().get('/users/:id', ({ params }) => params.id)

    expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
    expect(app.safePath('/users/:id', { id: '0' })).toBe('/users/0')
  })

  test('handles empty parameters object', () => {
    const app = new Spiceflow().get('/static', () => 'static')

    expect(app.safePath('/static')).toBe('/static')
  })

  test('all HTTP methods are available in safePath', async () => {
    // Create app with all routes first so TypeScript knows about all paths
    const app = new Spiceflow()
      .get('/api/users', () => 'get users')
      .post('/api/users', () => 'create user')
      .put('/api/users/:id', () => 'update user')
      .patch('/api/users/:id', () => 'patch user')
      .delete('/api/users/:id', () => 'delete user')
      .head('/api/status', () => 'status')
      .options('/api/cors', () => 'cors')
      .route({
        method: 'GET',
        path: '/api/custom',
        handler: () => 'custom route',
      })

    // All routes should be accessible via safePath outside handlers
    expect(app.safePath('/api/users')).toBe('/api/users')
    expect(app.safePath('/api/users/:id', { id: '123' })).toBe('/api/users/123')
    expect(app.safePath('/api/status')).toBe('/api/status')
    expect(app.safePath('/api/cors')).toBe('/api/cors')
    expect(app.safePath('/api/custom')).toBe('/api/custom')

    // Test that safePath works inside a route handler by creating a separate test
    const testApp = new Spiceflow()
      .get('/target', () => 'target')
      .get('/source', function () {
        // Should be able to call safePath from inside handler
        return this.safePath('/target')
      })

    const res = await testApp.handle(
      new Request('http://localhost/source', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toBe('/target')
  })

  test('paths not in app cause TypeScript errors', () => {
    const app = new Spiceflow()
      .get('/api/users', () => 'users')
      .post('/api/posts', () => 'posts')
      .put('/api/settings/:id', () => 'settings')

    // Valid paths work
    expect(app.safePath('/api/users')).toBe('/api/users')
    expect(app.safePath('/api/posts')).toBe('/api/posts')
    expect(app.safePath('/api/settings/:id', { id: '1' })).toBe(
      '/api/settings/1',
    )

    // Invalid paths should cause TypeScript errors
    // @ts-expect-error - Path not defined in app
    app.safePath('/api/nonexistent')

    // @ts-expect-error - Path not defined in app
    app.safePath('/completely/different/path')

    // @ts-expect-error - Path not defined in app
    app.safePath('/api/users/invalid')

    // @ts-expect-error - Wrong parameter name
    app.safePath('/api/settings/:wrongParam', { wrongParam: '1' })
  })

  test('safePath works with all method shorthand functions', () => {
    const app = new Spiceflow()
      .get('/get-route', () => 'get')
      .post('/post-route', () => 'post')
      .put('/put-route', () => 'put')
      .patch('/patch-route', () => 'patch')
      .delete('/delete-route', () => 'delete')
      .head('/head-route', () => 'head')
      .options('/options-route', () => 'options')
      .all('/all-route', () => 'all')

    // All method shortcuts should make paths available in safePath
    expect(app.safePath('/get-route')).toBe('/get-route')
    expect(app.safePath('/post-route')).toBe('/post-route')
    expect(app.safePath('/put-route')).toBe('/put-route')
    expect(app.safePath('/patch-route')).toBe('/patch-route')
    expect(app.safePath('/delete-route')).toBe('/delete-route')
    expect(app.safePath('/head-route')).toBe('/head-route')
    expect(app.safePath('/options-route')).toBe('/options-route')
    expect(app.safePath('/all-route')).toBe('/all-route')

    // Invalid routes should fail
    // @ts-expect-error - Path not defined
    app.safePath('/invalid-route')
  })

  test('safePath works inside route handlers', async () => {
    const app = new Spiceflow()
      .get('/target', () => 'target reached')
      .post('/redirect-test', function () {
        // Should be able to reference other routes in the same app
        return this.safePath('/target')
      })

    const res = await app.handle(
      new Request('http://localhost/redirect-test', { method: 'POST' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toBe('/target')
  })

  test('safePath appends query params', () => {
    const app = new Spiceflow()
      .get('/search', () => 'results', {
        query: z.object({ q: z.string(), page: z.coerce.number() }),
      })
      .get('/users/:id', ({ params }) => params.id, {
        query: z.object({ fields: z.string() }),
      })

    expect(app.safePath('/search', { q: 'hello', page: 1 })).toBe(
      '/search?q=hello&page=1',
    )
    expect(
      app.safePath('/users/:id', { id: '42', fields: 'name' }),
    ).toBe('/users/42?fields=name')

    // @ts-expect-error - invalid query key 'invalid' not in schema
    app.safePath('/search', { invalid: 'x' })

    app.safePath('/users/:id', { id: '1', nonexistent: 'x' })
  })

  test('safePath with query params and no path params', () => {
    const app = new Spiceflow().get('/items', () => 'items', {
      query: z.object({ sort: z.string(), limit: z.coerce.number() }),
    })

    expect(
      app.safePath('/items', { sort: 'date', limit: 10 }),
    ).toBe('/items?sort=date&limit=10')

    // @ts-expect-error - wrong query key
    app.safePath('/items', { order: 'asc' })
  })

  test('safePath without query still works', () => {
    const app = new Spiceflow()
      .get('/simple', () => 'simple')
      .get('/with-query', () => 'q', {
        query: z.object({ x: z.string() }),
      })

    expect(app.safePath('/simple')).toBe('/simple')
    expect(app.safePath('/with-query')).toBe('/with-query')
  })

  test('safePath with .route and query', () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/api/search',
      query: z.object({ term: z.string() }),
      handler: () => 'search',
    })

    expect(
      app.safePath('/api/search', { term: 'test' }),
    ).toBe('/api/search?term=test')

    // @ts-expect-error - invalid query key for .route-based route
    app.safePath('/api/search', { wrong: 'x' })
  })

  test('safePath skips undefined/null query values', () => {
    const app = new Spiceflow().get('/filter', () => 'filter', {
      query: z.object({ a: z.string(), b: z.string().optional() }),
    })

    expect(
      app.safePath('/filter', { a: 'yes', b: undefined }),
    ).toBe('/filter?a=yes')
  })

  test('safePath query with basePath', () => {
    const app = new Spiceflow({ basePath: '/api' }).get(
      '/search',
      () => 'search',
      {
        query: z.object({ q: z.string() }),
      },
    )

    expect(
      app.safePath('/api/search', { q: 'hello' }),
    ).toBe('/api/search?q=hello')

    // @ts-expect-error - invalid query key with basePath
    app.safePath('/api/search', { wrong: 'x' })
  })

  test('safePath query with all HTTP method shorthands', () => {
    const app = new Spiceflow()
      .put('/put-q', () => 'put', {
        query: z.object({ x: z.string() }),
      })
      .patch('/patch-q', () => 'patch', {
        query: z.object({ y: z.coerce.number() }),
      })
      .delete('/del-q', () => 'del', {
        query: z.object({ confirm: z.boolean() }),
      })

    expect(app.safePath('/put-q', { x: 'val' })).toBe(
      '/put-q?x=val',
    )
    expect(app.safePath('/patch-q', { y: 5 })).toBe(
      '/patch-q?y=5',
    )
    expect(app.safePath('/del-q', { confirm: true })).toBe(
      '/del-q?confirm=true',
    )

    // @ts-expect-error - wrong query key on put
    app.safePath('/put-q', { wrong: 'x' })

    // @ts-expect-error - wrong query key on patch
    app.safePath('/patch-q', { wrong: 1 })

    // @ts-expect-error - wrong query key on delete
    app.safePath('/del-q', { wrong: true })
  })

  test('safePath routes without query schema accept arbitrary query at runtime', () => {
    const app = new Spiceflow().get('/no-schema', () => 'ok')

    expect(
      app.safePath('/no-schema', { anything: 'works' }),
    ).toBe('/no-schema?anything=works')
  })

  test('safePath works with .page() routes', () => {
    const app = new Spiceflow()
      .page('/', async () => 'Home')
      .page('/about', async () => 'About')
      .page('/users/:id', async ({ params }) => params.id)

    expect(app.safePath('/')).toBe('/')
    expect(app.safePath('/about')).toBe('/about')
    expect(app.safePath('/users/:id', { id: '42' })).toBe('/users/42')
    // @ts-expect-error - invalid path
    app.safePath('/nonexistent')
  })

  test('safePath works inside route handler via app closure, including later routes', async () => {
    const app = new Spiceflow()
      .get('/about', () => {
        return app.safePath('/users/:id', { id: '42' })
      })
      .get('/users/:id', ({ params }) => params.id)

    const res = await app.handle(new Request('http://localhost/about'))
    expect(await res.json()).toBe('/users/42')
  })

  test('safePath works inside route handler via this for earlier routes', async () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
      .get('/about', function () {
        return this.safePath('/users/:id', { id: '42' })
      })

    const res = await app.handle(new Request('http://localhost/about'))
    expect(await res.json()).toBe('/users/42')
  })

  test('safePath works with .staticPage() routes', () => {
    const app = new Spiceflow()
      .staticPage('/docs')
      .staticPage('/changelog')

    expect(app.safePath('/docs')).toBe('/docs')
    expect(app.safePath('/changelog')).toBe('/changelog')
    // @ts-expect-error - invalid path
    app.safePath('/nonexistent')
  })

  test('page() object API with query schema', () => {
    const app = new Spiceflow()
      .page({
        path: '/search',
        query: z.object({ q: z.string(), page: z.number().optional() }),
        handler: async ({ query }) => {
          return `Results for: ${query.q}`
        },
      })

    expect(app.safePath('/search', { q: 'hello' })).toBe('/search?q=hello')
    expect(app.safePath('/search', { q: 'hello', page: 2 })).toBe('/search?q=hello&page=2')
    // @ts-expect-error - invalid query param
    app.safePath('/search', { wrong: 'x' })
  })

  test('page() object API with params and query', () => {
    const app = new Spiceflow()
      .page({
        path: '/users/:id',
        query: z.object({ tab: z.string().optional() }),
        handler: async ({ params, query }) => {
          return `User ${params.id}, tab: ${query.tab}`
        },
      })

    expect(app.safePath('/users/:id', { id: '42' })).toBe('/users/42')
    expect(app.safePath('/users/:id', { id: '42', tab: 'profile' })).toBe('/users/42?tab=profile')
  })

  test('page() positional API still works without query', () => {
    const app = new Spiceflow()
      .page('/about', async () => 'About')

    expect(app.safePath('/about')).toBe('/about')
  })

  test('staticPage() object API with query schema', () => {
    const app = new Spiceflow()
      .staticPage({
        path: '/docs',
        query: z.object({ section: z.string().optional() }),
        handler: async ({ query }) => {
          return `Docs: ${query.section}`
        },
      })

    expect(app.safePath('/docs', { section: 'api' })).toBe('/docs?section=api')
    // @ts-expect-error - invalid query param
    app.safePath('/docs', { wrong: 'x' })
  })
})

describe('createSafePath', () => {
  test('works with simple paths', () => {
    const app = new Spiceflow()
      .get('/users', () => 'users')
      .get('/posts', () => 'posts')

    const safePath = createSafePath(app)
    expect(safePath('/users')).toBe('/users')
    expect(safePath('/posts')).toBe('/posts')
    // @ts-expect-error - invalid path
    safePath('/nonexistent')
  })

  test('works with path params', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
      .get('/posts/:postId/comments/:commentId', ({ params }) => params)

    const safePath = createSafePath(app)
    expect(safePath('/users/:id', { id: '123' })).toBe('/users/123')
    expect(
      safePath('/posts/:postId/comments/:commentId', {
        postId: 'abc',
        commentId: '456',
      }),
    ).toBe('/posts/abc/comments/456')
    // @ts-expect-error - wrong path
    safePath('/wrong/:id', { id: '1' })
  })

  test('works with query params and rejects invalid keys', () => {
    const app = new Spiceflow()
      .get('/search', () => 'results', {
        query: z.object({ q: z.string(), page: z.coerce.number() }),
      })

    const safePath = createSafePath(app)
    expect(safePath('/search', { q: 'hello', page: 1 })).toBe(
      '/search?q=hello&page=1',
    )

    // @ts-expect-error - invalid query key
    safePath('/search', { invalid: 'x' })
  })

  test('works with both path and query params', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id, {
        query: z.object({ fields: z.string() }),
      })

    const safePath = createSafePath(app)
    expect(
      safePath('/users/:id', { id: '42', fields: 'name' }),
    ).toBe('/users/42?fields=name')

    safePath('/users/:id', { id: '1', wrong: 'x' })
  })

  test('works with wildcard paths', () => {
    const app = new Spiceflow().get('/files/*', () => 'files')

    const safePath = createSafePath(app)
    expect(safePath('/files/*', { '*': 'a/b.txt' })).toBe('/files/a/b.txt')
  })

  test('rejects invalid query keys across multiple routes', () => {
    const app = new Spiceflow()
      .get('/items', () => 'items', {
        query: z.object({ sort: z.string(), limit: z.coerce.number() }),
      })
      .post('/create', () => 'created', {
        query: z.object({ dryRun: z.boolean() }),
      })

    const safePath = createSafePath(app)

    expect(safePath('/items', { sort: 'name', limit: 10 })).toBe(
      '/items?sort=name&limit=10',
    )
    expect(safePath('/create', { dryRun: true })).toBe(
      '/create?dryRun=true',
    )

    // @ts-expect-error - 'order' not in /items query schema
    safePath('/items', { order: 'asc' })

    // @ts-expect-error - 'verbose' not in /create query schema
    safePath('/create', { verbose: true })
  })

  test('works with .route and rejects invalid query keys', () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/api/data',
      query: z.object({ format: z.string() }),
      handler: () => 'data',
    })

    const safePath = createSafePath(app)
    expect(safePath('/api/data', { format: 'json' })).toBe(
      '/api/data?format=json',
    )

    // @ts-expect-error - invalid query key on .route
    safePath('/api/data', { type: 'csv' })

    // @ts-expect-error - invalid path
    safePath('/api/other')
  })

  test('works with basePath and rejects invalid query keys', () => {
    const app = new Spiceflow({ basePath: '/v2' }).get(
      '/users',
      () => 'users',
      {
        query: z.object({ active: z.boolean() }),
      },
    )

    const safePath = createSafePath(app)
    expect(safePath('/v2/users', { active: true })).toBe(
      '/v2/users?active=true',
    )

    // @ts-expect-error - invalid query key
    safePath('/v2/users', { status: 'active' })

    // @ts-expect-error - path without basePath prefix
    safePath('/users')
  })

  test('without query schema allows arbitrary query', () => {
    const app = new Spiceflow().get('/free', () => 'ok')

    const safePath = createSafePath(app)
    expect(
      safePath('/free', { any: 'value', works: 'here' }),
    ).toBe('/free?any=value&works=here')
  })

  test('partial query params are accepted', () => {
    const app = new Spiceflow().get('/filter', () => 'filter', {
      query: z.object({ a: z.string(), b: z.string(), c: z.string() }),
    })

    const safePath = createSafePath(app)
    expect(safePath('/filter', { a: 'only-a' })).toBe(
      '/filter?a=only-a',
    )
    expect(safePath('/filter', { a: '1', c: '3' })).toBe(
      '/filter?a=1&c=3',
    )
  })

  test('mixed routes with and without query schemas', () => {
    const app = new Spiceflow()
      .get('/typed', () => 'typed', {
        query: z.object({ x: z.string() }),
      })
      .get('/untyped', () => 'untyped')
      .get('/also-typed/:id', ({ params }) => params.id, {
        query: z.object({ verbose: z.boolean() }),
      })

    const safePath = createSafePath(app)

    expect(safePath('/typed', { x: 'val' })).toBe('/typed?x=val')
    expect(safePath('/untyped', { anything: 'goes' })).toBe(
      '/untyped?anything=goes',
    )
    expect(
      safePath('/also-typed/:id', { id: '1', verbose: true }),
    ).toBe('/also-typed/1?verbose=true')

    // @ts-expect-error - wrong key on typed route
    safePath('/typed', { wrong: 'x' })

    safePath('/also-typed/:id', { id: '1', wrong: true })
  })
})

test('composition with .use() works with state and onError - child app gets same state, errors caught by root', async () => {
  let rootErrorCalled = false
  let childErrorCalled = false
  let errorMessage = ''

  const childApp = new Spiceflow()
    .state('counter', 0)
    .onError(({ error }) => {
      childErrorCalled = true
      return new Response('Child error<', { status: 500 })
    })
    .use(({ state }) => {
      state.counter += 10
    })
    .get('/success', ({ state }) => ({ counter: state.counter }))
    .get('/error', ({ state }) => {
      state.counter += 5
      throw new Error('Child error occurred')
    })

  const rootApp = new Spiceflow()
    .state('counter', 100)
    .onError(({ error }) => {
      rootErrorCalled = true
      errorMessage = error.message
      return new Response('Root error handler', { status: 400 })
    })
    .use(({ state }) => {
      state.counter += 1
    })
    .use(childApp)

  // State starts from root app (100), then root middleware (+1), then child middleware (+10)
  const successRes = await rootApp.handle(
    new Request('http://localhost/success', { method: 'GET' }),
  )
  expect(successRes.status).toBe(200)
  expect(await successRes.json()).toEqual({ counter: 111 }) // 100 + 1 + 10

  // Test error case - root onError should catch child errors
  const errorRes = await rootApp.handle(
    new Request('http://localhost/error', { method: 'GET' }),
  )
  expect(errorRes.status).toBe(400)
  expect(await errorRes.text()).toBe('Root error handler')
  expect(rootErrorCalled).toBe(true)
  expect(childErrorCalled).toBe(false) // Child error handler should not be called
  expect(errorMessage).toBe('Child error occurred')
})

test('onError receives path parameter', async () => {
  let capturedPath = ''
  let capturedError: any = null

  const app = new Spiceflow()
    .get('/test/path/:id', ({ params }) => {
      throw new Error('Test error')
    })
    .post('/another/route', () => {
      throw new Error('Another error')
    })
    .onError(({ error, path }) => {
      capturedPath = path
      capturedError = error
      return new Response('Error handled', { status: 500 })
    })

  // Test GET request
  const getRes = await app.handle(
    new Request('http://localhost/test/path/123?foo=bar', { method: 'GET' }),
  )
  expect(getRes.status).toBe(500)
  expect(capturedPath).toBe('/test/path/123?foo=bar')
  expect(capturedError.message).toBe('Test error')

  // Test POST request
  const postRes = await app.handle(
    new Request('http://localhost/another/route', { method: 'POST' }),
  )
  expect(postRes.status).toBe(500)
  expect(capturedPath).toBe('/another/route')
  expect(capturedError.message).toBe('Another error')
})

test('error status validation', async () => {
  // Test invalid status codes are normalized to 500
  const testCases = [
    { status: 'invalid', expected: 500 }, // non-number status
    { status: 99, expected: 500 }, // too low
    { status: 600, expected: 500 }, // too high
    { status: 404, expected: 404 }, // valid status
    { status: undefined, expected: 500 }, // undefined defaults to 500
  ]

  for (const { status, expected } of testCases) {
    const app = new Spiceflow().get('/test', () => {
      const error: any = new Error('Test error')
      error.status = status
      throw error
    })

    const res = await app.handle(
      new Request('http://localhost/test', { method: 'GET' }),
    )
    expect(res.status).toBe(expected)
  }
})

test('error statusCode fallback', async () => {
  // Test that statusCode is used when status is not present
  const testCases = [
    { statusCode: 422, expected: 422 }, // valid statusCode
    { statusCode: 'invalid', expected: 500 }, // invalid statusCode
    { status: 400, statusCode: 422, expected: 400 }, // status takes precedence
  ]

  for (const { statusCode, expected, status } of testCases) {
    const app = new Spiceflow().get('/test', () => {
      const error: any = new Error('Test error')
      if (status !== undefined) error.status = status
      if (statusCode !== undefined) error.statusCode = statusCode
      throw error
    })

    const res = await app.handle(
      new Request('http://localhost/test', { method: 'GET' }),
    )
    expect(res.status).toBe(expected)
  }
})

test('returning Error from handler behaves like throwing it', async () => {
  const app = new Spiceflow().get('/test', () => {
    return new Error('something went wrong')
  })

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(500)
  const body = await res.json()
  expect(body).toMatchInlineSnapshot(`
    {
      "message": "something went wrong",
    }
  `)
})

test('returning Error with status property uses that status', async () => {
  const app = new Spiceflow().get('/test', () => {
    return Object.assign(new Error('bad request'), { status: 400 })
  })

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body).toMatchInlineSnapshot(`
    {
      "message": "bad request",
      "status": 400,
    }
  `)
})

test('returning Error triggers onError handlers', async () => {
  let capturedError: any = null
  const app = new Spiceflow()
    .get('/test', () => {
      return Object.assign(new Error('oops'), { status: 422 })
    })
    .onError(({ error }) => {
      capturedError = error
      return new Response('handled', { status: 422 })
    })

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(422)
  expect(await res.text()).toBe('handled')
  expect(capturedError).toBeInstanceOf(Error)
  expect(capturedError.message).toBe('oops')
})

test('throwing Error from handler gives status 500 with message', async () => {
  const app = new Spiceflow().get('/test', () => {
    throw new Error('something went wrong')
  })

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(500)
  const body = await res.json()
  expect(body).toMatchInlineSnapshot(`
    {
      "message": "something went wrong",
    }
  `)
})

test('throwing Error with status property uses that status', async () => {
  const app = new Spiceflow().get('/test', () => {
    throw Object.assign(new Error('bad request'), { status: 400 })
  })

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body).toMatchInlineSnapshot(`
    {
      "message": "bad request",
      "status": 400,
    }
  `)
})

test('route override - same method and path, second route wins', async () => {
  const app = new Spiceflow()
    .get('/test', () => 'first handler')
    .get('/test', () => 'second handler')

  const res = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchInlineSnapshot(`"second handler"`)
})

test('route override - different methods on same path work independently', async () => {
  const app = new Spiceflow()
    .get('/test', () => 'get handler')
    .post('/test', () => 'post handler')
    .get('/test', () => 'get override')

  const getRes = await app.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(getRes.status).toBe(200)
  expect(await getRes.json()).toMatchInlineSnapshot(`"get override"`)

  const postRes = await app.handle(
    new Request('http://localhost/test', { method: 'POST' }),
  )
  expect(postRes.status).toBe(200)
  expect(await postRes.json()).toMatchInlineSnapshot(`"post handler"`)
})

test('route override with .use() - parent app routes take precedence over child app routes', async () => {
  const childApp = new Spiceflow()
    .get('/shared', () => 'child handler')
    .get('/child-only', () => 'child only')

  const parentApp = new Spiceflow()
    .get('/shared', () => 'parent handler')
    .get('/parent-only', () => 'parent only')
    .use(childApp)

  // Parent app route takes precedence over child app route
  const sharedRes = await parentApp.handle(
    new Request('http://localhost/shared', { method: 'GET' }),
  )
  expect(sharedRes.status).toBe(200)
  expect(await sharedRes.json()).toMatchInlineSnapshot(`"parent handler"`)

  // Parent-only route works as expected
  const parentOnlyRes = await parentApp.handle(
    new Request('http://localhost/parent-only', { method: 'GET' }),
  )
  expect(parentOnlyRes.status).toBe(200)
  expect(await parentOnlyRes.json()).toMatchInlineSnapshot(`"parent only"`)

  // Child-only route works as expected
  const childOnlyRes = await parentApp.handle(
    new Request('http://localhost/child-only', { method: 'GET' }),
  )
  expect(childOnlyRes.status).toBe(200)
  expect(await childOnlyRes.json()).toMatchInlineSnapshot(`"child only"`)
})

test('route override with .use() - parent app routes always win, regardless of order', async () => {
  const firstChildApp = new Spiceflow().get('/shared', () => 'first child')

  const secondChildApp = new Spiceflow().get('/shared', () => 'second child')

  const parentApp = new Spiceflow()
    .get('/shared', () => 'parent')
    .use(firstChildApp)
    .use(secondChildApp)

  // Parent route always wins, regardless of child apps
  const res = await parentApp.handle(
    new Request('http://localhost/shared', { method: 'GET' }),
  )
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchInlineSnapshot(`"parent"`)
})

test('route override with nested .use() - first matching parent route wins', async () => {
  const deepestApp = new Spiceflow().get('/test', () => 'deepest')

  const middleApp = new Spiceflow().get('/test', () => 'middle').use(deepestApp)

  const rootApp = new Spiceflow().get('/test', () => 'root').use(middleApp)

  // Root app route wins over all nested routes
  const res = await rootApp.handle(
    new Request('http://localhost/test', { method: 'GET' }),
  )
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchInlineSnapshot(`"root"`)
})

test('route override with .use() - child routes are accessible when no parent route exists', async () => {
  const firstChildApp = new Spiceflow().get(
    '/child1-route',
    () => 'first child',
  )

  const secondChildApp = new Spiceflow()
    .get('/child2-route', () => 'second child')
    .get('/shared-child', () => 'second child shared')

  const thirdChildApp = new Spiceflow().get(
    '/shared-child',
    () => 'third child shared',
  )

  const parentApp = new Spiceflow()
    .get('/parent-only', () => 'parent')
    .use(firstChildApp)
    .use(secondChildApp)
    .use(thirdChildApp)

  // First child route works
  const child1Res = await parentApp.handle(
    new Request('http://localhost/child1-route', { method: 'GET' }),
  )
  expect(child1Res.status).toBe(200)
  expect(await child1Res.json()).toMatchInlineSnapshot(`"first child"`)

  // Second child route works
  const child2Res = await parentApp.handle(
    new Request('http://localhost/child2-route', { method: 'GET' }),
  )
  expect(child2Res.status).toBe(200)
  expect(await child2Res.json()).toMatchInlineSnapshot(`"second child"`)

  // For conflicting child routes, first one wins (since no parent route exists)
  const sharedChildRes = await parentApp.handle(
    new Request('http://localhost/shared-child', { method: 'GET' }),
  )
  expect(sharedChildRes.status).toBe(200)
  expect(await sharedChildRes.json()).toMatchInlineSnapshot(
    `"second child shared"`,
  )
})

test('disableSuperJsonUnlessRpc is inherited by child apps', async () => {
  // Test that child apps inherit the flag from parent
  const childApp = new Spiceflow()
    .get('/date', () => ({ date: new Date('2024-01-01') }))

  const parentApp = new Spiceflow({ disableSuperJsonUnlessRpc: true })
    .use(childApp)

  // Regular request should not use superjson
  const regularRes = await parentApp.handle(
    new Request('http://localhost/date', { method: 'GET' })
  )
  expect(regularRes.status).toBe(200)
  const regularData = await regularRes.text()
  expect(regularData).not.toContain('__superjsonMeta')
  expect(regularData).toMatchInlineSnapshot(`"{"date":"2024-01-01T00:00:00.000Z"}"`)

  // RPC request should use superjson
  const rpcRes = await parentApp.handle(
    new Request('http://localhost/date', {
      method: 'GET',
      headers: { 'x-spiceflow-agent': 'spiceflow-client' }
    })
  )
  expect(rpcRes.status).toBe(200)
  const rpcData = await rpcRes.text()
  expect(rpcData).toContain('__superjsonMeta')
  expect(rpcData).toMatchInlineSnapshot(`"{"date":"2024-01-01T00:00:00.000Z","__superjsonMeta":{"values":{"date":["Date"]}}}"`)
})

test('child app inherits disableSuperJsonUnlessRpc from parent even if set to false', async () => {
  // Parent has the flag set to true
  const parentApp = new Spiceflow({ disableSuperJsonUnlessRpc: true })

  // Child explicitly sets the flag to false (wants to keep using superjson)
  const childApp = new Spiceflow()
    .get('/date', () => ({ date: new Date('2024-01-01') }))

  parentApp.use(childApp)

  // After being mounted, child should inherit parent's setting
  // Regular request should not use superjson because parent has flag set
  const regularRes = await parentApp.handle(
    new Request('http://localhost/date', { method: 'GET' })
  )
  expect(regularRes.status).toBe(200)
  const regularData = await regularRes.text()
  expect(regularData).not.toContain('__superjsonMeta')
  expect(regularData).toMatchInlineSnapshot(`"{"date":"2024-01-01T00:00:00.000Z"}"`)
})

test('/* as not-found handler - registered first', async () => {
  const app = new Spiceflow()
    // Register catch-all first
    .get('/*', () => ({ message: 'Not found', path: 'catch-all' }))
    // Then register specific routes
    .get('/', () => ({ message: 'Home' }))
    .get('/users', () => ({ message: 'Users list' }))
    .get('/users/:id', ({ params }) => ({ message: 'User', id: params.id }))
    .post('/api/data', () => ({ message: 'Data posted' }))

  // Specific routes should still work (not be caught by /*)
  const homeRes = await app.handle(
    new Request('http://localhost/', { method: 'GET' })
  )
  expect(homeRes.status).toBe(200)
  expect(await homeRes.json()).toEqual({ message: 'Home' })

  const usersRes = await app.handle(
    new Request('http://localhost/users', { method: 'GET' })
  )
  expect(usersRes.status).toBe(200)
  expect(await usersRes.json()).toEqual({ message: 'Users list' })

  const userRes = await app.handle(
    new Request('http://localhost/users/123', { method: 'GET' })
  )
  expect(userRes.status).toBe(200)
  expect(await userRes.json()).toEqual({ message: 'User', id: '123' })

  const apiRes = await app.handle(
    new Request('http://localhost/api/data', { method: 'POST' })
  )
  expect(apiRes.status).toBe(200)
  expect(await apiRes.json()).toEqual({ message: 'Data posted' })

  // Non-existent routes should be caught by /*
  const notFoundRes = await app.handle(
    new Request('http://localhost/non-existent', { method: 'GET' })
  )
  expect(notFoundRes.status).toBe(200)
  expect(await notFoundRes.json()).toEqual({ message: 'Not found', path: 'catch-all' })

  const deepNotFoundRes = await app.handle(
    new Request('http://localhost/some/deep/path', { method: 'GET' })
  )
  expect(deepNotFoundRes.status).toBe(200)
  expect(await deepNotFoundRes.json()).toEqual({ message: 'Not found', path: 'catch-all' })

  // Wrong method should still return 404 (not caught by GET /*)
  const wrongMethodRes = await app.handle(
    new Request('http://localhost/users', { method: 'DELETE' })
  )
  expect(wrongMethodRes.status).toBe(404)
})

test('/* as not-found handler - registered last', async () => {
  const app = new Spiceflow()
    // Register specific routes first
    .get('/', () => ({ message: 'Home' }))
    .get('/users', () => ({ message: 'Users list' }))
    .get('/users/:id', ({ params }) => ({ message: 'User', id: params.id }))
    .post('/api/data', () => ({ message: 'Data posted' }))
    // Register catch-all last
    .get('/*', () => ({ message: 'Not found', path: 'catch-all' }))

  // Specific routes should still work
  const homeRes = await app.handle(
    new Request('http://localhost/', { method: 'GET' })
  )
  expect(homeRes.status).toBe(200)
  expect(await homeRes.json()).toEqual({ message: 'Home' })

  const usersRes = await app.handle(
    new Request('http://localhost/users', { method: 'GET' })
  )
  expect(usersRes.status).toBe(200)
  expect(await usersRes.json()).toEqual({ message: 'Users list' })

  const userRes = await app.handle(
    new Request('http://localhost/users/123', { method: 'GET' })
  )
  expect(userRes.status).toBe(200)
  expect(await userRes.json()).toEqual({ message: 'User', id: '123' })

  // Non-existent routes should be caught by /*
  const notFoundRes = await app.handle(
    new Request('http://localhost/non-existent', { method: 'GET' })
  )
  expect(notFoundRes.status).toBe(200)
  expect(await notFoundRes.json()).toEqual({ message: 'Not found', path: 'catch-all' })

  const deepNotFoundRes = await app.handle(
    new Request('http://localhost/some/deep/path', { method: 'GET' })
  )
  expect(deepNotFoundRes.status).toBe(200)
  expect(await deepNotFoundRes.json()).toEqual({ message: 'Not found', path: 'catch-all' })
})

test('/* with all methods as not-found handler', async () => {
  const app = new Spiceflow()
    .get('/api/users', () => ({ message: 'GET users' }))
    .post('/api/users', () => ({ message: 'POST users' }))
    // Catch-all for any method and any path
    .all('/*', () => ({ message: 'Custom 404', method: 'any' }))

  // Specific routes work
  const getUsersRes = await app.handle(
    new Request('http://localhost/api/users', { method: 'GET' })
  )
  expect(getUsersRes.status).toBe(200)
  expect(await getUsersRes.json()).toEqual({ message: 'GET users' })

  const postUsersRes = await app.handle(
    new Request('http://localhost/api/users', { method: 'POST' })
  )
  expect(postUsersRes.status).toBe(200)
  expect(await postUsersRes.json()).toEqual({ message: 'POST users' })

  // Non-existent paths are caught
  const notFoundGetRes = await app.handle(
    new Request('http://localhost/not-found', { method: 'GET' })
  )
  expect(notFoundGetRes.status).toBe(200)
  expect(await notFoundGetRes.json()).toEqual({ message: 'Custom 404', method: 'any' })

  // Different methods on non-existent paths are also caught
  const notFoundPostRes = await app.handle(
    new Request('http://localhost/not-found', { method: 'POST' })
  )
  expect(notFoundPostRes.status).toBe(200)
  expect(await notFoundPostRes.json()).toEqual({ message: 'Custom 404', method: 'any' })

  const notFoundDeleteRes = await app.handle(
    new Request('http://localhost/not-found', { method: 'DELETE' })
  )
  expect(notFoundDeleteRes.status).toBe(200)
  expect(await notFoundDeleteRes.json()).toEqual({ message: 'Custom 404', method: 'any' })

  // With trie router, ALL /* catches any method on any path, including DELETE on /api/users
  const wrongMethodRes = await app.handle(
    new Request('http://localhost/api/users', { method: 'DELETE' })
  )
  expect(wrongMethodRes.status).toBe(200)
  expect(await wrongMethodRes.json()).toEqual({ message: 'Custom 404', method: 'any' })
})

test('/* priority - more specific routes always win', async () => {
  const app = new Spiceflow()
    .get('/*', () => 'catch-all')
    .get('/users/*', () => 'users-catch-all')
    .get('/users/special/*', () => 'special-users-catch-all')
    .get('/users/special/exact', () => 'exact-match')

  // Most specific route wins
  const exactRes = await app.handle(
    new Request('http://localhost/users/special/exact', { method: 'GET' })
  )
  expect(exactRes.status).toBe(200)
  expect(await exactRes.json()).toBe('exact-match')

  // Next most specific catch-all wins
  const specialCatchRes = await app.handle(
    new Request('http://localhost/users/special/something', { method: 'GET' })
  )
  expect(specialCatchRes.status).toBe(200)
  expect(await specialCatchRes.json()).toBe('special-users-catch-all')

  // Users catch-all for other users paths
  const usersCatchRes = await app.handle(
    new Request('http://localhost/users/other', { method: 'GET' })
  )
  expect(usersCatchRes.status).toBe(200)
  expect(await usersCatchRes.json()).toBe('users-catch-all')

  // General catch-all for everything else
  const generalCatchRes = await app.handle(
    new Request('http://localhost/something-else', { method: 'GET' })
  )
  expect(generalCatchRes.status).toBe(200)
  expect(await generalCatchRes.json()).toBe('catch-all')
})

test(':param beats wildcard regardless of registration order', async () => {
  // wildcard registered first
  const app1 = new Spiceflow()
    .get('/users/*', () => 'wildcard')
    .get('/users/:id', () => 'param')

  const res1 = await app1.handle(
    new Request('http://localhost/users/123', { method: 'GET' })
  )
  expect(res1.status).toBe(200)
  expect(await res1.json()).toBe('param')

  // :param registered first
  const app2 = new Spiceflow()
    .get('/users/:id', () => 'param')
    .get('/users/*', () => 'wildcard')

  const res2 = await app2.handle(
    new Request('http://localhost/users/456', { method: 'GET' })
  )
  expect(res2.status).toBe(200)
  expect(await res2.json()).toBe('param')
})

describe('path param edge cases with special characters', () => {
  // hono trie router does not support prefix matching — returns 404 instead
  test('prefix before param like /v/on-:event returns 404 on trie router', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/on-:event',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/on-click', { method: 'GET' }),
    )
    expect(res.status).toBe(404)
  })

  test('suffix after param like /v/:id.patch treats dot as part of param name', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id.patch',
      handler: ({ params }) => params,
    })
    // the param name becomes "id.patch", not "id" with suffix ".patch"
    const res = await app.handle(
      new Request('http://localhost/v/123', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchInlineSnapshot(`
      {
        "id.patch": "123",
      }
    `)
  })

  test('/v/:id.patch does NOT match /v/123.patch as id=123', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id.patch',
      handler: ({ params }) => params,
    })
    // requesting /v/123.patch — the param "id.patch" gets value "123.patch"
    const res = await app.handle(
      new Request('http://localhost/v/123.patch', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchInlineSnapshot(`
      {
        "id.patch": "123.patch",
      }
    `)
  })

  test('param with dash suffix like /v/:id-details treats dash as part of param name', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id-details',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/abc', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id-details": "abc",
      }
    `)
  })

  test('param with underscore suffix like /v/:id_info treats underscore as part of param name', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id_info',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/xyz', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id_info": "xyz",
      }
    `)
  })

  test('param with colon-like path /v/:id:format treats entire thing as one param', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id:format',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/test', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    // second colon is part of the param name since @medley/router splits on / or $
    expect(body).toMatchInlineSnapshot(`
      {
        "id:format": "test",
      }
    `)
  })

  // hono trie router does not support prefix matching — returns 404 instead
  test('multiple prefixed params in one segment like /v/pre-:a-mid-:b returns 404 on trie router', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/pre-:a-mid-:b',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/pre-hello-mid-world', { method: 'GET' }),
    )
    expect(res.status).toBe(404)
  })

  test('param with semicolon like /v/:id;type is one param name', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id;type',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/foo', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id;type": "foo",
      }
    `)
  })

  test('param with comma like /v/:a,:b is one param name', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:a,:b',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/hello', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "a,:b": "hello",
      }
    `)
  })

  // hono trie router does not support prefix matching — returns 404 instead
  test('version prefix like /api/v:version returns 404 on trie router', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/api/v:version',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/api/v2', { method: 'GET' }),
    )
    expect(res.status).toBe(404)
  })

  test('dot in static path works fine', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id/download.tar.gz',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/abc/download.tar.gz', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id": "abc",
      }
    `)
  })

  test('param captures dots in value since it matches until next slash', async () => {
    const app = new Spiceflow().route({
      method: 'GET',
      path: '/v/:id',
      handler: ({ params }) => params,
    })
    const res = await app.handle(
      new Request('http://localhost/v/file.tar.gz', { method: 'GET' }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "id": "file.tar.gz",
      }
    `)
  })
})

describe('use preserves type safety', () => {
  test('safePath sees API routes from mounted subapp', () => {
    const child = new Spiceflow()
      .get('/users', () => [])
      .get('/users/:id', () => ({}))

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    expect(app.safePath('/health')).toBe('/health')
    expect(app.safePath('/users')).toBe('/users')
    expect(app.safePath('/users/:id', { id: '42' })).toBe('/users/42')
    // @ts-expect-error - route doesn't exist on parent or child
    app.safePath('/nonexistent')
  })

  test('safePath sees routes from subapp with basePath', () => {
    const child = new Spiceflow({ basePath: '/api' })
      .get('/users', () => [])
      .get('/items/:id', () => ({}))

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    expect(app.safePath('/health')).toBe('/health')
    expect(app.safePath('/api/users')).toBe('/api/users')
    expect(app.safePath('/api/items/:id', { id: '99' })).toBe('/api/items/99')
    // @ts-expect-error - unprefixed path shouldn't work
    app.safePath('/users')
    // @ts-expect-error - nonexistent child route
    app.safePath('/api/nonexistent')
  })

  test('safePath sees page routes from mounted subapp', () => {
    const child = new Spiceflow()
      .page('/dashboard', async () => 'Dashboard')
      .page('/settings', async () => 'Settings')

    const app = new Spiceflow()
      .page('/', async () => 'Home')
      .use(child)

    expect(app.safePath('/')).toBe('/')
    expect(app.safePath('/dashboard')).toBe('/dashboard')
    expect(app.safePath('/settings')).toBe('/settings')
    // @ts-expect-error - nonexistent page
    app.safePath('/nonexistent')
  })

  test('safePath sees page routes from subapp with basePath', () => {
    const child = new Spiceflow({ basePath: '/app' })
      .page('/dashboard', async () => 'Dashboard')
      .page('/profile/:id', async ({ params }) => params.id)

    const app = new Spiceflow()
      .page('/', async () => 'Home')
      .use(child)

    expect(app.safePath('/')).toBe('/')
    expect(app.safePath('/app/dashboard')).toBe('/app/dashboard')
    expect(app.safePath('/app/profile/:id', { id: '42' })).toBe('/app/profile/42')
    // @ts-expect-error - unprefixed path
    app.safePath('/dashboard')
    // @ts-expect-error - nonexistent
    app.safePath('/app/nonexistent')
  })

  test('safePath sees query schemas from mounted subapp', () => {
    const child = new Spiceflow({ basePath: '/api' }).get(
      '/search',
      ({ query }) => query,
      { query: z.object({ q: z.string(), limit: z.coerce.number().optional() }) },
    )

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    expect(app.safePath('/api/search', { q: 'hello', limit: 10 })).toBe(
      '/api/search?q=hello&limit=10',
    )
    // @ts-expect-error - invalid query key
    app.safePath('/api/search', { wrong: 'x' })
  })

  test('safePath sees page query schemas from mounted subapp', () => {
    const child = new Spiceflow({ basePath: '/app' }).page({
      path: '/search',
      query: z.object({ q: z.string() }),
      handler: async ({ query }) => `Results: ${query.q}`,
    })

    const app = new Spiceflow()
      .page('/', async () => 'Home')
      .use(child)

    expect(app.safePath('/app/search', { q: 'test' })).toBe('/app/search?q=test')
    // @ts-expect-error - invalid query key
    app.safePath('/app/search', { wrong: 'x' })
  })

  test('safePath sees staticPage routes from mounted subapp', () => {
    const child = new Spiceflow({ basePath: '/docs' })
      .staticPage('/intro')
      .staticPage('/changelog')

    const app = new Spiceflow()
      .page('/', async () => 'Home')
      .use(child)

    expect(app.safePath('/')).toBe('/')
    expect(app.safePath('/docs/intro')).toBe('/docs/intro')
    expect(app.safePath('/docs/changelog')).toBe('/docs/changelog')
    // @ts-expect-error - nonexistent
    app.safePath('/docs/nonexistent')
  })

  test('createSafePath works with mounted subapps', () => {
    const child = new Spiceflow({ basePath: '/api' })
      .get('/users', () => [])
      .get('/users/:id', () => ({}))

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    const safePath = createSafePath(app)
    expect(safePath('/health')).toBe('/health')
    expect(safePath('/api/users')).toBe('/api/users')
    expect(safePath('/api/users/:id', { id: '7' })).toBe('/api/users/7')
    // @ts-expect-error - nonexistent
    safePath('/nonexistent')
  })

  test('client sees routes from mounted subapp', async () => {
    const child = new Spiceflow({ basePath: '/api' })
      .get('/items', () => [1, 2, 3])
      .post('/items', () => ({ created: true }))

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    const client = createSpiceflowClient(app)
    const getRes = await client.api.items.get()
    if (getRes.error) throw getRes.error
    expect(getRes.data).toEqual([1, 2, 3])

    const postRes = await client.api.items.post()
    if (postRes.error) throw postRes.error
    expect(postRes.data).toEqual({ created: true })

    // @ts-expect-error - nonexistent route on client
    client.api.nonexistent
  })

  test('fetch client sees routes from mounted subapp', async () => {
    const child = new Spiceflow({ basePath: '/v2' })
      .get('/status', () => ({ ok: true }))
      .post('/echo', async ({ request }) => await request.json(), {
        body: z.object({ msg: z.string() }),
      })

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    const f = createSpiceflowFetch(app)

    const status = await f('/v2/status')
    if (status instanceof Error) throw status
    expect(status).toEqual({ ok: true })

    const echo = await f('/v2/echo', {
      method: 'POST',
      body: { msg: 'hello' },
    })
    if (echo instanceof Error) throw echo
    expect(echo).toEqual({ msg: 'hello' })
  })

  test('deeply nested use chains preserve type safety', () => {
    const grandchild = new Spiceflow().get('/data', () => 'data')
    const child = new Spiceflow().get('/items', () => []).use(grandchild)
    const app = new Spiceflow().get('/health', () => 'ok').use(child)

    expect(app.safePath('/health')).toBe('/health')
    expect(app.safePath('/items')).toBe('/items')
    expect(app.safePath('/data')).toBe('/data')
    // @ts-expect-error - nonexistent
    app.safePath('/nonexistent')
  })

  test('deeply nested use with basePaths prefixes RoutePaths correctly', () => {
    const grandchild = new Spiceflow({ basePath: '/v1' }).get(
      '/data',
      () => 'data',
    )
    const child = new Spiceflow({ basePath: '/api' }).use(grandchild)
    const app = new Spiceflow().get('/health', () => 'ok').use(child)

    expect(app.safePath('/health')).toBe('/health')
    // child basePath + grandchild basePath + route = /api/v1/data
    expect(app.safePath('/api/v1/data')).toBe('/api/v1/data')
    // @ts-expect-error - unprefixed grandchild path should not work
    app.safePath('/v1/data')
    // @ts-expect-error - nonexistent
    app.safePath('/api/nonexistent')
  })

  test('fetch client rejects unknown paths', () => {
    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .get('/users/:id', () => ({}))
      .post('/items', () => ({ created: true }))

    const f = createSpiceflowFetch(app)

    // Known routes are accepted
    f('/health')
    f('/users/:id', { params: { id: '1' } })
    f('/items', { method: 'POST' })

    // @ts-expect-error - unknown path rejected
    f('/nonexistent')
    // @ts-expect-error - unknown path rejected
    f('/users')
  })

  test('fetch client rejects unknown paths from mounted subapp', () => {
    const child = new Spiceflow({ basePath: '/api' })
      .get('/data', () => 'data')

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    const f = createSpiceflowFetch(app)

    // Known routes accepted
    f('/health')
    f('/api/data')

    // @ts-expect-error - unknown path rejected
    f('/api/nonexistent')
    // @ts-expect-error - unknown path rejected
    f('/data')
  })

  test('basePath alone is not a valid safePath when child has no root route', () => {
    const child = new Spiceflow({ basePath: '/api' }).get(
      '/data',
      () => 'data',
    )
    const app = new Spiceflow().use(child)

    expect(app.safePath('/api/data')).toBe('/api/data')
    // @ts-expect-error - /api alone is not a route, child has no handler at '/'
    app.safePath('/api')
  })

  test('multiple subapps merged together', () => {
    const auth = new Spiceflow({ basePath: '/auth' })
      .post('/login', () => ({ token: 'x' }))
      .post('/logout', () => 'ok')

    const users = new Spiceflow({ basePath: '/users' }).get(
      '/:id',
      () => ({}),
    )

    const app = new Spiceflow().get('/health', () => 'ok').use(auth).use(users)

    expect(app.safePath('/health')).toBe('/health')
    expect(app.safePath('/auth/login')).toBe('/auth/login')
    expect(app.safePath('/auth/logout')).toBe('/auth/logout')
    expect(app.safePath('/users/:id', { id: '5' })).toBe('/users/5')
    // @ts-expect-error - nonexistent
    app.safePath('/nonexistent')
  })

  test('page routes excluded from proxy client types', () => {
    const child = new Spiceflow({ basePath: '/app' })
      .page('/dashboard', async () => 'Dashboard')
      .get('/api/data', () => ({ items: [] }))

    const app = new Spiceflow().use(child)
    const client = createSpiceflowClient(app)

    // API route is accessible on client
    client.app.api.data.get()

    // @ts-expect-error - page route not in ClientRoutes
    client.app.dashboard
  })

  test('staticPage routes excluded from proxy client types', () => {
    const child = new Spiceflow({ basePath: '/docs' })
      .staticPage('/intro')
      .get('/api/versions', () => [1, 2])

    const app = new Spiceflow().use(child)
    const client = createSpiceflowClient(app)

    // API route is accessible
    client.docs.api.versions.get()

    // @ts-expect-error - staticPage route not in ClientRoutes
    client.docs.intro
  })

  test('page routes excluded from fetch client ClientRoutes', () => {
    const child = new Spiceflow({ basePath: '/app' })
      .page('/dashboard', async () => 'Dashboard')
      .get('/api/data', () => ({ items: [] }))

    const app = new Spiceflow().use(child)
    const f = createSpiceflowFetch(app)

    // API route works with typed result
    f('/app/api/data')

    // fetch client accepts any string path (falls back to untyped),
    // so page paths aren't rejected — but they resolve to fallback types,
    // not the page handler's return type
  })

  test('layout paths excluded from safePath', () => {
    const child = new Spiceflow({ basePath: '/app' })
      .layout('/', ({ children }) => children)
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow()
      .get('/health', () => 'ok')
      .use(child)

    // API and page routes work
    expect(app.safePath('/health')).toBe('/health')
    expect(app.safePath('/app/dashboard')).toBe('/app/dashboard')

    // @ts-expect-error - layout path not in RoutePaths
    app.safePath('/app/')
  })

  test('layout paths excluded from proxy client and fetch client', () => {
    const child = new Spiceflow({ basePath: '/app' })
      .layout('/', ({ children }) => children)
      .get('/api/data', () => 'data')

    const app = new Spiceflow().use(child)

    const client = createSpiceflowClient(app)
    client.app.api.data.get()

    const f = createSpiceflowFetch(app)
    f('/app/api/data')

    // layout doesn't add to ClientRoutes — no navigable endpoint to access
  })
})

test('.page() without Vite plugin throws a clear error', async () => {
  const app = new Spiceflow().page('/', () => 'hello')
  const res = await app.handle(
    new Request('http://localhost/', {
      method: 'GET',
      headers: { accept: 'text/html' },
    }),
  )
  expect(res.status).toBe(500)
  const text = await res.text()
  expect(text).toMatchInlineSnapshot(`"{"message":"[spiceflow] RSC runtime is only available in the react-server environment. This error means renderReact was called outside of a Vite RSC build. Spiceflow .page and .layout methods require using the Vite plugin. See example application: https://github.com/remorses/spiceflow/blob/main/nodejs-example/vite.config.ts"}"`)
})

test('.layout() without Vite plugin throws a clear error', async () => {
  const app = new Spiceflow()
    .layout('/', ({ children }) => children)
    .page('/', () => 'hello')
  const res = await app.handle(
    new Request('http://localhost/', {
      method: 'GET',
      headers: { accept: 'text/html' },
    }),
  )
  expect(res.status).toBe(500)
  const text = await res.text()
  expect(text).toMatchInlineSnapshot(`"{"message":"[spiceflow] RSC runtime is only available in the react-server environment. This error means renderReact was called outside of a Vite RSC build. Spiceflow .page and .layout methods require using the Vite plugin. See example application: https://github.com/remorses/spiceflow/blob/main/nodejs-example/vite.config.ts"}"`)
})

describe('.use() with page and layout routes', () => {
  test('getAllRoutes includes page routes from sub-app with basePath', () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Dashboard')
      .page('/settings', async () => 'Settings')

    const app = new Spiceflow().use(subApp)

    const allRoutes = app.getAllRoutes()
    const pageRoutes = allRoutes.filter((r) => r.kind === 'page')
    const pagePaths = [...new Set(pageRoutes.map((r) => r.path))].sort()

    expect(pagePaths).toMatchInlineSnapshot(`
      [
        "/admin/dashboard",
        "/admin/settings",
      ]
    `)
  })

  test('getAllRoutes includes layout routes from sub-app with basePath', () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .layout('/', ({ children }) => children)
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const allRoutes = app.getAllRoutes()
    const layoutRoutes = allRoutes.filter((r) => r.kind === 'layout')
    const layoutPaths = [...new Set(layoutRoutes.map((r) => r.path))].sort()

    expect(layoutPaths).toMatchInlineSnapshot(`
      [
        "/admin",
      ]
    `)
  })

  test('getAllRoutes with nested .use() and multiple basePaths', () => {
    const deepApp = new Spiceflow({ basePath: '/v1' })
      .page('/users', async () => 'Users')

    const midApp = new Spiceflow({ basePath: '/api' })
      .layout('/', ({ children }) => children)
      .use(deepApp)

    const app = new Spiceflow().use(midApp)

    const allRoutes = app.getAllRoutes()
    const reactRoutes = allRoutes.filter(
      (r) => r.kind === 'page' || r.kind === 'layout',
    )
    const paths = [...new Set(reactRoutes.map((r) => `${r.kind}:${r.path}`))].sort()

    expect(paths).toMatchInlineSnapshot(`
      [
        "layout:/api",
        "page:/api/v1/users",
      ]
    `)
  })

  test('page in sub-app with basePath enters React path (returns RSC error, not 404)', async () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const res = await app.handle(
      new Request('http://localhost/admin/dashboard', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    // 500 = route matched and entered React render path (RSC runtime not available outside Vite)
    // 404 would mean the route was not found
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toContain('RSC runtime is only available')
  })

  test('layout + page in sub-app with basePath enters React path', async () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .layout('/', ({ children }) => children)
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const res = await app.handle(
      new Request('http://localhost/admin/dashboard', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toContain('RSC runtime is only available')
  })

  test('page in sub-app with parent basePath and sub basePath', async () => {
    const subApp = new Spiceflow({ basePath: '/v1' })
      .page('/users', async () => 'Users')

    const app = new Spiceflow({ basePath: '/api' }).use(subApp)

    const res = await app.handle(
      new Request('http://localhost/api/v1/users', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toContain('RSC runtime is only available')
  })

  test('page in sub-app at wrong path does not match the page route', async () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const res = await app.handle(
      new Request('http://localhost/dashboard', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    // The app has React pages so unmatched browser requests enter the React 404 path,
    // which fails with RSC error (500) outside Vite. The important thing is the page
    // route handler is NOT called — it's a React-level 404, not a match on /dashboard.
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toContain('RSC runtime is only available')
  })

  test('mixed API routes and pages in sub-app with basePath', async () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .get('/api/data', () => ({ data: 'hello' }))
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const apiRes = await app.handle(
      new Request('http://localhost/admin/api/data', { method: 'GET' }),
    )
    expect(apiRes.status).toBe(200)
    expect(await apiRes.json()).toMatchInlineSnapshot(`
      {
        "data": "hello",
      }
    `)

    const pageRes = await app.handle(
      new Request('http://localhost/admin/dashboard', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    expect(pageRes.status).toBe(500)
    const text = await pageRes.text()
    expect(text).toContain('RSC runtime is only available')
  })

  test('multiple sub-apps with pages at different basePaths', async () => {
    const adminApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Admin Dashboard')

    const docsApp = new Spiceflow({ basePath: '/docs' })
      .page('/getting-started', async () => 'Getting Started')

    const app = new Spiceflow().use(adminApp).use(docsApp)

    const allRoutes = app.getAllRoutes()
    const pagePaths = [...new Set(
      allRoutes.filter((r) => r.kind === 'page').map((r) => r.path),
    )].sort()

    expect(pagePaths).toMatchInlineSnapshot(`
      [
        "/admin/dashboard",
        "/docs/getting-started",
      ]
    `)

    const adminRes = await app.handle(
      new Request('http://localhost/admin/dashboard', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    expect(adminRes.status).toBe(500) // RSC error = route matched

    const docsRes = await app.handle(
      new Request('http://localhost/docs/getting-started', {
        method: 'GET',
        headers: { accept: 'text/html' },
      }),
    )
    expect(docsRes.status).toBe(500) // RSC error = route matched
  })

  test('safePath works with page routes from sub-app (includes basePath)', () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Dashboard')
      .page('/users/:id', async ({ params }) => params.id)

    const app = new Spiceflow().use(subApp)

    // safePath types include the basePath since JoinPath<BasePath, Path> encodes it
    expect(subApp.safePath('/admin/dashboard')).toBe('/admin/dashboard')
    expect(subApp.safePath('/admin/users/:id', { id: '42' })).toBe('/admin/users/42')
  })

  test('getAllRoutes normalizes trailing slash for layout at / in sub-app', () => {
    const subApp = new Spiceflow({ basePath: '/app' })
      .layout('/', ({ children }) => children)
      .page('/home', async () => 'Home')

    const app = new Spiceflow().use(subApp)

    const allRoutes = app.getAllRoutes()
    const paths = [...new Set(allRoutes.map((r) => `${r.kind || 'api'}:${r.path}`))].sort()

    // Layout at '/' with basePath '/app' should be '/app', not '/app/'
    expect(paths).toMatchInlineSnapshot(`
      [
        "layout:/app",
        "page:/app/home",
      ]
    `)
  })

  test('getAllRoutes with wildcard route in sub-app has no trailing slash', () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .get('/*', () => 'catch-all')
      .layout('/', ({ children }) => children)
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const allRoutes = app.getAllRoutes()
    const paths = [...new Set(allRoutes.map((r) => r.path))].sort()

    // No trailing slashes — wildcard is '/admin/*', layout is '/admin'
    expect(paths.some((p) => p.endsWith('/') && p !== '/')).toBe(false)
    expect(paths).toContain('/admin/*')
    expect(paths).toContain('/admin')
    expect(paths).toContain('/admin/dashboard')
  })

  test('unmatched non-browser request returns 404 (not React runtime 500)', async () => {
    const subApp = new Spiceflow({ basePath: '/admin' })
      .page('/dashboard', async () => 'Dashboard')

    const app = new Spiceflow().use(subApp)

    const res = await app.handle(
      new Request('http://localhost/not-found', {
        method: 'GET',
        headers: { accept: 'application/json' },
      }),
    )
    expect(res.status).toBe(404)
  })
})
