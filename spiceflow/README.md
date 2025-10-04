<!-- DO NOT EDIT: This file is auto-generated from root README.md -->

<div align='center' className='w-full'>
    <br/>
    <br/>
    <br/>
    <h1>spiceflow</h1>
    <p>fast, simple and type safe API framework</p>
    <br/>
    <br/>
</div>

Spiceflow is a lightweight, type-safe API framework for building web services using modern web standards.

## Features

- Type safe schema based validation via Zod
- Can easily generate OpenAPI spec based on your routes
- Native support for [Fern](https://github.com/fern-api/fern) to generate docs and SDKs (see example docs [here](https://remorses.docs.buildwithfern.com))
- Support for [Model Context Protocol](https://modelcontextprotocol.io/) to easily wire your app with LLMs
- Type safe RPC client generation
- Simple and intuitive API
- Uses web standards for requests and responses
- Supports async generators for streaming via server sent events
- Modular design with `.use()` for mounting sub-apps
- Base path support

## Installation

```bash
npm install spiceflow zod
```

## Basic Usage

Objects returned from route handlers are automatically serialized to JSON

> Notice that Spiceflow also has legacy methods for `.port`, `.get` etc. that use a different API with positional arguments. Using `.route` is preferred

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .route({
    method: 'POST',
    path: '/hello',
    handler() {
      return 'Hello, World!'
    },
  })
  .route({
    method: 'POST',
    path: '/echo',
    async handler({ request }) {
      const body = await request.json()
      return { echo: body }
    },
  })

app.listen(3000)
```

> Never declare app and add routes separately, that way you lose the type safety. Instead always append routes with .route in a single expression.

```ts
// This is an example of what NOT to do when using Spiceflow

import { Spiceflow } from 'spiceflow'

// DO NOT declare the app separately and add routes later
const app = new Spiceflow()

// Do NOT do this! Defining routes separately will lose type safety
app.route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello, World!'
  },
})
// Do NOT do this! Adding routes separately like this will lose type safety
app.route({
  method: 'POST',
  path: '/echo',
  async handler({ request }) {
    const body = await request.json()
    return body
  },
})
```

## Returning JSON

Spiceflow automatically serializes objects returned from handlers to JSON, so you don't need to wrap them in a `Response` object:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/user',
    handler() {
      // Return object directly - no need for new Response()
      return { id: 1, name: 'John', email: 'john@example.com' }
    },
  })
  .route({
    method: 'POST',
    path: '/data',
    async handler({ request }) {
      const body = await request.json()
      // Objects are automatically serialized to JSON
      return {
        received: body,
        timestamp: new Date().toISOString(),
        processed: true,
      }
    },
  })
```

## Type Safety for RPC

To maintain type safety when using the RPC client, it's recommended to **throw Response objects for errors** and **return objects directly for success cases**. This pattern ensures that the returned value types are properly inferred:

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users/:id',
    params: z.object({
      id: z.string(),
    }),
    response: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    handler({ params }) {
      const user = getUserById(params.id)

      if (!user) {
        // Throw Response for errors to maintain type safety
        throw new Response('User not found', { status: 404 })
      }

      // Return object directly for success - type will be properly inferred
      return {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    request: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    response: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    async handler({ request }) {
      const body = await request.json()

      if (await userExists(body.email)) {
        // Throw Response for errors
        throw new Response('User already exists', { status: 409 })
      }

      const newUser = await createUser(body)

      // Return object directly - RPC client will have proper typing
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
    },
  })

// RPC client usage with proper type inference
import { createSpiceflowClient } from 'spiceflow/client'

const client = createSpiceflowClient<typeof app>('http://localhost:3000')

