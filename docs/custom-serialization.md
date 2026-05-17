# Custom Serialization

Spiceflow uses plain `JSON.stringify` for API route responses. Types like `Date`, `Map`, `Set`, and `BigInt` are **not** preserved across the wire by default. `Date` becomes an ISO string, `Map` and `Set` are dropped, and `BigInt` throws.

For the **RSC framework** (`.page()`, `.layout()`, `.loader()`), this is not a problem. React's flight protocol already handles `Date`, `Map`, `Set`, `BigInt`, typed arrays, `Promise`, and JSX elements natively.

For **API routes** (`.get()`, `.post()`, `.route()`), you can add custom serialization using a response helper on the server and an `onResponse` hook on the fetch client. This page shows how to do it with [superjson](https://github.com/flightcontrolhq/superjson).

## Server: response helper

Create a helper that serializes data with superjson and sets a custom content type so the client can detect it:

```ts
// src/superjson.ts
import superjson from 'superjson'

export function superjsonResponse(data: any): Response {
  const { json, meta } = superjson.serialize(data)
  if (meta) (json as any).__superjsonMeta = meta
  return new Response(JSON.stringify(json), {
    headers: { 'content-type': 'application/superjson' },
  })
}
```

Use it in your route handlers instead of returning a plain object:

```ts
import { Spiceflow } from 'spiceflow'
import { superjsonResponse } from './superjson'

const app = new Spiceflow()
  .get('/api/event', () =>
    superjsonResponse({
      name: 'Launch party',
      date: new Date('2025-07-01T19:00:00Z'),
      attendees: new Set(['alice', 'bob']),
    }),
  )
```

The response body contains standard JSON with an extra `__superjsonMeta` field that records the original types.

## Client: onResponse hook

On the client, configure `createSpiceflowFetch` with an `onResponse` hook that checks for the custom content type and deserializes:

```ts
import superjson from 'superjson'
import { createSpiceflowFetch } from 'spiceflow/client'

const safeFetch = createSpiceflowFetch('http://localhost:3000', {
  onResponse: async (response) => {
    const ct = response.headers.get('content-type')
    if (!ct?.includes('application/superjson')) return undefined

    const data = await response.json()
    if (!data?.__superjsonMeta) return data
    const { __superjsonMeta, ...rest } = data
    return superjson.deserialize({ json: rest, meta: __superjsonMeta })
  },
})

const event = await safeFetch('/api/event')
if (event instanceof Error) throw event

console.log(event.date)      // Date object, not a string
console.log(event.attendees) // Set {'alice', 'bob'}
```

When `onResponse` returns a non-undefined value, it replaces the default response parsing entirely. Return `undefined` (or don't return) to fall through to the normal JSON parsing.

## How it works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Route handler                                                              │
│                                                                             │
│  superjsonResponse({ date: new Date(), ... })                               │
│       │                                                                     │
│       ▼                                                                     │
│  superjson.serialize() ──▶ JSON with __superjsonMeta                        │
│       │                                                                     │
│       ▼                                                                     │
│  Response { content-type: application/superjson }                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   HTTP wire
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  onResponse hook                                                            │
│                                                                             │
│  detect content-type: application/superjson                                 │
│       │                                                                     │
│       ▼                                                                     │
│  superjson.deserialize() ──▶ Date, Set, Map, BigInt restored                │
│       │                                                                     │
│       ▼                                                                     │
│  return deserialized data (skips default JSON.parse)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

The key constraint is that serialization must happen **before** `JSON.stringify`, not after. That's why this uses a response helper in the handler rather than middleware. Middleware only sees the `Response` after the body has been stringified, so type information (Date vs string) is already lost.

## When you don't need this

If you only need ISO date strings and can parse them on the client, plain JSON is fine:

```ts
app.get('/api/event', () => ({
  name: 'Launch party',
  date: new Date().toISOString(), // string on both sides
}))
```

Use custom serialization only when you need the client to receive actual `Date` objects, `Map`, `Set`, `BigInt`, or other types that `JSON.stringify` doesn't preserve.
