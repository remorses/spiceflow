<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>spiceflow</h3>
    <br/>
    <p>fast, simple and type safe API framework</p>
    <p>still in beata</p>
    <br/>
    <br/>
</div>

# Spiceflow

Spiceflow is a lightweight, type-safe API framework for building web services using modern web standards.

## Features

- Type safety
- OpenAPI compatibility
- RPC client generation
- Simple and intuitive API
- Uses web standards for requests and responses
- Supports async generators for streaming
- Modular design with `.use()` for mounting sub-apps
- Base path support

## Installation

```bash
npm install spiceflow
```

## Basic Usage

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return body
  })

app.listen(3000)
```

## Requests and Responses

### POST Request with Body Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().post(
  '/users',
  async ({ request }) => {
    const body = await request.json() // here body has type { name: string, email: string }
    return `Created user: ${body.name}`
  },
  {
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  },
)
```

### Response Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().get(
  '/users/:id',
  ({ params }) => {
    return { id: Number(params.id), name: 'John Doe' }
  },
  {
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
    params: z.object({
      id: z.string(),
    }),
  },
)
```

## Generate RPC Client

```ts
import { createSpiceflowClient } from 'spiceflow/client'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const app = new Spiceflow()
  .get('/hello/:id', () => 'Hello, World!', {
    query: z.object({ name: z.string().optional() }),
  })
  .post(
    '/users',
    async ({ request }) => {
      const body = await request.json()
      return { id: 1, name: body.name }
    },
    {
      body: z.object({
        name: z.string(),
      }),
      response: z.object({
        id: z.number(),
        name: z.string(),
      }),
    },
  )
  .get('/stream', async function* () {
    for (let i = 0; i < 3; i++) {
      yield `Message ${i}`
      await new Promise((r) => setTimeout(r, 1000))
    }
  })

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

// GET request
const { data: helloData, error: helloError } = await client
  .hello({ id: '123' })
  .get({ query: { name: 'John' } })
// Always check error before using data
if (!helloError) {
  console.log(helloData) // 'Hello, World!'
}

// POST request with body
const { data: userData, error: userError } = await client.users.post({
  name: 'John',
})

// Always check error before using data
if (!userError) {
  console.log(userData.id, userData.name)
}
{
  // Stream request
  const { error, data } = await client.stream.get()
  if (error) {
    throw error
  }
  for await (const message of data) {
    console.log(message) // Message 0, Message 1, Message 2
  }
}
{
  // Pass AbortController to cancel requests
  const controller = new AbortController()
  const { data, error } = await client.users.post(
    { name: 'John' },
    { fetch: { signal: controller.signal } },
  )

  // Cancel request after 2 seconds
  setTimeout(() => controller.abort(), 2000)
}
```

### RPC Client with Base Path

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'
import { createSpiceflowClient } from 'spiceflow/client'

// RPC client with base path
const app = new Spiceflow({ basePath: '/api/v1' })
  .get('/hello/:id', () => 'Hello')
  .post(
    '/users',
    async ({ request }) => {
      const body = await request.json()
      return { id: 1, name: body.name }
    },
    {
      body: z.object({
        name: z.string(),
      }),
    },
  )

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

// Base path segments become properties in the client
const { data, error } = await client.api.v1.hello({ id: '123' }).get()
if (!error) {
  console.log(data) // 'Hello'
}

// POST request also uses the base path
const { data: userData, error: userError } = await client.api.v1.users.post({
  name: 'John',
})
if (!userError) {
  console.log(userData.id, userData.name)
}
```

## Mounting Sub-Apps

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const mainApp = new Spiceflow()
  .post(
    '/users',
    async ({ request }) => `Created user: ${(await request.json()).name}`,
    {
      body: z.object({
        name: z.string(),
      }),
    },
  )
  .use(new Spiceflow().get('/', () => 'Users list'))
```

## Base Path

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow({ basePath: '/api/v1' })
app.get('/hello', () => 'Hello') // Accessible at /api/v1/hello
```

## Async Generators (Streaming)

Async generators will create a server sent event response.

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().get('/stream', async function* () {
  yield 'Start'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'Middle'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'End'
})
```

## Error Handling

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().onError(({ error }) => {
  console.error(error)
  return new Response('An error occurred', { status: 500 })
})
```

## Middleware

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow().use(({ request }) => {
  console.log(`Received ${request.method} request to ${request.url}`)
})
```

## Modifying Response with Middleware

Middleware in Spiceflow can be used to modify the response before it's sent to the client. This is useful for adding headers, transforming the response body, or performing any other operations on the response.

Here's an example of how to modify the response using middleware:

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .use(async ({ request }, next) => {
    const response = await next()
    if (response) {
      // Add a custom header to all responses
      response.headers.set('X-Powered-By', 'Spiceflow')
    }
    return response
  })
  .get('/example', () => {
    return { message: 'Hello, World!' }
  })
```

## Generating OpenAPI Schema

```ts
import { openapi } from 'spiceflow/openapi'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const app = new Spiceflow()
  .use(openapi({ path: '/openapi.json' }))
  .get('/hello', () => 'Hello, World!', {
    query: z.object({
      name: z.string(),
      age: z.number(),
    }),
    response: z.string(),
  })
  .post(
    '/user',
    () => {
      return new Response('Hello, World!')
    },
    {
      body: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    },
  )

const openapiSchema = await (
  await app.handle(new Request('http://localhost:3000/openapi.json'))
).json()
```

## Adding CORS Headers

```ts
import { cors } from 'spiceflow/cors'
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().use(cors()).get('/hello', () => 'Hello, World!')
```

## Proxy requests

```ts
import { Spiceflow } from 'spiceflow'
import { MiddlewareHandler } from 'spiceflow/dist/types'

const app = new Spiceflow()

function createProxyMiddleware({
  target,
  changeOrigin = false,
}): MiddlewareHandler {
  return async (context) => {
    const { request } = context
    const url = new URL(request.url)

    const proxyReq = new Request(
      new URL(url.pathname + url.search, target),
      request,
    )

    if (changeOrigin) {
      proxyReq.headers.set('origin', new URL(target).origin || '')
    }
    console.log('proxying', proxyReq.url)
    const res = await fetch(proxyReq)

    return res
  }
}

app.use(
  createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
  }),
)

// or with a basePath
app.use(
  new Spiceflow({ basePath: '/v1/completions' }).use(
    createProxyMiddleware({
      target: 'https://api.openai.com',
      changeOrigin: true,
    }),
  ),
)

app.listen(3030)
```