async function example() {
  // TypeScript knows data is { id: string, name: string, email: string } | undefined
  const { data, error } = await client.users({ id: '123' }).get()

  if (error) {
    console.error('Error:', error) // Error handling
    return
  }

  // data is properly typed here
  console.log('User:', data.name, data.email)
}
```

With this pattern:

- **Success responses**: Return objects directly for automatic JSON serialization and proper type inference
- **Error responses**: Throw `Response` objects to maintain the error/success distinction in the RPC client
- **Type safety**: The RPC client will correctly infer the return type as the success object type

## Comparisons

#### Elysia

This project was born as a fork of Elysia with several changes:

- Use Zod instead of Typebox
- Do not compile user code with `aot` and `eval`, Elysia is very difficult to contribue to because the app is generated by compiling the user routes with `new Function()`, which also causes [several bugs](https://github.com/elysiajs/elysia/pull/773)
- Better async generator support by using SSE

#### Hono

This project shares many inspirations with Hono with many differences

- First class OpenAPI support, you don't need to change anything to produce an OpenAPI spec, just add the `openapi` plugin to automaitcally export your openapi schema on `/openapi`
- Much simpler framework, everything is done with native `Request` and `Response` objects instead of framework specific utilities
- Support for async generators
- Adding schemas to your routes is easier and does not require using `validator` functions, which slow down TypeScript inference
- The generated RPC client has much faster type inference, intellisense in VSCode appears in milliseconds instead of seconds
- Spiceflow uses whatwg Request and Response instead of custom utilities like `c.text` and `c.req`

## Requests and Responses

### POST Request with Body Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().route({
  method: 'POST',
  path: '/users',
  request: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  async handler({ request }) {
    const body = await request.json() // here body has type { name: string, email: string }
    return `Created user: ${body.name}`
  },
})
```

> Notice that to get the body of the request, you need to call `request.json()` to parse the body as JSON.
> Spiceflow does not parse the Body automatically, there is no body field in the Spiceflow route argument, instead you call either `request.json()` or `request.formData()` to get the body and validate it at the same time. This works by wrapping the request in a `SpiceflowRequest` instance, which has a `json()` and `formData()` method that parse the body and validate it. The returned data will have the correct schema type instead of `any`.

### Response Schema

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow().route({
  method: 'GET',
  path: '/users/:id',
  request: z.object({
    name: z.string(),
  }),
  response: z.object({
    id: z.number(),
    name: z.string(),
  }),
  params: z.object({
    id: z.string(),
  }),
  async handler({ request, params }) {
    const typedJson = await request.json() // this body will have the correct type
    return { id: Number(params.id), name: typedJson.name }
  },
})
```

## Generate RPC Client

```ts
import { createSpiceflowClient } from 'spiceflow/client'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

