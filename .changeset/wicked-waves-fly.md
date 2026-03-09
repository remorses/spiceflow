---
'spiceflow': minor
---

Add `createSpiceflowFetch`, a new type-safe fetch-like client alternative to the proxy-based `createSpiceflowClient`. Instead of chaining methods like `client.users({ id: '123' }).get()`, you use a familiar `fetch(path, options)` interface with full type safety for paths, path params, query params, request bodies, and responses (including async generators for streaming).

```ts
import { createSpiceflowFetch } from 'spiceflow/client'

const spiceflowFetch = createSpiceflowFetch<typeof app>('http://localhost:3000')

// GET with type-safe path
const { data, error } = await spiceflowFetch('/hello')

// POST with typed body
const { data } = await spiceflowFetch('/users', {
  method: 'POST',
  body: { name: 'Tommy' },
})

// Path params
const { data } = await spiceflowFetch('/users/:id', {
  params: { id: '123' },
})

// Query params
const { data } = await spiceflowFetch('/search', {
  query: { q: 'hello', page: 1 },
})

// Streaming
const { data } = await spiceflowFetch('/events')
for await (const event of data) {
  console.log(event)
}
```

Passing an unknown URL (or using `as any`) falls back to untyped behavior, making it a drop-in replacement for `fetch` that gains type safety when used with Spiceflow routes. Internal client utilities are refactored into a shared module reused by both client implementations.
