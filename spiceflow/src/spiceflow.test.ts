import { test, describe, expect } from 'vitest'

import { bfs, cloneDeep, Spiceflow } from './spiceflow.ts'
import { z } from 'zod'
import { createSpiceflowClient } from './client/index.ts'

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
    const res = await app.handle(
      new Request('http://localhost/upload/', {
        method: 'POST',
      }),
    )
    expect(res.status).toBe(404)
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
  const res = await app.handle(
    new Request('http://localhost/superjson', { method: 'POST' }),
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

test.todo('HEAD uses GET route, does not add body', async () => {
  const app = new Spiceflow().get('/ids/:id', () => {
    console.trace('GET')
    return {
      message: 'hi',
      length: 10,
    }
  })

  const res = await app.handle(
    new Request('http://localhost/ids/xxx', { method: 'HEAD' }),
  )
  expect(res.status).toBe(200)
  // expect(res.headers.get('Content-Length')).toBe('10')
  expect(await res.text()).toBe('')

  // Compare with GET to ensure HEAD is using GET route
  const getRes = await app.handle(
    new Request('http://localhost/ids/xxx', { method: 'GET' }),
  )
  expect(getRes.status).toBe(200)
  expect(await getRes.json()).toEqual({ message: 'hi', length: 10 })
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

test('missing route is not found', async () => {
  const res = await new Spiceflow()
    .get('/ids/:id', () => 'hi')
    .handle(new Request('http://localhost/zxxx', { method: 'GET' }))
  expect(res.status).toBe(404)
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
  expect(await res.text()).toBe('ok')
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
  expect(await res.text()).toBe('ok')
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

  // Test successful request - state starts from child app (0), then root middleware (+1), then child middleware (+10)
  const successRes = await rootApp.handle(
    new Request('http://localhost/success', { method: 'GET' }),
  )
  expect(successRes.status).toBe(200)
  expect(await successRes.json()).toEqual({ counter: 11 }) // 0 + 1 + 10

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

  // Wrong method on existing path still returns 404 (not caught by all('/*'))
  // This is because the router finds a matching path but no matching method
  const wrongMethodRes = await app.handle(
    new Request('http://localhost/api/users', { method: 'DELETE' })
  )
  expect(wrongMethodRes.status).toBe(404)
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