// Define the app with multiple routes and features
const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/hello/:id',
    handler({ params }) {
      return `Hello, ${params.id}!`
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    async handler({ request }) {
      const body = await request.json() // here body has type { name?: string, email?: string }
      return `Created user: ${body.name}`
    },
    request: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    }),
  })
  .route({
    method: 'GET',
    path: '/stream',
    async *handler() {
      yield 'Start'
      await new Promise((resolve) => setTimeout(resolve, 1000))
      yield 'Middle'
      await new Promise((resolve) => setTimeout(resolve, 1000))
      yield 'End'
    },
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

### Path Matching - Supported Features

- **Named parameters**: `:param` - Captures dynamic segments like `/users/:id` or `/api/:version/users/:userId`
- **Wildcards**: `*` - Matches any remaining path segments like `/files/*` or `/proxy/*`
- **Catch-all routes**: `/*` - Use as a not-found handler that catches any unmatched paths

### Path Matching - Unsupported Features

- **Optional parameters**: `/:param?` - Use separate routes instead - IS NOT SUPPORTED
- **Named wildcards**: `/files/*name` - Use unnamed `*` only - IS NOT SUPPORTED
- **Partial parameters**: `/:param-suffix` or `/prefix-:param` - Use full segment parameters only - IS NOT SUPPORTED
- **Regex patterns**: `/users/(\\d+)` - Use string parameters with validation in handlers - IS NOT SUPPORTED
- **Multiple wildcards**: `/*/files/*` - Use single wildcard only - IS NOT SUPPORTED

## Not Found Handler

Use `/*` as a catch-all route to handle 404 errors. More specific routes always take precedence regardless of registration order:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users',
    handler() {
      return { users: [] }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  // Catch-all for unmatched GET requests
  .route({
    method: 'GET',
    path: '/*',
    handler() {
      return new Response('Page not found', { status: 404 })
    },
  })
  // Or use .all() to catch any method
  .route({
    method: '*',
    path: '/*',
    handler({ request }) {
      return new Response(`Cannot ${request.method} ${request.url}`, {
        status: 404,
      })
    },
  })

// Specific routes work as expected
// GET /users returns { users: [] }
// GET /users/123 returns { id: '123' }
// GET /unknown returns 'Page not found' with 404 status
```

## Storing Spiceflow in Class Instances

If you need to store a Spiceflow router as a property in a class instance, use the `AnySpiceflow` type:

**Important**: Do not use `this` inside route handlers to reference the parent class. The `this` context inside handlers always refers to the Spiceflow instance, not your class instance. Instead, capture the parent class reference in a variable outside the handlers:

```ts
import { Spiceflow, AnySpiceflow } from 'spiceflow'

export class ChatDurableObject {
  private router: AnySpiceflow
  private state: DurableObjectState

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    const self = this // Capture parent class reference - IMPORTANT!

    this.router = new Spiceflow()
      .route({
        method: 'GET',
        path: '/messages',
        async handler() {
          // Use 'self' instead of 'this' to access parent class
          // this.state would NOT work here - 'this' refers to Spiceflow instance
          const messages = (await self.state.storage.get('messages')) || []
          return { messages }
        },
      })
      .route({
        method: 'POST',
        path: '/messages',
        async handler({ request }) {
          const { message } = await request.json()
          // Use 'self' to access parent class properties
          const messages = (await self.state.storage.get('messages')) || []
          messages.push({ id: Date.now(), text: message })
          await self.state.storage.put('messages', messages)
          return { success: true }
        },
      })
  }

  fetch(request: Request) {
    return this.router.handle(request)
  }
}
```

## Safe Path Building

The `safePath` method provides a type-safe way to build URLs with parameters. It helps prevent runtime errors by ensuring all required parameters are provided and properly substituted into the path.

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id/posts/:postId',
    handler({ params }) {
      return { userId: params.id, postId: params.postId }
    },
  })

// Building URLs with required parameters
const userPath = app.safePath('/users/:id', { id: '123' })
// Result: '/users/123'

// Building URLs with required parameters
const userPostPath = app.safePath('/users/:id/posts/:postId', {
  id: '456',
  postId: 'abc',
})
// Result: '/users/456/posts/abc'
```

### OAuth Callback Example

The `safePath` method is particularly useful when building callback URLs for OAuth flows, where you need to construct URLs dynamically based on user data or session information:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/auth/callback/:provider/:userId',
    handler({ params, query }) {
      const { provider, userId } = params
      const { code, state } = query

      // Handle OAuth callback logic here
      return {
        provider,
        userId,
        authCode: code,
        state,
      }
    },
  })
  .route({
    method: 'POST',
    path: '/auth/login',
    handler({ request }) {
      const userId = '12345'
      const provider = 'google'

      // Build the OAuth callback URL safely
      const callbackUrl = new URL(
        app.safePath('/auth/callback/:provider/:userId', {
          provider,
          userId,
        }),
        'https://myapp.com',
      ).toString()

      // Redirect to OAuth provider with callback URL
      const oauthUrl =
        `https://accounts.google.com/oauth/authorize?` +
        `client_id=your-client-id&` +
        `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
        `response_type=code&` +
        `scope=openid%20profile%20email`

      return { redirectUrl: oauthUrl }
    },
  })
```

In this example:

- The callback URL is built safely using `safePath` with type checking
- Required parameters like `provider` and `userId` must be provided
- The resulting URL is guaranteed to be properly formatted

## Mounting Sub-Apps

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const mainApp = new Spiceflow()
  .route({
    method: 'POST',
    path: '/users',
    async handler({ request }) {
      return `Created user: ${(await request.json()).name}`
    },
    request: z.object({
      name: z.string(),
    }),
  })
  .use(
    new Spiceflow().route({
      method: 'GET',
      path: '/',
      handler() {
        return 'Users list'
      },
    }),
  )
```

## Base Path

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow({ basePath: '/api/v1' })
app.route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello'
  },
}) // Accessible at /api/v1/hello
```

## Async Generators (Streaming)

Async generators will create a server sent event response.

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().route({
  method: 'GET',
  path: '/sseStream',
  async *handler() {
    yield { message: 'Start' }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield { message: 'Middle' }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    yield { message: 'End' }
  },
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
- Responses with status codes < 200 or ≥ 300 appear in the `error` field

The example below demonstrates handling different types of responses:

```ts
import { Spiceflow } from 'spiceflow'
import { createSpiceflowClient } from 'spiceflow/client'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/error',
    handler() {
      throw new Error('Something went wrong')
    },
  })
  .route({
    method: 'GET',
    path: '/unauthorized',
    handler() {
      return new Response('Unauthorized access', { status: 401 })
    },
  })
  .route({
    method: 'GET',
    path: '/success',
    handler() {
      throw new Response('Success message', { status: 200 })
      return ''
    },
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
  .route({
    method: 'GET',
    path: '/users',
    handler() {
      return [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]
    },
  })
  .route({
    method: 'POST',
    path: '/users',
    handler({ request }) {
      return request.json()
    },
  })

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
  .route({
    method: 'GET',
    path: '/example',
    handler() {
      return { message: 'Hello, World!' }
    },
  })
```

## Generating OpenAPI Schema

```ts
import { openapi } from 'spiceflow/openapi'
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const app = new Spiceflow()
  .use(openapi({ path: '/openapi.json' }))
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello, World!'
    },
    query: z.object({
      name: z.string(),
      age: z.number(),
    }),
    response: z.string(),
  })
  .route({
    method: 'POST',
    path: '/user',
    handler() {
      return new Response('Hello, World!')
    },
    request: z.object({
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
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().use(cors()).route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello, World!'
  },
})
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
  return async ({ request }) => {
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
  .route({
    method: 'POST',
    path: '/protected',
    async handler({ state }) {
      const { session } = state
      if (!session) {
        throw new Error('Not logged in')
      }
      return { ok: true }
    },
  })
```

## Non blocking authentication middleware

Sometimes authentication is only required for specific routes, and you don't want to block public routes while waiting for authentication. You can use `Promise.withResolvers()` to start fetching user data in parallel, allowing public routes to respond immediately while protected routes wait for authentication to complete.

The example below demonstrates this pattern - the `/public` route responds instantly while `/protected` waits for authentication:

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('userId', Promise.resolve(''))
  .state('userEmail', Promise.resolve(''))
  .use(async ({ request, state }, next) => {
    const sessionKey = request.headers.get('sessionKey')
    const userIdPromise = Promise.withResolvers<string>()
    const userEmailPromise = Promise.withResolvers<string>()

    state.userId = userIdPromise.promise
    state.userEmail = userEmailPromise.promise

    async function resolveUser() {
      if (!sessionKey) {
        userIdPromise.resolve('')
        userEmailPromise.resolve('')
        return
      }
      const user = await getUser(sessionKey)
      userIdPromise.resolve(user?.id ?? '')
      userEmailPromise.resolve(user?.email ?? '')
    }

    resolveUser()
  })
  .route({
    method: 'GET',
    path: '/protected',
    async handler({ state }) {
      const userId = await state.userId
      if (!userId) throw new Error('Not authenticated')
      return { message: 'Protected data' }
    },
  })
  .route({
    method: 'GET',
    path: '/public',
    handler() {
      return { message: 'Public data' }
    },
  })

async function getUser(sessionKey: string) {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return sessionKey === 'valid'
    ? { id: '123', email: 'user@example.com' }
    : null
}
```

## Model Context Protocol (MCP)

Spiceflow includes a Model Context Protocol (MCP) plugin that exposes your API routes as tools and resources that can be used by AI language models like Claude. The MCP plugin makes it easy to let AI assistants interact with your API endpoints in a controlled way.

When you mount the MCP plugin (default path is `/mcp`), it automatically:

- Exposes all your routes as callable tools with proper input validation
- Exposes GET routes without query/path parameters as `resources`
- Provides an SSE-based transport for real-time communication
- Handles serialization of requests and responses

This makes it simple to let AI models like Claude discover and call your API endpoints programmatically.

### Basic MCP Usage

Here's an example:

```tsx
// Import the MCP plugin and client
import { mcp } from 'spiceflow/mcp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { Spiceflow } from 'spiceflow'
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Create a new app with some example routes
const app = new Spiceflow()
  // Mount the MCP plugin at /mcp (default path)
  .use(mcp())
  // These routes will be available as tools
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello World'
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    handler({ params }) {
      return { id: params.id }
    },
  })
  .route({
    method: 'POST',
    path: '/echo',
    async handler({ request }) {
      const body = await request.json()
      return body
    },
  })

// Start the server
app.listen(3000)

// Example client usage:
const transport = new SSEClientTransport(new URL('http://localhost:3000/mcp'))

const client = new Client(
  { name: 'example-client', version: '1.0.0' },
  { capabilities: {} },
)

await client.connect(transport)

// List available tools
const tools = await client.request(
  { method: 'tools/list' },
  ListToolsResultSchema,
)

// Call a tool
const result = await client.request(
  {
    method: 'tools/call',
    params: {
      name: 'GET /hello',
      arguments: {},
    },
  },
  CallToolResultSchema,
)

// List available resources (only GET /hello is exposed since it has no params)
const resources = await client.request(
  { method: 'resources/list' },
  ListResourcesResultSchema,
)
```

### Adding MCP Tools to Existing Server

If you already have an existing MCP server and want to add Spiceflow route tools to it, you can use the `addMcpTools` helper function:

```ts
import { addMcpTools } from 'spiceflow/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { Spiceflow } from 'spiceflow'

// Your existing MCP server
const existingServer = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } },
)

