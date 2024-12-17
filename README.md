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

> Notice that you should never declare app separately and add routes later, that way you lose the type safety. Instead always declare all routes in one place.

```ts
// This is an example of what NOT to do when using Spiceflow

import { Spiceflow } from 'spiceflow'

// Do NOT declare the app separately and add routes later
const app = new Spiceflow()

// Do NOT do this! Adding routes separately like this will lose type safety
app.get('/hello', () => 'Hello, World!')
app.post('/echo', async ({ request }) => {
  const body = await request.json()
  return body
})
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

> Notice that to get the body of the request, you need to call `request.json()` to parse the body as JSON.
> Spiceflow does not parse the Body automatically, there is no body field in the Spiceflow route argument, instead you call either `request.json()` or `request.formData()` to get the body and validate it at the same time. This works by wrapping the request in a `SpiceflowRequest` instance, which has a `json()` and `formData()` method that parse the body and validate it. The returned data will have the correct schema type instead of `any`.

### Response Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().get(
  '/users/:id',
  ({ request, params }) => {
    const typedJson = await request.json() // this body will have the correct type
    return { id: Number(params.id), name: typedJson.name }
  },
  {
    body: z.object({
      name: z.string(),
    }),
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

// Define the app with multiple routes and features
const app = new Spiceflow()
  .get('/hello/:id', ({ params }) => `Hello, ${params.id}!`)
  .post(
    '/users',
    async ({ request }) => {
      const body = await request.json() // here body has type { name?: string, email?: string }
      return `Created user: ${body.name}`
    },
    {
      body: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    },
  )
  .get('/stream', async function* () {
    yield 'Start'
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield 'Middle'
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield 'End'
  })

// Create the client
const client = createSpiceflowClient<typeof app>('http://localhost:3000')

// Example usage of the client
async function exampleUsage() {
  // GET request
  const { data: helloData, error: helloError } = await client
    .hello({ id: 'World' })
    .get()
  if (helloError) {
    console.error('Error fetching hello:', helloError)
  } else {
    console.log('Hello response:', helloData)
  }

  // POST request
  const { data: userData, error: userError } = await client.users.post({
    name: 'John Doe',
    email: 'john.doe@example.com',
  })
  if (userError) {
    console.error('Error creating user:', userError)
  } else {
    console.log('User creation response:', userData)
  }

  // Async generator (streaming) request
  const { data: streamData, error: streamError } = await client.stream.get()
  if (streamError) {
    console.error('Error fetching stream:', streamError)
  } else {
    for await (const chunk of streamData) {
      console.log('Stream chunk:', chunk)
    }
  }
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

const app = new Spiceflow().get('/sseStream', async function* () {
  yield { message: 'Start' }
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield { message: 'Middle' }
  await new Promise((resolve) => setTimeout(resolve, 1000))
  yield { message: 'End' }
})

// Server-Sent Events (SSE) format
// The server will send events in the following format:
// data: {"message":"Start"}
// data: {"message":"Middle"}
// data: {"message":"End"}

// Example response output:
// data: {"message":"Start"}
// data: {"message":"Middle"}
// data: {"message":"End"}

// Client usage example with RPC client
import { createSpiceflowClient } from 'spiceflow/client'

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

async function fetchStream() {
  const response = await client.sseStream.get()
  if (response.error) {
    console.error('Error fetching stream:', response.error)
  } else {
    for await (const chunk of response.data) {
      console.log('Stream chunk:', chunk)
    }
  }
}

fetchStream()
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

## How errors are handled in Spiceflow client

The Spiceflow client provides type-safe error handling by returning either a `data` or `error` property. When using the client:

- Thrown errors appear in the `error` field
- Response objects can be thrown or returned
- Responses with status codes 200-299 appear in the `data` field
- Responses with status codes <200 or ≥300 appear in the `error` field

The example below demonstrates handling different types of responses:

```ts
import { Spiceflow } from 'spiceflow'
import { createSpiceflowClient } from 'spiceflow/client'

const app = new Spiceflow()
  .get('/error', () => {
    throw new Error('Something went wrong')
  })
  .get('/unauthorized', () => {
    return new Response('Unauthorized access', { status: 401 })
  })
  .get('/success', () => {
    throw new Response('Success message', { status: 200 })
  })

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

async function handleErrors() {
  const errorResponse = await client.error.get()
  console.log('Calling error endpoint...')
  // Logs: Error occurred: Something went wrong
  if (errorResponse.error) {
    console.error('Error occurred:', errorResponse.error)
  }

  const unauthorizedResponse = await client.unauthorized.get()
  console.log('Calling unauthorized endpoint...')
  // Logs: Unauthorized: Unauthorized access (Status: 401)
  if (unauthorizedResponse.error) {
    console.error('Unauthorized:', unauthorizedResponse.error)
  }

  const successResponse = await client.success.get()
  console.log('Calling success endpoint...')
  // Logs: Success: Success message
  if (successResponse.data) {
    console.log('Success:', successResponse.data)
  }
}
```

## Using the client server side, without network requests

When using the client server-side, you can pass the Spiceflow app instance directly to `createSpiceflowClient()` instead of providing a URL. This allows you to make "virtual" requests that are handled directly by the app without making actual network requests. This is useful for testing, generating documentation, or any other scenario where you want to interact with your API endpoints programmatically without setting up a server.

Here's an example:

```tsx
import { Spiceflow } from 'spiceflow'
import { createSpiceflowClient } from 'spiceflow/client'
import { openapi } from 'spiceflow/openapi'
import { writeFile } from 'node:fs/promises'

const app = new Spiceflow()
  .use(openapi({ path: '/openapi' }))
  .get('/users', () => [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ])
  .post('/users', ({ request }) => request.json())

// Create client by passing app instance directly
const client = createSpiceflowClient(app)

// Get OpenAPI schema and write to disk
const { data } = await client.openapi.get()
await writeFile('openapi.json', JSON.stringify(data, null, 2))
console.log('OpenAPI schema saved to openapi.json')
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

### Authorization Middleware

You can handle authorization in a middleware, for example here the code checks if the user is logged in and if not, it throws an error. You can use the state to track request data, in this case the state keeps a reference to the session.

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('session', null as Session | null)
  .use(async ({ request: req, state }, next) => {
    const res = new Response()

    const { session } = await getSession({ req, res })
    if (!session) {
      return
    }
    state.session = session
    const response = await next()

    const cookies = res.headers.getSetCookie()
    for (const cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response
  })
  .post('/protected', async ({ state }) => {
    const { session } = state
    if (!session) {
      throw new Error('Not logged in')
    }
    return { ok: true }
  })
```
