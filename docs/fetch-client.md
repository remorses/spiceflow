# Fetch Client (Advanced)

Advanced fetch client patterns including error handling, server-side usage, type-safe RPC, and path building.

## Path Matching

**Supported patterns:**

- **Named parameters**: `:param` - Captures dynamic segments like `/users/:id` or `/api/:version/users/:userId`
- **Wildcards**: `*` - Matches any remaining path segments like `/files/*` or `/proxy/*`. A wildcard route also matches the parent path without a trailing segment — `/files/*` matches both `/files/foo` and `/files`.
- **Catch-all routes**: `/*` - Matches any unmatched paths

**Unsupported patterns:**

- **Optional parameters**: `/:param?` - Use separate routes instead - IS NOT SUPPORTED
- **Named wildcards**: `/files/*name` - Use unnamed `*` only - IS NOT SUPPORTED
- **Partial parameters**: `/:param-suffix` or `/prefix-:param` - Use full segment parameters only - IS NOT SUPPORTED
- **Regex patterns**: `/users/(\\d+)` - Use string parameters with validation in handlers - IS NOT SUPPORTED
- **Multiple wildcards**: `/*/files/*` - Use single wildcard only - IS NOT SUPPORTED

## Fetch Client Errors

The fetch client returns `Error | Data` directly. When the server responds with a non-2xx status code, the client returns a `SpiceflowFetchError` instead of the data. Use `instanceof Error` to check:

- Responses with status codes 200-299 return the parsed data directly
- Responses with status codes < 200 or ≥ 300 return a `SpiceflowFetchError`
- The error has `status`, `value` (parsed response body), and `response` (raw Response) properties

```ts
// server.ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
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

export type App = typeof app
```

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

async function handleErrors() {
  const errorResult = await safeFetch('/error')
  if (errorResult instanceof Error) {
    console.error('Error occurred:', errorResult.message)
  }

  const unauthorizedResult = await safeFetch('/unauthorized')
  if (unauthorizedResult instanceof Error) {
    console.error(
      'Unauthorized:',
      unauthorizedResult.message,
      'Status:',
      unauthorizedResult.status,
    )
  }

  const successResult = await safeFetch('/success')
  if (successResult instanceof Error) return
  console.log('Success:', successResult) // 'Success message'
}
```

## Server-Side Fetch

You can pass the Spiceflow app instance directly to `createSpiceflowFetch()` instead of providing a URL. This makes "virtual" requests handled directly by the app without actual network requests. Useful for testing, generating documentation, or interacting with your API programmatically without setting up a server.

```tsx
import { Spiceflow } from 'spiceflow'
import { createSpiceflowFetch } from 'spiceflow/client'
import { openapi } from 'spiceflow/openapi'
import { writeFile } from 'node:fs/promises'

export const app = new Spiceflow()
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

// Create fetch client by passing app instance directly
const safeFetch = createSpiceflowFetch(app)

// Get OpenAPI schema and write to disk
const data = await safeFetch('/openapi')
if (data instanceof Error) throw data
await writeFile('openapi.json', JSON.stringify(data, null, 2))
console.log('OpenAPI schema saved to openapi.json')
```

<details>
<summary>Fixing ts(2742) with SpiceflowFetch</summary>

When using `createSpiceflowFetch` and getting typescript error `The inferred type of '...' cannot be named without a reference to '...'. This is likely not portable. A type annotation is necessary. (ts 2742)`, you can resolve this issue by adding an explicit type for the client:

```ts
import type { SpiceflowFetch } from 'spiceflow/client'