// Your Spiceflow app
const app = new Spiceflow()
  .use(mcp()) // Required for MCP configuration
  .route({
    method: 'GET',
    path: '/hello',
    handler() {
      return 'Hello from Spiceflow!'
    },
  })

// Add Spiceflow tools to your existing server
const mcpServer = await addMcpTools({
  mcpServer: existingServer,
  app,
  ignorePaths: ['/mcp', '/sse'],
})

// Now your existing server has access to all Spiceflow routes as tools
```

## Generating Fern docs and SDK

Spiceflow has native support for Fern docs and SDK generation using openapi plugin.

The openapi types also have additional types for `x-fern` extensions to help you customize your docs and SDK.

Here is an example script to help you generate an openapi.yml file that you can then use with Fern:

```ts
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { Spiceflow } from 'spiceflow'
import { openapi } from 'spiceflow/openapi'
import { createSpiceflowClient } from 'spiceflow/client'

const app = new Spiceflow().use(openapi({ path: '/openapi' })).route({
  method: 'GET',
  path: '/hello',
  handler() {
    return 'Hello World'
  },
})

async function main() {
  console.log('Creating Spiceflow client...')
  const client = createSpiceflowClient(app)

  console.log('Fetching OpenAPI spec...')
  const { data: openapiJson, error } = await client.openapi.get()
  if (error) {
    console.error('Failed to fetch OpenAPI spec:', error)
    throw error
  }

  const outputPath = path.resolve('./openapi.yml')
  console.log('Writing OpenAPI spec to', outputPath)
  fs.writeFileSync(
    outputPath,
    yaml.dump(openapiJson, {
      indent: 2,
      lineWidth: -1,
    }),
  )
  console.log('Successfully wrote OpenAPI spec')
}

