<div align='center'>
    <br/>
    <br/>
    <br/>
    <h3>spiceflow</h3>
    <br/>
    <p>fast, simple and type safe API framework</p>
    <p>still in alpha, use at your own risk</p>
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

### GET Request

```ts
app.get('/users/:id', ({ params }) => {
  return `User ID: ${params.id}`
})
```

### POST Request with Body Schema

```ts
import { z } from 'zod'

app.post(
  '/users',
  ({ body }) => {
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

app.get(
  '/users/:id',
  ({ params }) => {
    return { id: Number(params.id), name: 'John Doe' }
  },
  {
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
)
```

## Generate RPC Client

```ts
import { createSpiceflowClient } from 'spiceflow/client'
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().get('/hello/:id', () => 'Hello, World!')

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

const { data, error } = await client.hello({ id: '' }).get()
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
app.get('/stream', async function* () {
  yield 'Start'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'Middle'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'End'
})
```

## Error Handling

```ts
app.onError(({ error }) => {
  console.error(error)
  return new Response('An error occurred', { status: 500 })
})
```

## Middleware

```ts
app.use(({ request }) => {
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

const app = new Spiceflow()
  .use(openapi({ path: '/openapi.json' }))
  .get('/hello', () => 'Hello, World!', {
    query: z.object({
      name: z.string(),
      age: z.number(),
    }),
    response: z.string(),
  })
  .post('/user', {
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  })

const openapiSchema = await (
  await app.handle(new Request('http://localhost:3000/openapi.json'))
).json()
```

## Adding CORS Headers

```ts
import { cors } from 'spiceflow/cors'

const app = new Spiceflow().use(cors()).get('/hello', () => 'Hello, World!')
```