export const f: SpiceflowFetch<App> = createSpiceflowFetch<App>(PUBLIC_URL)
```

</details>

## Type-Safe RPC

To maintain type safety when using the fetch client, **throw Response objects for errors** and **return objects directly for success cases**. The fetch client returns `Error | Data` directly — use `instanceof Error` to narrow the type:

```ts
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/users/:id',
    query: z.object({
      q: z.string(),
    }),
    response: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    handler({ params }) {
      const user = getUserById(params.id)

      if (!user) {
        throw new Response('User not found', { status: 404 })
      }

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
        throw new Response('User already exists', { status: 409 })
      }

      const newUser = await createUser(body)

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }
    },
  })

export type App = typeof app
```

```ts
// client.ts
import { createSpiceflowFetch } from 'spiceflow/client'
import type { App } from './server'

const safeFetch = createSpiceflowFetch<App>('http://localhost:3000')

// Path params are type-safe — TypeScript requires { id: string }
const user = await safeFetch('/users/:id', {
  params: { id: '123' },
  query: { q: 'something' },
})
if (user instanceof Error) {
  console.error('Error:', user.message)
  return
}
// user is typed as { id: string, name: string, email: string }
console.log('User:', user.name, user.email)

// Body is type-safe — TypeScript requires { name: string, email: string }
const newUser = await safeFetch('/users', {
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' },
})
if (newUser instanceof Error) return newUser
console.log('Created:', newUser.id)
```

With this pattern:

- **Success responses**: Return objects directly for automatic JSON serialization and proper type inference
- **Error responses**: Throw `Response` objects — the fetch client returns a `SpiceflowFetchError` with `status`, `value`, and `response` properties
- **Type safety**: The fetch client gives you full type safety on **path params**, **query params**, **request body**, and **response data** — all inferred from your route definitions

## Path Building

The `href` method provides a type-safe way to build URLs with parameters. It prevents runtime errors by ensuring all required parameters are provided and properly substituted into the path.

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
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
const userPath = app.href('/users/:id', { id: '123' })
// Result: '/users/123'

// Building URLs with required parameters
const userPostPath = app.href('/users/:id/posts/:postId', {
  id: '456',
  postId: 'abc',
})
// Result: '/users/456/posts/abc'
```

### Query Parameters

When a route has a `query` schema, `href` accepts query parameters alongside path parameters in the same flat object. Query parameters are appended as a query string, and unknown keys are rejected at the type level:

```ts
export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/search',
    query: z.object({ q: z.string(), page: z.coerce.number() }),
    handler({ query }) {
      return { results: [], q: query.q }
    },
  })
  .route({
    method: 'GET',
    path: '/users/:id',
    query: z.object({ fields: z.string() }),
    handler({ params, query }) {
      return { id: params.id, fields: query.fields }
    },
  })

app.href('/search', { q: 'hello', page: 1 })
// Result: '/search?q=hello&page=1'

app.href('/users/:id', { id: '42', fields: 'name' })
// Result: '/users/42?fields=name'

// @ts-expect-error - 'invalid' is not a known query key
app.href('/search', { invalid: 'x' })
```

### Standalone `createHref`

If you need a path builder on the client side where you can't import server app code, use `createHref` with the `App` type:

```ts
import { createHref } from 'spiceflow'
import type { App } from './server' // import only the type, not the runtime app

const href = createHref<App>()

href('/users/:id', { id: '123' })
// Result: '/users/123'

href('/search', { q: 'hello', page: 1 })
// Result: '/search?q=hello&page=1'
```

The returned function has the same type safety as `app.href` — it infers paths, params, and query schemas from the app type. The app argument is optional and not used at runtime, so you can call `createHref<App>()` without passing any value.

<details>
<summary>OAuth callback example</summary>

The `href` method is particularly useful when building callback URLs for OAuth flows, where you need to construct URLs dynamically based on user data or session information:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/auth/callback/:provider/:userId',
    handler({ params, query }) {
      const { provider, userId } = params
      const { code, state } = query

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

      const callbackUrl = new URL(
        app.href('/auth/callback/:provider/:userId', {
          provider,
          userId,
        }),
        'https://myapp.com',
      ).toString()

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

</details>