main().catch((e) => {
  console.error('Failed to generate OpenAPI spec:', e)
  process.exit(1)
})
```

Then follow Fern docs to generate the SDK and docs. You will need to create some Fern yml config files.

You can take a look at the [`scripts/example-app.ts`](spiceflow/scripts/example-app.ts) file for an example app that generates the docs and SDK.

## Passing state during handle, passing Cloudflare env bindings

You can use bindings type safely using a .state method and then passing the state in the handle method in the second argument:

```tsx
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

interface Env {
  KV: KVNamespace
  QUEUE: Queue
  SECRET: string
}

const app = new Spiceflow()
  .state('env', {} as Env)
  .route({
    method: 'GET',
    path: '/kv/:key',
    async handler({ params, state }) {
      const value = await state.env!.KV.get(params.key)
      return { key: params.key, value }
    },
  })
  .route({
    method: 'POST',
    path: '/queue',
    async handler({ request, state }) {
      const body = await request.json()
      await state.env!.QUEUE.send(body)
      return { success: true, message: 'Added to queue' }
    },
  })

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Pass the env bindings to the app
    return app.handle(request, { state: { env } })
  },
}
```

## Fern SDK streaming support

When you use an async generator in your app, Spiceflow will automatically add the required `x-fern` extensions to the OpenAPI spec to support streaming.

Here is what streaming looks like in the Fern generated SDK:

```ts
import { ExampleSdkClient } from './sdk-typescript'

