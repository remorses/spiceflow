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

```typescript
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().get('/hello', () => 'Hello, World!')

app.listen(3000)
```

## Requests and Responses

### GET Request

```typescript
app.get('/users/:id', ({ params }) => {
  return `User ID: ${params.id}`
})
```

### POST Request with Body Schema

```typescript
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

```typescript
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

```typescript
import { createSpiceflowClient } from 'spiceflow/client'

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

// Now you can use the client with full type safety
const { data: user } = await client.users.get({ params: { id: '123' } })
```

## Mounting Sub-Apps

```typescript
const mainApp = new Spiceflow()
  .post('/users', ({ body }) => `Created user: ${body.name}`)
  .use(new Spiceflow().get('/', () => 'Users list'))
```

## Base Path

```typescript
const app = new Spiceflow({ basePath: '/api/v1' })
app.get('/hello', () => 'Hello') // Accessible at /api/v1/hello
```

## Async Generators (Streaming)

Async generators will create a server sent event response.

```typescript
app.get('/stream', async function* () {
  yield 'Start'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'Middle'
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield 'End'
})
```

## Error Handling

```typescript
app.onError(({ error }) => {
  console.error(error)
  return new Response('An error occurred', { status: 500 })
})
```

## Middleware

```typescript
app.use(({ request }) => {
  console.log(`Received ${request.method} request to ${request.url}`)
})
```

## Modifying Response with Middleware

Middleware in Spiceflow can be used to modify the response before it's sent to the client. This is useful for adding headers, transforming the response body, or performing any other operations on the response.

Here's an example of how to modify the response using middleware:

```ts
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

```typescript
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

```typescript
import { cors } from 'spiceflow/cors'

const app = new Spiceflow().use(cors()).get('/hello', () => 'Hello, World!')
```
