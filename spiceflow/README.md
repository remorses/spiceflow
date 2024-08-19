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

-   Type safety
-   OpenAPI compatibility
-   RPC client generation
-   Simple and intuitive API
-   Uses web standards for requests and responses
-   Supports async generators for streaming
-   Modular design with `.use()` for mounting sub-apps
-   Base path support

## Installation

```bash
npm install spiceflow
```

## Basic Usage

```typescript
import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()

app.get('/hello', () => 'Hello, World!')

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

const userSchema = z.object({
	name: z.string(),
	email: z.string().email(),
})

app.post(
	'/users',
	({ body }) => {
		return `Created user: ${body.name}`
	},
	{
		body: userSchema,
	},
)
```

### Response Schema

```typescript
import { z } from 'zod'

const userResponseSchema = z.object({
	id: z.number(),
	name: z.string(),
})

app.get(
	'/users/:id',
	({ params }) => {
		return { id: Number(params.id), name: 'John Doe' }
	},
	{
		response: userResponseSchema,
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
const usersApp = new Spiceflow()
usersApp.get('/', () => 'Users list')

const mainApp = new Spiceflow()
mainApp.use('/users', usersApp)
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
app.onRequest(({ request }) => {
	console.log(`Received ${request.method} request to ${request.url}`)
})
```

For more advanced usage and configuration options, please refer to the official documentation.