const sdk = new ExampleSdkClient({
  environment: 'http://localhost:3000',
})

// Get stream data
const stream = await sdk.getStream()
for await (const data of stream) {
  console.log('Stream data:', data)
}

// Simple GET request
const response = await sdk.getUsers()
console.log('Users:', response)
```

## Working with Cookies

Spiceflow works with standard Request and Response objects, so you can use any cookie library like the `cookie` npm package to handle cookies:

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/set-cookie',
    handler({ request }) {
      // Read existing cookies from the request
      const cookies = parse(request.headers.get('Cookie') || '')

      // Create response with a new cookie
      const response = new Response(
        JSON.stringify({
          message: 'Cookie set!',
          existingCookies: cookies,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      // Set a new cookie
      response.headers.set(
        'Set-Cookie',
        serialize('session', 'abc123', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        }),
      )

      return response
    },
  })
  .route({
    method: 'GET',
    path: '/get-cookie',
    handler({ request }) {
      // Parse cookies from the request
      const cookies = parse(request.headers.get('Cookie') || '')

      return {
        sessionId: cookies.session || null,
        allCookies: cookies,
      }
    },
  })
  .route({
    method: 'POST',
    path: '/clear-cookie',
    handler({ request }) {
      const response = new Response(
        JSON.stringify({ message: 'Cookie cleared!' }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      // Clear a cookie by setting it with an expired date
      response.headers.set(
        'Set-Cookie',
        serialize('session', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          expires: new Date(0),
          path: '/',
        }),
      )

      return response
    },
  })

app.listen(3000)
```

You can also use cookies in middleware for authentication or session handling:

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

const app = new Spiceflow()
  .state('userId', null as string | null)
  .use(async ({ request, state }, next) => {
    // Parse cookies from incoming request
    const cookies = parse(request.headers.get('Cookie') || '')

    // Extract user ID from session cookie
    if (cookies.session) {
      // In a real app, you'd verify the session token
      state.userId = cookies.session
    }

    const response = await next()

    // Optionally refresh the session cookie
    if (state.userId && response) {
      response.headers.set(
        'Set-Cookie',
        serialize('session', state.userId, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        }),
      )
    }

    return response
  })
  .route({
    method: 'GET',
    path: '/profile',
    handler({ state }) {
      if (!state.userId) {
        return new Response('Unauthorized', { status: 401 })
      }

      return { userId: state.userId, message: 'Welcome back!' }
    },
  })
```

## Background tasks with waitUntil

Spiceflow provides a `waitUntil` function in the handler context that allows you to schedule tasks in the background in a cross platform way. It will use the Cloudflare workers waitUntil if present. It's currently a no op in Node.js.

### Basic Usage

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().route({
  method: 'POST',
  path: '/process',
  async handler({ request, waitUntil }) {
    const data = await request.json()

    // Schedule background task
    waitUntil(
      fetch('https://analytics.example.com/track', {
        method: 'POST',
        body: JSON.stringify({ event: 'data_processed', data }),
      }),
    )

    // Return response immediately
    return { success: true, id: Math.random().toString(36) }
  },
})
```

### Cloudflare Workers Integration

In Cloudflare Workers, `waitUntil` is automatically detected from the global context:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow().route({
  method: 'POST',
  path: '/webhook',
  async handler({ request, waitUntil }) {
    const payload = await request.json()

    // Process webhook data in background
    waitUntil(
      processWebhookData(payload)
        .then(() => console.log('Webhook processed'))
        .catch((err) => console.error('Webhook processing failed:', err)),
    )

    // Respond immediately to webhook sender
    return new Response('OK', { status: 200 })
  },
})

async function processWebhookData(payload: any) {
  // Simulate time-consuming processing
  await new Promise((resolve) => setTimeout(resolve, 1000))
  // Save to database, send notifications, etc.
}

export default {
  fetch(request: Request, env: any, ctx: ExecutionContext) {
    return app.handle(request, { state: { env } })
  },
}
```

## Next.js pages router integration

```ts
// pages/api/[...path].ts
import { getJwt } from '@app/utils/ssr' // exasmple session function
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // IMPORTANT! nothing should be run before calling handleNode that could read the request body!
  await mcpAuthApp.handleNode(req, res)
}

export const config = {
  api: {
    bodyParser: false,
  },
}
```

### Custom waitUntil Function

You can also provide your own `waitUntil` implementation:

```ts
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow({
  waitUntil: (promise) => {
    // Custom implementation for non-Cloudflare environments
    promise.catch((err) => console.error('Background task failed:', err))
  },
}).route({
  method: 'GET',
  path: '/analytics',
  async handler({ waitUntil }) {
    // Schedule analytics tracking
    waitUntil(trackPageView('/analytics'))

    return { message: 'Analytics page loaded' }
  },
})

async function trackPageView(path: string) {
  // Track page view in analytics system
  console.log(`Page view tracked: ${path}`)
}
```

**Note:** In non-Cloudflare environments, if no custom `waitUntil` function is provided, the default implementation is a no-op function that doesn't wait for the promises to complete.

## Graceful Shutdown

The `preventProcessExitIfBusy` middleware prevents platforms like Fly.io from killing your app while processing long requests (e.g., AI payloads). Fly.io can wait up to 5 minutes for graceful shutdown.

```ts
import { Spiceflow, preventProcessExitIfBusy } from 'spiceflow'

const app = new Spiceflow()
  .use(
    preventProcessExitIfBusy({
      maxWaitSeconds: 300, // 5 minutes max wait (default: 300)
      checkIntervalMs: 250, // Check interval (default: 250ms)
    }),
  )
  .route({
    method: 'POST',
    path: '/ai/generate',
    async handler({ request }) {
      const prompt = await request.json()
      // Long-running AI generation
      const result = await generateAIResponse(prompt)
      return result
    },
  })

app.listen(3000)
```

When receiving SIGTERM during deployment, the middleware waits for all active requests to complete before exiting. Perfect for AI workloads that may take minutes to process.

### When using `createSpiceflowClient` and getting typescript error `The inferred type of 'pluginApiClient' cannot be named without a reference to '...'. This is likely not portable. A type annotation is necessary. (ts 2742)`

You can resolve this issue by adding an explicing type for the client:

```ts
export const client: SpiceflowClient.Create<App> = createSpiceflowClient<App>(
  PUBLIC_URL,
  {},
)
```
